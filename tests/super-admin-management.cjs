const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');const {NextRequest,NextResponse}=require('next/server');
function load(file,mocks={}) {const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;const module={exports:{}};vm.runInNewContext(js,{module,exports:module.exports,require:n=>n in mocks?mocks[n]:require(n),console,Date,Intl,URL,JSON});return module.exports;}
const plain=v=>JSON.parse(JSON.stringify(v));
const validators=load('lib/validators.ts');
function access(role){return {requireSuperAdmin:async()=>role==='SUPER_ADMIN'?{user:{id:'u1',name:'Owner',role}}:{response:NextResponse.json({error:'Only the Super Admin can make this change.'},{status:403})},recordAudit:async()=>{}};}
const req=(url,method='DELETE',body)=>new NextRequest('https://clinic.test'+url,{method,headers:{'content-type':'application/json'},body:body?JSON.stringify(body):undefined});

test('Staff and Admin cannot edit or deactivate patients',async()=>{
  for(const role of ['ADMIN','STAFF']){
    let touched=false;const db={member:{findUnique:async()=>{touched=true;},update:async()=>{touched=true;}}};
    const api=load('app/api/members/[id]/route.ts',{'@/lib/db':{db},'@/lib/validators':validators,'@/lib/security/user-access':access(role)});
    assert.equal((await api.DELETE(req('/api/members/m1'),{params:{id:'m1'}})).status,403);
    assert.equal((await api.PATCH(req('/api/members/m1','PATCH',{name:'New Name'}),{params:{id:'m1'}})).status,403);
    assert.equal(touched,false);
  }
});

test('Super Admin deactivation keeps the patient (soft delete)',async()=>{
  let data=null;const db={member:{update:async(a)=>{data=a.data;return{id:'m1'};}}};
  const api=load('app/api/members/[id]/route.ts',{'@/lib/db':{db},'@/lib/validators':validators,'@/lib/security/user-access':access('SUPER_ADMIN')});
  assert.equal((await api.DELETE(req('/api/members/m1'),{params:{id:'m1'}})).status,200);
  assert.deepEqual(plain(data),{status:'INACTIVE'});
});

test('Undoing a session cancels it and gives the session back to a completed package',async()=>{
  const updates={};
  const tx={session:{update:async(a)=>{updates.session=a.data;return a.data;}},memberPackage:{update:async(a)=>{updates.pkg=a.data;return a.data;}}};
  const db={session:{findUnique:async()=>({id:'s1',status:'COMPLETED',memberId:'m1',packageId:'p1',notes:null,memberPackage:{id:'p1',usedSessions:6,remainingSessions:0,status:'COMPLETED'}})},$transaction:async cb=>cb(tx)};
  const api=load('app/api/sessions/[id]/route.ts',{'@/lib/db':{db},'@/lib/security/user-access':access('SUPER_ADMIN')});
  assert.equal((await api.DELETE(req('/api/sessions/s1'),{params:{id:'s1'}})).status,200);
  assert.equal(updates.session.status,'CANCELLED');
  assert.deepEqual(plain(updates.pkg),{usedSessions:5,remainingSessions:1,status:'ACTIVE'});
});

test('An already cancelled session cannot be undone twice',async()=>{
  const db={session:{findUnique:async()=>({id:'s1',status:'CANCELLED',memberPackage:null})}};
  const api=load('app/api/sessions/[id]/route.ts',{'@/lib/db':{db},'@/lib/security/user-access':access('SUPER_ADMIN')});
  assert.equal((await api.DELETE(req('/api/sessions/s1'),{params:{id:'s1'}})).status,400);
});

test('Editing remaining sessions keeps totals consistent and reopens a finished package',async()=>{
  let data=null;const db={memberPackage:{findUnique:async()=>({id:'p1',memberId:'m1',usedSessions:4,remainingSessions:0,status:'COMPLETED',expiryDate:new Date('2027-01-01')}),update:async(a)=>{data=a.data;return{...a.data,expiryDate:new Date('2027-01-01')};}}};
  const api=load('app/api/member-packages/[id]/route.ts',{'@/lib/db':{db},'@/lib/validators':validators,'@/lib/security/user-access':access('SUPER_ADMIN')});
  assert.equal((await api.PATCH(req('/api/member-packages/p1','PATCH',{remainingSessions:3}),{params:{id:'p1'}})).status,200);
  assert.deepEqual(plain(data),{remainingSessions:3,usedSessions:4,totalSessions:7,status:'ACTIVE'});
});

