import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { inter } from '../src/styles/fonts';
import './globals.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '福 bank',
  description: 'Your money, clearly in view.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body className={inter.variable}>{children}</body>
    </html>
  );
}

