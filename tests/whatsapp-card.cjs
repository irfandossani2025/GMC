const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');const {NextRequest}=require('next/server');
function load(file,mocks={}) {const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;const module={exports:{}};vm.runInNewContext(js,{module,exports:module.exports,require:n=>n in mocks?mocks[n]:require(n),console,Date,Intl,URL,Buffer,process,setTimeout,clearTimeout,AbortController,fetch:(...a)=>globalThis.__fetch(...a)});return module.exports;}
const plain=v=>JSON.parse(JSON.stringify(v));
process.env.JWT_SECRET='test-secret';
const share=load('lib/card-share.ts');
const wa=load('lib/whatsapp.ts');
const client=load('lib/whatsapp-cloud/client.ts',{'@/lib/whatsapp':wa});
const {TEMPLATE_GUIDE}=load('lib/whatsapp-cloud/templates.ts');

test('Card links verify, and cannot be forged or pointed at another card',()=>{
  const token=share.createCardShareToken('card123');
  assert.equal(share.verifyCardShareToken(token),'card123');
  assert.equal(share.verifyCardShareToken('card999.'+token.split('.')[1]),null);
  assert.equal(share.verifyCardShareToken('card123.forged'),null);
});

test('Phone numbers go to Meta in international format (Oman 8-digit gets 968)',()=>{
  assert.equal(wa.phoneForWhatsAppWeb('+968 9540 4043'),'96895404043');
  assert.equal(wa.phoneForWhatsAppWeb('0096895404043'),'96895404043');
  assert.equal(wa.phoneForWhatsAppWeb('95404043'),'96895404043');
  assert.equal(wa.clinicDateLabel(new Date('2026-11-22T21:30:00Z')),'23 Nov 2026');
});

test('Template message payload: image header + body values, cleaned to Meta rules',()=>{
  const p=plain(client.buildTemplatePayload({to:'+968 9196 4422',name:'gmc_membership_card',language:'en',headerImageId:'media1',bodyValues:['Hasan\nMahmood','16569','16 Nov 2027','https://x/card/a']}));
  assert.equal(p.to,'96891964422');assert.equal(p.type,'template');
  assert.deepEqual(p.template.components[0],{type:'header',parameters:[{type:'image',image:{id:'media1'}}]});
  assert.equal(p.template.components[1].parameters[0].text,'Hasan Mahmood');
  assert.equal(client.cleanTemplateValue(''),'-');
});

test('The template texts have exactly as many values as the site sends',()=>{
  const count=b=>new Set(b.match(/\{\{\d+\}\}/g)).size;
  assert.equal(count(TEMPLATE_GUIDE.card.body),4);assert.equal(TEMPLATE_GUIDE.card.samples.length,4);
  assert.equal(count(TEMPLATE_GUIDE.session.body),6);assert.equal(TEMPLATE_GUIDE.session.samples.length,6);
});

test('Meta errors become plain-English reasons',()=>{
  assert.match(client.explainMetaError(190,'x'),/expired/);
  assert.match(client.explainMetaError(132001,'x'),/not approved/);
  assert.match(client.explainMetaError(131026,'x'),/cannot receive/);
});

test('Sending a template calls Meta with the token and returns the message id',async()=>{
  let call;globalThis.__fetch=async(url,init)=>{call={url,init};return{ok:true,status:200,text:async()=>JSON.stringify({messages:[{id:'wamid.X'}]})};};
  const id=await client.sendTemplate({accessToken:'TOKEN',phoneNumberId:'123456789',apiVersion:'v21.0'},{to:'95404043',name:'gmc_session_recorded',language:'en',bodyValues:['a','b','c','1','6','5']});
  assert.equal(id,'wamid.X');assert.equal(call.url,'https://graph.facebook.com/v21.0/123456789/messages');
  assert.equal(call.init.headers.Authorization,'Bearer TOKEN');
  globalThis.__fetch=async()=>({ok:false,status:400,text:async()=>JSON.stringify({error:{code:132001,message:'nope'}})});
  await assert.rejects(()=>client.sendTemplate({accessToken:'T',phoneNumberId:'1'},{to:'1',name:'n',language:'en'}),/not approved/);
});

test('Media upload builds a multipart body with the PNG',async()=>{
  let body,headers;globalThis.__fetch=async(url,init)=>{body=init.body;headers=init.headers;return{ok:true,status:200,text:async()=>'{"id":"media9"}'};};
  const id=await client.uploadMedia({accessToken:'T',phoneNumberId:'1'},Buffer.from('\x89PNGdata'),'image/png','card.png');
  assert.equal(id,'media9');assert.match(headers['Content-Type'],/^multipart\/form-data; boundary=/);
  const text=body.toString();assert.ok(text.includes('name="messaging_product"'));assert.ok(text.includes('filename="card.png"'));
});

function cardRoute({config,history,card}){
  const sent=[];
  const api=load('app/api/whatsapp/card/route.ts',{
    '@/lib/db':{db:{membershipCard:{findFirst:async()=>card}}},
    '@/lib/card-share':{buildCardShareUrl:(id)=>'https://site/card/'+id},
    '@/lib/whatsapp-cloud/settings':{loadActiveWhatsAppConfig:async()=>({config})},
    '@/lib/whatsapp-cloud/notify':{latestCardMessage:async()=>history,sendMembershipCard:async(a)=>{sent.push(a);return{status:'sent',messageId:'m'};}},
  });
  return {api,sent};
}
const png='data:image/png;base64,'+Buffer.concat([Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]),Buffer.alloc(200)]).toString('base64');
const post=(body)=>new NextRequest('https://site/api/whatsapp/card',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});

test('A new card is auto-sent once, only if issued after WhatsApp was switched on',async()=>{
  const member={status:'ACTIVE',phone:'+96891964422',name:'I',memberId:'GMC-1',expiryDate:new Date()};
  const fresh={id:'c1',createdAt:new Date(),member};
  let r=cardRoute({config:{enabledAt:new Date(Date.now()-3600e3).toISOString(),sendCardOnIssue:true},history:{sentAt:null,lastAttemptAt:null},card:fresh});
  let res=await r.api.POST(post({memberId:'m1',cardId:'c1',image:png,automatic:true}));
  assert.equal((await res.json()).status,'sent');assert.equal(r.sent.length,1);assert.equal(r.sent[0].cardUrl,'https://site/card/c1');
  // Already attempted → no second automatic send
  r=cardRoute({config:{enabledAt:new Date(Date.now()-3600e3).toISOString()},history:{sentAt:'x',lastAttemptAt:'x'},card:fresh});
  res=await r.api.POST(post({memberId:'m1',cardId:'c1',image:png,automatic:true}));
  assert.equal((await res.json()).status,'skipped');assert.equal(r.sent.length,0);
  // Card issued before WhatsApp was switched on → never auto-sent, but manual send works
  const old={id:'c1',createdAt:new Date(Date.now()-2*3600e3),member};
  r=cardRoute({config:{enabledAt:new Date(Date.now()-3600e3).toISOString()},history:{sentAt:null,lastAttemptAt:null},card:old});
  res=await r.api.POST(post({memberId:'m1',cardId:'c1',image:png,automatic:true}));
  assert.equal((await res.json()).status,'skipped');
  res=await r.api.POST(post({memberId:'m1',cardId:'c1',image:png,automatic:false}));
  assert.equal((await res.json()).status,'sent');
});