test('A deactivated card is refused at reception, but the patient ID still works',async()=>{
  const member={id:'m1',memberId:'16569',name:'P',phone:'1',status:'ACTIVE',expiryDate:new Date('2027-01-01'),packages:[],sessions:[],cards:[{id:'c1',status:'INACTIVE',barcode:'OLD',cardNumber:'CARD-OLD'}]};
  const db={membershipCard:{findUnique:async({where})=>where.barcode==='OLD'||where.cardNumber==='CARD-OLD'?{id:'c1',status:'INACTIVE',barcode:'OLD',cardNumber:'CARD-OLD',member}:null},member:{findUnique:async({where})=>where.memberId==='16569'?member:null}};
  const api=load('app/api/scan/route.ts',{'@/lib/db':{db},'@/lib/card-utils':{extractBarcodeToken:v=>v.toUpperCase()}});
  assert.equal((await api.GET(new NextRequest('https://clinic.test/api/scan?barcode=OLD'))).status,410);
  assert.equal((await api.GET(new NextRequest('https://clinic.test/api/scan?q=CARD-OLD'))).status,410);
  const ok=await api.GET(new NextRequest('https://clinic.test/api/scan?q=16569'));
  assert.equal(ok.status,200);assert.equal((await ok.json()).card,null);
});

test('Recording a session saves the treatment id and uses one transaction',async()=>{
  const created={};let inTx=false;
  const pkg={id:'mp1',packageId:'tp1',usedSessions:2,remainingSessions:28,status:'ACTIVE',package:{name:'Fat Loss'}};
  const tx={memberPackage:{update:async()=>{assert.ok(inTx);return{...pkg,usedSessions:3,remainingSessions:27,totalSessions:30,package:{name:'Fat Loss',treatmentId:'t1',treatment:{name:'Fat Loss'}}};}},session:{create:async(a)=>{assert.ok(inTx);created.data=a.data;return{id:'s1'};}}};
  const db={member:{findUnique:async()=>({id:'m1',name:'Irfan',phone:'+96891964422',status:'ACTIVE'})},memberPackage:{findMany:async()=>[pkg]},$transaction:async cb=>{inTx=true;try{return await cb(tx);}finally{inTx=false;}},whatsAppLog:{create:async()=>({})}};
  let sentArgs=null;
  const api=load('app/api/sessions/route.ts',{'@/lib/db':{db},'@/lib/validators':validators,'@/lib/whatsapp-cloud/notify':{sendSessionConfirmation:async(a)=>{sentArgs=a;return{status:'sent',messageId:'wamid.1',sentAt:'now'};}}});
  const res=await api.POST(new NextRequest('https://clinic.test/api/sessions',{method:'POST',headers:{'content-type':'application/json','x-user-id':'u1'},body:JSON.stringify({memberId:'GMC-1',packageId:'mp1'})}));
  assert.equal(res.status,200);
  assert.equal(created.data.treatmentId,'t1');
  const body=await res.json();
  assert.equal(body.whatsapp.status,'sent');
  assert.equal(sentArgs.phone,'+96891964422');assert.equal(sentArgs.remainingSessions,27);assert.equal(sentArgs.usedSessions,3);
});

test('If saving the session fails, no session is used up',async()=>{
  let committed=false;
  const pkg={id:'mp1',packageId:'tp1',usedSessions:2,remainingSessions:28,status:'ACTIVE',package:{name:'Fat Loss'}};
  const db={member:{findUnique:async()=>({id:'m1',name:'I',phone:'1',status:'ACTIVE'})},memberPackage:{findMany:async()=>[pkg]},
    $transaction:async cb=>{const tx={memberPackage:{update:async()=>({...pkg,package:{treatmentId:'t1'}})},session:{create:async()=>{throw new Error('FK');}}};await cb(tx);committed=true;}};
  const api=load('app/api/sessions/route.ts',{'@/lib/db':{db},'@/lib/validators':validators,'@/lib/whatsapp-cloud/notify':{sendSessionConfirmation:async()=>{throw new Error('should not send');}}});
  const res=await api.POST(new NextRequest('https://clinic.test/api/sessions',{method:'POST',headers:{'content-type':'application/json','x-user-id':'u1'},body:JSON.stringify({memberId:'GMC-1',packageId:'mp1'})}));
  assert.equal(res.status,400);assert.equal(committed,false);
});
