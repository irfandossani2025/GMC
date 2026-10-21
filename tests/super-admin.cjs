const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const jwt = require('jsonwebtoken');
const { webcrypto } = require('node:crypto');
const { NextRequest, NextResponse } = require('next/server');
const secret = 'test-only-secret-never-used-in-production';
function load(file, mocks = {}) {
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  const mod = { exports: {} };
  vm.runInNewContext(js, { module: mod, exports: mod.exports, require: name => name in mocks ? mocks[name] : require(name), process: { env: { NODE_ENV: 'test', JWT_SECRET: secret, SUPER_ADMIN_SETUP_OWNER: 'owner@clinic.com', SUPER_ADMIN_SETUP_EMAIL: 'super@clinic.com' } }, console, crypto: webcrypto, TextEncoder, URL, Headers, Uint8Array, atob, Date, Number, JSON });
  return mod.exports;
}
function request(path, role, body, options = {}) {
  const token = options.token || (role ? jwt.sign({ userId: 'actor', role }, secret, { expiresIn: options.expired ? -1 : 3600 }) : null);
  return new NextRequest(`https://clinic.test${path}`, { method: body ? 'POST' : 'GET', headers: { ...(token ? { cookie: `auth-token=${token}` } : {}), ...(body ? { 'content-type': 'application/json' } : {}), ...options.headers }, ...(body ? { body: JSON.stringify(body) } : {}) });
}
const middleware = load('middleware.ts');
for (const role of ['ADMIN', 'SUPER_ADMIN']) test(`${role} may open user management`, async () => assert.equal((await middleware.middleware(request('/api/users', role))).status, 200));
for (const role of ['STAFF', 'MANAGER']) test(`${role} cannot open user management, including dotted paths`, async () => {
  for (const path of ['/api/users', '/api/users/user.name', '/dashboard/users']) {
    const response = await middleware.middleware(request(path, role));
    assert.equal(response.status, path.startsWith('/api') ? 403 : 307);
  }
});
test('no cookie, forged headers, expired and tampered JWTs are rejected', async () => {
  const valid = jwt.sign({ userId: 'actor', role: 'SUPER_ADMIN' }, secret, { expiresIn: 3600 });
  for (const req of [request('/api/users', null, null, { headers: { 'x-user-id': 'actor', 'x-user-role': 'SUPER_ADMIN' } }), request('/api/users', 'SUPER_ADMIN', null, { expired: true }), request('/api/users', null, null, { token: valid.slice(0, -5) + 'xxxxx' })]) assert.equal((await middleware.middleware(req)).status, 401);
});
test('staff scan access and manager dashboard access are preserved', async () => {
  assert.equal((await middleware.middleware(request('/dashboard/scan', 'STAFF'))).status, 200);
  assert.equal((await middleware.middleware(request('/dashboard', 'MANAGER'))).status, 200);
});
function api(actor, target) {
  let writes = 0; let created = null;
  const tx = { $executeRaw: async () => 0, user: { findUnique: async () => target, update: async ({ data }) => { writes++; return { ...target, ...data }; }, create: async ({ data, select }) => { writes++; created = { id: 'new', ...data }; return Object.fromEntries(Object.keys(select).map(key => [key, created[key]])); }, count: async () => target ? 1 : 0 }, auditLog: { create: async () => ({}) } };
  const db = { ...tx, $executeRawUnsafe: async () => 0, $transaction: callback => callback(tx) };
  const access = { currentUser: async () => actor, isAdministrator: role => ['ADMIN','SUPER_ADMIN'].includes(role), canManageUser: (a,t) => a.role === 'SUPER_ADMIN' || (a.role === 'ADMIN' && t.role === 'STAFF') };
  const mocks = { '@/lib/db': { db }, '@/lib/auth': { hashPassword: async () => 'HASH_NOT_PASSWORD' }, '@/lib/security/user-access': access };
  return { detail: load('app/api/users/[id]/route.ts', mocks), users: load('app/api/users/route.ts', mocks), setup: load('app/api/users/super-admin-setup/route.ts', mocks), writes: () => writes, created: () => created };
}
for (const targetRole of ['ADMIN','SUPER_ADMIN']) test(`Admin cannot edit or deactivate ${targetRole}`, async () => {
  const instance = api({ id:'actor', role:'ADMIN' }, { id:'other', role:targetRole, active:true });
  assert.equal((await instance.detail.PATCH(request('/api/users/other','ADMIN',{ password:'new-password-123' }), { params:{id:'other'} })).status,403);
  assert.equal((await instance.detail.DELETE(request('/api/users/other','ADMIN'),{params:{id:'other'}})).status,403);
  assert.equal(instance.writes(),0);
});
test('Admin cannot promote staff or create an Admin', async () => {
  const instance = api({id:'actor',role:'ADMIN'}, {id:'other',role:'STAFF'});
  assert.equal((await instance.detail.PATCH(request('/api/users/other','ADMIN',{role:'ADMIN'}),{params:{id:'other'}})).status,403);
  assert.equal((await instance.users.POST(request('/api/users','ADMIN',{name:'New admin',email:'new@clinic.com',password:'password-123',role:'ADMIN'}))).status,403);
  assert.equal(instance.writes(),0);
});
test('Super Admin can manage admins and create an Admin', async () => {
  const instance = api({id:'actor',role:'SUPER_ADMIN'}, {id:'other',role:'ADMIN',active:true});
  assert.equal((await instance.detail.PATCH(request('/api/users/other','SUPER_ADMIN',{active:false}),{params:{id:'other'}})).status,200);
  assert.equal((await instance.users.POST(request('/api/users','SUPER_ADMIN',{name:'New admin',email:'new@clinic.com',password:'password-123',role:'ADMIN'}))).status,201);
  assert.equal(instance.writes(),2);
});
test('Super Admin cannot demote/deactivate the owner account through user management', async () => {
  const instance = api({id:'actor',role:'SUPER_ADMIN'}, {id:'actor',role:'SUPER_ADMIN',active:true});
  for (const body of [{active:false},{role:'ADMIN'}]) assert.equal((await instance.detail.PATCH(request('/api/users/actor','SUPER_ADMIN',body),{params:{id:'actor'}})).status,403);
  assert.equal(instance.writes(),0);
});
test('ordinary user endpoint never creates a Super Admin', async () => {
  const instance = api({id:'actor',role:'SUPER_ADMIN'}, null);
  assert.equal((await instance.users.POST(request('/api/users','SUPER_ADMIN',{name:'Super',email:'new@clinic.com',password:'password-123',role:'SUPER_ADMIN'}))).status,400);
  assert.equal(instance.writes(),0);
});
test('bootstrap rejects a different admin and locks once a Super Admin exists', async () => {
  const body = {name:'Owner',password:'long-password-123',confirmPassword:'long-password-123',confirmAccess:true};
  const wrong = api({id:'actor',role:'ADMIN',email:'wrong@clinic.com'}, null);
  assert.equal((await wrong.setup.POST(request('/api/users/super-admin-setup','ADMIN',body))).status,403);
  const completed = api({id:'actor',role:'ADMIN',email:'owner@clinic.com'}, {id:'existing',role:'SUPER_ADMIN'});
  assert.equal((await completed.setup.POST(request('/api/users/super-admin-setup','ADMIN',body))).status,409);
  assert.equal(wrong.writes()+completed.writes(),0);
});
test('bootstrap requires matching passwords and explicit access consent', async () => {
  const instance = api({id:'actor',role:'ADMIN',email:'owner@clinic.com'}, null);
  for (const body of [{name:'Owner',password:'long-password-123',confirmPassword:'different-pass',confirmAccess:true},{name:'Owner',password:'long-password-123',confirmPassword:'long-password-123',confirmAccess:false}]) assert.equal((await instance.setup.POST(request('/api/users/super-admin-setup','ADMIN',body))).status,400);
  assert.equal(instance.writes(),0);
});
test('bootstrap creates only the configured separate email with a hash', async () => {
  const instance = api({id:'actor',role:'ADMIN',email:'owner@clinic.com'}, null);
  const response = await instance.setup.POST(request('/api/users/super-admin-setup','ADMIN',{name:'Owner',email:'injected@clinic.com',password:'long-password-123',confirmPassword:'long-password-123',confirmAccess:true}));
  const data = await response.json();
  assert.equal(response.status,201); assert.equal(data.user.email,'super@clinic.com'); assert.equal(data.user.password,undefined); assert.equal(instance.created().password,'HASH_NOT_PASSWORD'); assert.equal(instance.writes(),1);
});

test('current user authorization uses verified cookies and current database status', async () => {
  let active = true;
  const access = load('lib/security/user-access.ts', { '@/lib/auth': { verifyToken: token => token === 'valid' ? {userId:'actor', role:'SUPER_ADMIN'} : null }, '@/lib/db': {db:{ user:{findUnique:async () => ({id:'actor', role:'STAFF',active})}}} });
  assert.equal(await access.currentUser(request('/api/users',null,null,{headers:{'x-user-id':'actor','x-user-role':'SUPER_ADMIN'}})),null);
  assert.equal((await access.currentUser(request('/api/users',null,null,{token:'valid'}))).role,'STAFF');
  active = false; assert.equal(await access.currentUser(request('/api/users',null,null,{token:'valid'})),null);
});
