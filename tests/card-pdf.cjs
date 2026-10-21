const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
test('PDF export captures each physical card instead of its wide page container', async () => {
  const captures = [], pages = [], images = [];
  class Pdf {
    constructor(options) { pages.push(options.format); }
    addPage(size) { pages.push(size); }
    addImage(...args) { images.push(args); }
    output() { return new ArrayBuffer(1); }
  }
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync('lib/pdf.ts', 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true,target:ts.ScriptTarget.ES2020}}).outputText;
  vm.runInNewContext(source,{module,exports:module.exports,require:(name)=> name==='jspdf' ? Pdf : async (element, options) => {captures.push({element,options}); return {toDataURL:()=> 'data:image/png;base64,AA=='};},console});
  const front = {matches:()=>true}, back = {matches:()=>true};
  const frontWrapper = {matches:()=>false,querySelector:()=>front};
  const backWrapper = {matches:()=>false,querySelector:()=>back};
  await module.exports.generateCardPDF(frontWrapper,backWrapper);
  assert.equal(captures[0].element,front);
  assert.equal(captures[1].element,back);
  assert.ok(captures.every(c=>c.options.scale>=3));
  assert.ok(pages.every(size=>size[0]===85.6&&size[1]===54));
  assert.ok(images.every(args=>args[4]===85.6&&args[5]===54));
});
