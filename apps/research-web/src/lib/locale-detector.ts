import { defaultLocale, isValidLocale, type Locale } from "./i18n";
import Negotiator from "negotiator";

export function getLocaleFromHeaders(headers: Headers): Locale {
  const languages = new Negotiator({
    headers: {
      "accept-language": headers.get("accept-language") || "",
    },
  }).languages();

  for (const lang of languages) {
    const locale = lang.split("-")[0];
    if (isValidLocale(locale)) {
      return locale;
    }
  }

  return defaultLocale;
}
