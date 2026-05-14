'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { DICTS, THB_USD_RATE } from '@/lib/i18n';
import type { Lang, Currency } from '@/lib/i18n';

interface AppPrefs {
  lang: Lang;
  setLang: (l: Lang) => void;
  currency: Currency;
  setCurrency: (c: Currency) => void;
  t: (key: string) => string;
  formatMoney: (thbAmount: string | number) => string;
}

const AppPrefsContext = createContext<AppPrefs | null>(null);

export function AppPrefsProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');
  const [currency, setCurrencyState] = useState<Currency>('THB');

  useEffect(() => {
    const l = localStorage.getItem('app-lang') as Lang | null;
    const c = localStorage.getItem('app-currency') as Currency | null;
    if (l === 'en' || l === 'th') setLangState(l);
    if (c === 'THB' || c === 'USD') setCurrencyState(c);
  }, []);

  function setLang(l: Lang) {
    setLangState(l);
    localStorage.setItem('app-lang', l);
  }

  function setCurrency(c: Currency) {
    setCurrencyState(c);
    localStorage.setItem('app-currency', c);
  }

  function t(key: string): string {
    return DICTS[lang][key] ?? key;
  }

  function formatMoney(thbAmount: string | number): string {
    const num = Number(thbAmount);
    if (currency === 'USD') {
      const usd = num / THB_USD_RATE;
      return `$${usd.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    }
    return `฿${num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }

  return (
    <AppPrefsContext.Provider value={{ lang, setLang, currency, setCurrency, t, formatMoney }}>
      {children}
    </AppPrefsContext.Provider>
  );
}

export function useAppPrefs(): AppPrefs {
  const ctx = useContext(AppPrefsContext);
  if (!ctx) throw new Error('useAppPrefs must be used within AppPrefsProvider');
  return ctx;
}
