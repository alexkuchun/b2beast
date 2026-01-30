import { setI18n as linguiSetI18n } from "@lingui/react/server";
import { getI18nInstance, type Locale } from "./i18n";

export async function setI18n(locale: Locale) {
  const i18n = await getI18nInstance(locale);
  linguiSetI18n(i18n);
  return i18n;
}
