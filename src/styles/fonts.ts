import localFont from 'next/font/local';

/** Bundled at build time so the banking shell never depends on a runtime font request. */
export const inter = localFont({
  src: '../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
  variable: '--font-inter',
  display: 'swap',
  fallback: ['ui-sans-serif', 'system-ui', 'sans-serif'],
  preload: true,
});
