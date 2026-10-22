// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Inter font plumbing', () => {
  it('uses Next local font loading with a bundled Inter asset', () => {
    const fontModule = readFileSync('src/styles/fonts.ts', 'utf8');
    const rootLayout = readFileSync('app/layout.tsx', 'utf8');

    expect(fontModule).toContain("from 'next/font/local'");
    expect(fontModule).toContain('@fontsource-variable/inter/files/inter-latin-wght-normal.woff2');
    expect(rootLayout).toContain('inter.variable');
  });
});
