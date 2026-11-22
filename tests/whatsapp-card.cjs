const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');
function load(file,mocks={}) {const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;const module={exports:{}};vm.runInNewContext(js,{module,exports:module.exports,require:n=>n in mocks?mocks[n]:require(n),console,Date,Intl,URL,Buffer,process});return module.exports;}
process.env.JWT_SECRET='test-secret';
const share=load('lib/card-share.ts');
const wa=load('lib/whatsapp.ts',{'@/lib/clinic':{CLINIC_NAME:'Grand Medical Care',formatDisplayDate:()=> '11 Dec 2027'}});
test('Card links verify, and cannot be forged or pointed at another card',()=>{
  const token=share.createCardShareToken('card123');
  assert.equal(share.verifyCardShareToken(token),'card123');
  assert.equal(share.verifyCardShareToken('card999.'+token.split('.')[1]),null);
  assert.equal(share.verifyCardShareToken('card123.forged'),null);
  assert.equal(share.verifyCardShareToken(''),null);
  assert.equal(share.buildCardShareUrl('card123','https://membership.grandmedicalcare.com/'),'https://membership.grandmedicalcare.com/card/'+token);
});
test('WhatsApp Web link uses the member phone in international format',()=>{
  assert.equal(wa.phoneForWhatsAppWeb('+968 9540 4043'),'96895404043');
  assert.equal(wa.phoneForWhatsAppWeb('0096895404043'),'96895404043');
  assert.equal(wa.phoneForWhatsAppWeb('95404043'),'96895404043');
  const link=wa.buildWhatsAppWebLink('+96895404043',wa.buildCardShareMessage('Hasan','16569','2027-12-11','https://x.test/card/abc'));
  assert.ok(link.startsWith('https://web.whatsapp.com/send?phone=96895404043&text='));
  assert.ok(decodeURIComponent(link).includes('https://x.test/card/abc'));
});
test('Session message has treatment, date and sessions left',()=>{
  const m=wa.buildSessionRecordedMessage({name:'Hasan',treatmentName:'Laser',packageName:'Ministries',date:'22 Nov 2026',usedSessions:2,totalSessions:6,remainingSessions:4});
  for(const part of ['Hello Hasan','Treatment: Laser (Ministries)','Date: 22 Nov 2026','Sessions used: 2 of 6','Sessions remaining: 4']) assert.ok(m.includes(part),part);
  const last=wa.buildSessionRecordedMessage({name:'H',treatmentName:'Laser',packageName:'Laser',date:'x',usedSessions:6,totalSessions:6,remainingSessions:0});
  assert.ok(last.includes('Treatment: Laser\n'));assert.ok(last.includes('last session'));
  assert.equal(wa.clinicDateLabel(new Date('2026-11-22T21:30:00Z')),'23 Nov 2026');
});
