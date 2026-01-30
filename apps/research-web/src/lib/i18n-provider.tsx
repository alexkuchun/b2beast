"use client";

import { I18nProvider as LinguiI18nProvider } from "@lingui/react";
import { setupI18n } from "@lingui/core";
import { useMemo } from "react";
import { type Locale } from "./i18n";

export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: any;
  children: React.ReactNode;
}) {
  const i18n = useMemo(() => {
    return setupI18n({
      locale,
      messages: { [locale]: messages },
    });
  }, [locale, messages]);

  return <LinguiI18nProvider i18n={i18n}>{children}</LinguiI18nProvider>;
}
