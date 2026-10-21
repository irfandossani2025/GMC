const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const os=require('node:os');const path=require('node:path');const ts=require('typescript');const jwt=require('jsonwebtoken');const {webcrypto}=require('node:crypto');const {NextRequest}=require('next/server');
const secret='test-secret-only';
function load(file,mocks={},env={},cwd=process.cwd()) {
 const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;const module={exports:{}};
 vm.runInNewContext(js,{module,exports:module.exports,require:n=>n in mocks?mocks[n]:require(n),process:{env:{NODE_ENV:'test',JWT_SECRET:secret,...env},cwd:()=>cwd},Buffer,Date,Intl,console,URL,Headers,crypto:webcrypto,TextEncoder,Uint8Array,atob,setTimeout,clearTimeout});return module.exports;
}
const schema=load('lib/email/schema.ts');
const configuration={host:'smtp.example.com',port:587,security:'STARTTLS',username:'mail@example.com',fromName:'Clinic',fromEmail:'mail@example.com',replyTo:'',revision:null};
function request(route,body,role='SUPER_ADMIN',origin='https://clinic.test') {return new NextRequest('https://clinic.test'+route,{method:body?'POST':'GET',headers:{host:'clinic.test',origin,...(role?{cookie:'auth-token='+jwt.sign({userId:'owner',role},secret,{expiresIn:3600})}:{}),...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});}
test('SMTP configuration rejects unsafe hosts, header injection, unsupported ports and encryption mismatches',()=>{
 for(const item of [{host:'localhost'},{host:'https://smtp.example.com'},{host:'127.0.0.1'},{fromName:'Clinic\r\nBcc: thief@example.com'},{port:25},{port:465,security:'STARTTLS'},{fromEmail:'one@example.com,two@example.com'}])assert.equal(schema.emailSettingsSchema.safeParse({...configuration,...item}).success,false);
 assert.equal(schema.emailSettingsSchema.safeParse(configuration).success,true);
});
test('SMTP passwords are authenticated ciphertext and the key stays outside public files',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gmc-mail-test-'));
 try {const crypto=load('lib/email/secrets.ts',{}, {},dir);const a=await crypto.encryptEmailPassword('test-password-never-production'),b=await crypto.encryptEmailPassword('test-password-never-production');assert.notEqual(a,b);assert.equal(a.includes('test-password'),false);assert.equal(await crypto.decryptEmailPassword(a),'test-password-never-production');const parts=a.split('.');parts[3]=Buffer.from('tampered').toString('base64');await assert.rejects(()=>crypto.decryptEmailPassword(parts.join('.')));assert.equal(fs.statSync(path.join(dir,'.private/email-settings.key')).mode & 0o777,0o600);}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
const middleware=load('middleware.ts');
for(const role of ['ADMIN','STAFF','MANAGER'])test(`${role} cannot access email settings or its API, including nested and dotted paths`,async()=>{for(const route of ['/api/settings/email','/api/settings/email/test','/api/settings/email.name','/dashboard/settings/email'])assert.equal((await middleware.middleware(request(route,null,role))).status,route.startsWith('/api')?403:307);});
test('Staff can reach barcode lookup and Super Admin can reach settings',async()=>{assert.equal((await middleware.middleware(request('/api/scan',null,'STAFF'))).status,200);assert.equal((await middleware.middleware(request('/api/settings/email',null))).status,200);});
function api(role='SUPER_ADMIN',original=null) {
 let row=original,logs=[],deliveries=0,attempts=0;
 const tx={settings:{findUnique:async()=>row,upsert:async({create,update})=>{row={id:'mail',key:schema.EMAIL_SETTINGS_KEY,value:row?update.value:create.value,updatedAt:new Date('2026-10-22T12:00:00Z')};return row;},updateMany:async({data})=>{row={...row,...data};return{count:1};}},auditLog:{create:async({data})=>{logs.push(data);return{};},count:async()=>attempts}};
 const db={...tx,$transaction:async callback=>callback(tx)};
 const actor=role?{id:'owner',role,email:'owner@example.com',active:true}:null;
 const access=load('lib/email/access.ts',{'@/lib/security/user-access':{currentUser:async()=>actor}});
 const mocks={'@/lib/db':{db},'@/lib/email/schema':schema,'@/lib/email/access':access,'@/lib/email/secrets':{encryptEmailPassword:async p=>'encrypted:'+Buffer.from(p).toString('base64')},'@/lib/email/delivery':{runEmailCheck:async()=>{deliveries++;},safeEmailError:()=> 'safe error'}};
 return{settings:load('app/api/settings/email/route.ts',mocks),check:load('app/api/settings/email/test/route.ts',mocks),row:()=>row,logs:()=>logs,deliveries:()=>deliveries,setAttempts:n=>attempts=n};
}
test('Direct API authorization rejects a demoted or absent user regardless of headers or cookie claims',async()=>{for(const role of [null,'ADMIN','STAFF']){const i=api(role);const get=await i.settings.GET(request('/api/settings/email',null));const post=await i.settings.POST(request('/api/settings/email',{...configuration,password:'test-only'}));assert.equal(get.status,role?403:401);assert.equal(post.status,role?403:401);assert.equal(i.row(),null);}});
test('Settings save encrypts the password, redacts responses and audit data, and sends no email',async()=>{const i=api();const response=await i.settings.POST(request('/api/settings/email',{...configuration,password:'test-only-password'}));assert.equal(response.status,200);const json=await response.json();assert.equal(json.settings.hasPassword,true);assert.equal('password' in json.settings,false);assert.equal('encryptedPassword' in json.settings,false);assert.equal(JSON.stringify(i.logs()).includes('test-only-password'),false);assert.equal(i.deliveries(),0);const get=JSON.stringify(await(await i.settings.GET(request('/api/settings/email',null))).json());assert.equal(get.includes('encrypted:'),false);assert.equal(get.includes('test-only-password'),false);});
test('Cross-origin saves are rejected before any settings change',async()=>{const i=api();assert.equal((await i.settings.POST(request('/api/settings/email',{...configuration,password:'test'},'SUPER_ADMIN','https://other.test'))).status,403);assert.equal(i.row(),null);});
test('Revision conflicts do not overwrite saved settings and changing the SMTP target needs a password',async()=>{const original={id:'mail',value:JSON.stringify({...configuration,encryptedPassword:'encrypted:secret'}),updatedAt:new Date('2026-10-22T12:00:00Z')};const i=api('SUPER_ADMIN',original);assert.equal((await i.settings.POST(request('/api/settings/email',{...configuration,password:'test-only'}))).status,409);assert.equal((await i.settings.POST(request('/api/settings/email',{...configuration,host:'new.example.com',revision:original.updatedAt.toISOString()}))).status,400);assert.equal(i.row(),original);});
test('Verify checks the saved revision, requires saved settings, and rate limits tests',async()=>{const i=api();assert.equal((await i.check.POST(request('/api/settings/email/test',{action:'verify',revision:'missing'}))).status,400);assert.equal(i.deliveries(),0);const row={id:'mail',value:JSON.stringify({...configuration,encryptedPassword:'secret'}),updatedAt:new Date('2026-10-22T12:00:00Z')};const saved=api('SUPER_ADMIN',row);assert.equal((await saved.check.POST(request('/api/settings/email/test',{action:'verify',revision:'stale'}))).status,409);saved.setAttempts(3);assert.equal((await saved.check.POST(request('/api/settings/email/test',{action:'verify',revision:row.updatedAt.toISOString()}))).status,429);assert.equal(saved.deliveries(),0);});
test('SMTP check authenticates only after verified TLS and sends only for an explicit recipient',async()=>{
 let secure=true,events=[],options;
 class Client {constructor(o){options=o;this.ready=false;this.smtp={sock:{encrypted:true,get authorized(){return secure;}},connect:cb=>{events.push('connect');cb();},ehlo:cb=>{events.push('tls');cb();},login:cb=>{events.push('login');cb();},close:()=>events.push('close')};}async sendAsync(message){assert.equal(this.ready,true);events.push('send');assert.equal(message.to,'owner@example.com');assert.equal(message.text.includes('patient data'),true);}}
 const delivery=load('lib/email/delivery.ts',{'dns/promises':{lookup:async()=>[{address:'8.8.8.8',family:4}]},emailjs:{SMTPClient:Client},'./secrets':{decryptEmailPassword:async()=> 'test-password'}});
 const saved={...configuration,encryptedPassword:'cipher'};await delivery.runEmailCheck(saved);assert.equal(events.includes('send'),false);assert.deepEqual(events,['connect','tls','login','close']);assert.equal(options.host,'8.8.8.8');assert.equal(options.tls.servername,'smtp.example.com');assert.equal(options.tls.rejectUnauthorized,true);
 events=[];await delivery.runEmailCheck(saved,'owner@example.com');assert.equal(events.filter(v=>v==='send').length,1);
 secure=false;events=[];await assert.rejects(()=>delivery.runEmailCheck(saved));assert.equal(events.includes('login'),false);assert.equal(events.includes('send'),false);
 for(const address of ['127.0.0.1','10.0.0.1','169.254.169.254','192.168.1.1','::1','fc00::1','::ffff:127.0.0.1'])assert.equal(delivery.isPublicMailAddress(address),false,address);
});

test('Real TLS SMTP transport verifies without sending and sends exactly one explicit test', {timeout:15000}, async()=>{
 const tls=require('node:tls');const {execFileSync}=require('node:child_process');const {SMTPClient}=require('emailjs');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gmc-smtp-fixture-'));const sockets=new Set();let server;let envelopes=0,messages=0;
 try {
  execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',path.join(dir,'key.pem'),'-out',path.join(dir,'cert.pem'),'-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost'],{stdio:'ignore'});
  const cert=fs.readFileSync(path.join(dir,'cert.pem'));
  server=tls.createServer({key:fs.readFileSync(path.join(dir,'key.pem')),cert},socket=>{
   sockets.add(socket);socket.on('close',()=>sockets.delete(socket));socket.on('error',()=>{});socket.write('220 localhost fixture\r\n');let buffer='',data=false,body='';
   socket.on('data',chunk=>{buffer+=chunk.toString();while(buffer.includes('\n')){const end=buffer.indexOf('\n');const line=buffer.slice(0,end).replace(/\r$/,'');buffer=buffer.slice(end+1);
    if(data){if(line==='.'){assert.match(body,/This is a test email/);messages++;data=false;body='';socket.write('250 queued\r\n');}else body+=line+'\n';continue;}
    if(/^EHLO|^HELO/i.test(line))socket.write('250-localhost\r\n250 AUTH PLAIN LOGIN\r\n');
    else if(/^AUTH PLAIN/i.test(line))socket.write('235 authenticated\r\n');
    else if(/^MAIL FROM/i.test(line)){envelopes++;socket.write('250 sender ok\r\n');}
    else if(/^RCPT TO/i.test(line))socket.write('250 recipient ok\r\n');
    else if(/^DATA$/i.test(line)){data=true;socket.write('354 send data\r\n');}
    else if(/^QUIT/i.test(line))socket.end('221 goodbye\r\n');else if(/^RSET/i.test(line))socket.write('250 reset\r\n');else socket.write('500 unsupported fixture command\r\n');
   }});
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  class LocalFixtureClient extends SMTPClient {constructor(options){super({...options,host:'127.0.0.1',port:server.address().port,ssl:{...options.ssl,servername:'localhost',ca:cert},authentication:['PLAIN']});}}
  const delivery=load('lib/email/delivery.ts',{'dns/promises':{lookup:async()=>[{address:'8.8.8.8',family:4}]},emailjs:{SMTPClient:LocalFixtureClient},'./secrets':{decryptEmailPassword:async()=> 'fixture-password'}});
  const settings={...configuration,security:'TLS',port:465,encryptedPassword:'fixture'};
  await delivery.runEmailCheck(settings);assert.equal(envelopes,0);assert.equal(messages,0);
  await delivery.runEmailCheck(settings,'owner@example.com');assert.equal(envelopes,1);assert.equal(messages,1);
 } finally {for(const socket of sockets)socket.destroy();if(server)await new Promise(resolve=>server.close(resolve));fs.rmSync(dir,{recursive:true,force:true});}
});
