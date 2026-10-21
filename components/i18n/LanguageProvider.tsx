'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Language, LANGUAGE_STORAGE_KEY, readLanguage, translate, formatUiDate } from '@/lib/i18n/translate';

type Translate = (text: string, values?: Record<string, string | number>) => string;
interface LanguageContextValue { language: Language; setLanguage: (language: Language) => void; t: Translate; formatDate: (value?: string | Date | null) => string; }
const LanguageContext = createContext<LanguageContextValue>({language: 'en', setLanguage: () => {}, t: text => text, formatDate: value => formatUiDate('en', value)});

export function LanguageProvider({children}: {children: React.ReactNode}) {
  const [language, updateLanguage] = useState<Language>('en');
  useEffect(() => {
    try { updateLanguage(readLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY))); } catch { /* Storage may be disabled. The switch still works for this visit. */ }
    const syncLanguage = (event: StorageEvent) => {
      if (event.key === LANGUAGE_STORAGE_KEY) updateLanguage(readLanguage(event.newValue));
    };
    window.addEventListener('storage', syncLanguage);
    return () => window.removeEventListener('storage', syncLanguage);
  }, []);
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);
  const setLanguage = useCallback((next: Language) => {
    updateLanguage(next);
    try { window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next); } catch { /* Retain the in-memory choice. */ }
  }, []);
  const t = useCallback<Translate>((text, values) => translate(language, text, values), [language]);
  const formatDate = useCallback((value?: string | Date | null) => formatUiDate(language, value), [language]);
  const value = useMemo(() => ({language, setLanguage, t, formatDate}), [language, setLanguage, t, formatDate]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
export function useLanguage() { return useContext(LanguageContext); }

export function LanguageSwitcher({className = ''}: {className?: string}) {
  const {language, setLanguage, t} = useLanguage();
  return <div className={`language-switcher ${className}`} dir="ltr" role="group" aria-label={t('Language')}>
    <button type="button" lang="en" aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>English</button>
    <button type="button" lang="ar" aria-pressed={language === 'ar'} onClick={() => setLanguage('ar')}>العربية</button>
  </div>;
}
