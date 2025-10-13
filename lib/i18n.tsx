"use client";

import React, { useState, useEffect, createContext, useContext, ReactNode } from "react";
import enTranslations from "@/locales/en.json";
import noTranslations from "@/locales/no.json";

type Translations = typeof enTranslations;
type Language = "en" | "no";

const translations: Record<Language, Translations> = {
  en: enTranslations,
  no: noTranslations,
};

interface I18nContextValue {
  locale: Language;
  t: (key: string) => string;
  setLocale: (locale: Language) => void;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Language>("en");

  useEffect(() => {
    const saved = localStorage.getItem("language") as Language;
    if (saved && (saved === "en" || saved === "no")) {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = (newLocale: Language) => {
    setLocaleState(newLocale);
    localStorage.setItem("language", newLocale);
  };

  const t = (key: string): string => {
    const keys = key.split(".");
    let value: any = translations[locale];

    for (const k of keys) {
      value = value?.[k];
    }

    return typeof value === "string" ? value : key;
  };

  return React.createElement(
    I18nContext.Provider,
    { value: { locale, t, setLocale } },
    children
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}

export { useI18n as useTranslation };
