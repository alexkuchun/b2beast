import { setupI18n } from "@lingui/core";

export const locales = ["ru", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ru";

export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

export async function loadCatalog(locale: Locale) {
  const { messages } = await import(`@/locales/${locale}/messages`);
  return messages;
}

export async function getI18nInstance(locale: Locale) {
  const messages = await loadCatalog(locale);
  const i18n = setupI18n({
    locale,
    messages: { [locale]: messages },
  });
  return i18n;
}
