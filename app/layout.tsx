import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { inter } from '../src/styles/fonts';
import './globals.css';
import { LanguageProvider } from '../src/i18n/language-provider';

export const metadata: Metadata = {
  title: '福 Bank',
  description: 'Your money, clearly in view.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body className={inter.variable}><LanguageProvider>{children}</LanguageProvider></body>
    </html>
  );
}

