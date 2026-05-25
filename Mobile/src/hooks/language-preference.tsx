import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type AppLanguage = 'vi' | 'en';

type LanguagePreferenceContextValue = {
  language: AppLanguage;
  setLanguage: (next: AppLanguage) => void;
  t: (vi: string, en: string) => string;
};

const STORAGE_KEY = 'mobile.languagePreference';

const LanguagePreferenceContext = createContext<LanguagePreferenceContextValue | null>(null);

export function LanguagePreferenceProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>('vi');

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!alive) return;
        if (stored === 'vi' || stored === 'en') {
          setLanguageState(stored);
        }
      })
      .catch(() => {
        // no-op: fallback to default language
      });
    return () => {
      alive = false;
    };
  }, []);

  const setLanguage = (next: AppLanguage) => {
    setLanguageState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {
      // no-op: keep runtime state even if persistence fails
    });
  };

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: (vi: string, en: string) => (language === 'vi' ? vi : en),
    }),
    [language],
  );

  return <LanguagePreferenceContext.Provider value={value}>{children}</LanguagePreferenceContext.Provider>;
}

export function useLanguagePreference() {
  const ctx = useContext(LanguagePreferenceContext);
  if (!ctx) throw new Error('useLanguagePreference must be used within LanguagePreferenceProvider');
  return ctx;
}
