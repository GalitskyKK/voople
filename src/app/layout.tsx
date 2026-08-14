import localFont from "next/font/local";

import { WebsiteJsonLd } from "@/components/seo/WebsiteJsonLd";
import { TRPCReactProvider } from "@/lib/trpc/client";
import { createRootMetadata } from "@/lib/seo/metadata";
import { AppThemeProvider } from "@/components/theme/AppThemeProvider";
import { AppThemeSync } from "@/components/theme/AppThemeSync";
import { AppPreferencesProvider } from "@/components/settings/AppPreferencesProvider";
import { WebVitalsReporter } from "@/components/telemetry/WebVitalsReporter";

import "./globals.css";

const geistSans = localFont({
  src: "../../node_modules/next/dist/next-devtools/server/font/geist-latin.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
});

const geistMono = localFont({
  src: "../../node_modules/next/dist/next-devtools/server/font/geist-mono-latin.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
});

export const metadata = createRootMetadata();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="relative min-h-dvh bg-background text-foreground antialiased">
        <WebsiteJsonLd />
        <a href="#main-content" className="voople-skip-link">
          Перейти к содержимому
        </a>
        <TRPCReactProvider>
          <AppThemeProvider>
            <AppPreferencesProvider>
              <div aria-hidden className="voople-grain fixed inset-0 -z-[5]" />
              <AppThemeSync />
              <WebVitalsReporter />
              {children}
            </AppPreferencesProvider>
          </AppThemeProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
