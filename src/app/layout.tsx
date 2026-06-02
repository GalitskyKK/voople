import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { TRPCReactProvider } from "@/lib/trpc/client";
import { AppThemeProvider } from "@/components/theme/AppThemeProvider";
import { AppThemeSync } from "@/components/theme/AppThemeSync";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Voople",
  description: "Социальная сеть с живыми профилями",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="relative min-h-dvh bg-background text-foreground antialiased">
        <a href="#main-content" className="voople-skip-link">
          Перейти к содержимому
        </a>
        <TRPCReactProvider>
          <AppThemeProvider>
            <div aria-hidden className="voople-grain fixed inset-0 -z-[5]" />
            <AppThemeSync />
            {children}
          </AppThemeProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
