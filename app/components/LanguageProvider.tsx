'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY, normalizeLanguage, type Language } from '@/app/lib/i18n';

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);

  useEffect(() => {
    try {
      setLanguageState(normalizeLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)));
    } catch {
      setLanguageState(DEFAULT_LANGUAGE);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      // Ignore storage failures in private browsing or locked-down browsers.
    }
  }, [language]);

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    setLanguage: (nextLanguage) => setLanguageState(normalizeLanguage(nextLanguage)),
    toggleLanguage: () => setLanguageState((current) => current === 'zh' ? 'en' : 'zh'),
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const value = useContext(LanguageContext);
  if (!value) {
    return {
      language: DEFAULT_LANGUAGE,
      setLanguage: () => {},
      toggleLanguage: () => {},
    };
  }
  return value;
}
