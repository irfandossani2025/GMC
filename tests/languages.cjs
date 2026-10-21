const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const {renderToStaticMarkup} = require('react-dom/server');
const root = path.resolve(__dirname, '..');
const cache = new Map();
let currentLanguage = 'en';
function load(relative) {
  const file = path.resolve(root, relative);
  if(cache.has(file)) return cache.get(file).exports;
  const source = fs.readFileSync(file, 'utf8');
  const result = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, resolveJsonModule: true}}).outputText;
  const module = {exports: {}}; cache.set(file, module);
  function localRequire(id) {
    if(id === '@/components/i18n/LanguageProvider') return {
      useLanguage: () => ({language: currentLanguage, t: (text, values) => translator.translate(currentLanguage, text, values), formatDate: value => translator.formatUiDate(currentLanguage, value)}),
      LanguageSwitcher: () => React.createElement('div', null, 'English / العربية'),
    };
    if(id === 'next/navigation') return {useRouter: () => ({push() {}}), usePathname: () => '/dashboard'};
    if(id.startsWith('@/')) {
      const target = path.join(root, id.slice(2));
      if(fs.existsSync(target) && target.endsWith('.json')) return require(target);
      for(const extension of ['.tsx','.ts']) if(fs.existsSync(target+extension)) return load(id.slice(2)+extension);
    }
    if(id.startsWith('.')) {
      const target=path.resolve(path.dirname(file),id);
      if(target.endsWith('.json'))return require(target);
    }
    return require(id);
  }
  vm.runInNewContext(result, {module, exports: module.exports, require: localRequire, console, URL, Date, Intl, process, setTimeout, clearTimeout}, {filename:file});
  return module.exports;
}
const translator = load('lib/i18n/translate.ts');
const dictionary = require('../lib/i18n/ar.json');
test('Arabic interface text falls back safely for patient-entered values and preserves API codes in English', () => {
  assert.equal(translator.translate('ar','Patients'),'المرضى');
  assert.equal(translator.translate('en','Patients'),'Patients');
  assert.equal(translator.translate('ar','Patient entered name 123'),'Patient entered name 123');
  assert.equal(translator.readLanguage('fr'),'en');
  assert.equal(translator.readLanguage('ar'),'ar');
});
test('Arabic parameterized text keeps identifiers and counts in the right fields', () => {
  assert.equal(translator.translate('ar','Page {page} of {total}',{page:2,total:8}),'صفحة 2 من 8');
  assert.equal(translator.translate('ar','Edit {name}',{name:'GMC-001'}),'تعديل GMC-001');
  assert.equal(translator.translate('en','Edit {name}',{name:'GMC-001'}),'Edit GMC-001');
});
test('UI dates localize without changing the card formatter', () => {
  assert.equal(translator.formatUiDate('en','2026-01-15T12:00:00Z'),'15 Jan 2026');
  assert.match(translator.formatUiDate('ar','2026-01-15T12:00:00Z'),/يناير/);
  assert.equal(translator.formatUiDate('ar','not a date'),'غير متاح');
  assert.equal(load('lib/clinic.ts').formatDisplayDate('2026-01-15T12:00:00Z'),'15 Jan 2026');
});
test('Arabic registration form translates labels while retaining membership and gender submission values', () => {
  currentLanguage='ar';
  const Page=load('app/dashboard/members/new/page.tsx').default;
  const html=renderToStaticMarkup(React.createElement(Page));
  assert.match(html,/تسجيل مريض جديد/);
  assert.match(html,/اسم المريض/);
  for(const code of ['STANDARD','PREMIUM','CORPORATE','MALE','FEMALE','OTHER'])assert.ok(html.includes('value="'+code+'"'));
  assert.match(html,/type="tel"/);
  assert.match(html,/dir="ltr"/);
  currentLanguage='en';
  assert.match(renderToStaticMarkup(React.createElement(Page)),/Create a new patient/);
});
test('The Arabic login form keeps password and email controls and renders translated labels', () => {
  currentLanguage='ar';
  const Page=load('app/auth/login/page.tsx').default;
  const html=renderToStaticMarkup(React.createElement(Page));
  assert.match(html,/تسجيل الدخول/);
  assert.match(html,/البريد الإلكتروني/);
  assert.match(html,/كلمة المرور/);
  assert.match(html,/type="password"/);
  assert.match(html,/autoComplete="current-password"/);
});
test('Required navigation, actions and status labels have Arabic translations', () => {
 for(const text of ['Overview','Patients','Scan card','Treatments','Membership cards','Session history','Reports','Staff & access','Workspace','Management','SUPER_ADMIN','STAFF','ACTIVE','EXPIRED','Create patient, card & package','Please enter a barcode or card number.']) assert.ok(dictionary[text], text);
});
