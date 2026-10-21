import arabic from './ar.json';
export type Language = 'en' | 'ar';
export const LANGUAGE_STORAGE_KEY = 'gmc-interface-language';
export function translate(language: Language, text: string, values?: Record<string, string | number>): string {
  const dictionary: Record<string, string> = arabic;
  const translated = language === 'ar' ? dictionary[text] ?? text : text;
  return translated.replace(/\{(\w+)\}/g, (token, name) => values?.[name] === undefined ? token : String(values[name]));
}
export function readLanguage(value: string | null): Language { return value === 'ar' ? 'ar' : 'en'; }
export function formatUiDate(language: Language, value?: string | Date | null, includeTime = false): string {
  if (!value) return translate(language, 'N/A');
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return translate(language, 'N/A');
  return new Intl.DateTimeFormat(language === 'ar' ? 'ar-OM' : 'en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    ...(includeTime ? {hour: '2-digit', minute: '2-digit'} as const : {}),
  }).format(date);
}
