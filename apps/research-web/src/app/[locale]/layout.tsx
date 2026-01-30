import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import { ClientProviders } from "../client-providers";
import { setI18n } from "@/lib/set-i18n";
import { I18nProvider } from "@/lib/i18n-provider";
import { locales, loadCatalog, type Locale } from "@/lib/i18n";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "React Web App",
  description: "Document viewer application",
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  await setI18n(locale);
  const messages = await loadCatalog(locale);

  return (
    <html lang={locale}>
      <body className={inter.className}>
        <I18nProvider locale={locale} messages={messages}>
          <ClientProviders>{children}</ClientProviders>
        </I18nProvider>
      </body>
    </html>
  );
}
