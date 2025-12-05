import { describe, expect, it } from 'vitest';
import { isSystemIgnored } from '../constants';

describe('isSystemIgnored', () => {
  it('ignores dotfiles and folders', () => {
    expect(isSystemIgnored('.git')).toBe(true);
    expect(isSystemIgnored('.env')).toBe(true);
    expect(isSystemIgnored('node_modules')).toBe(true);
  });

  it('ignores binary/media extensions', () => {
    expect(isSystemIgnored('image.png')).toBe(true);
    expect(isSystemIgnored('logo.svg')).toBe(true);
    expect(isSystemIgnored('document.pdf')).toBe(true);
  });

  it('does not ignore regular source files', () => {
    expect(isSystemIgnored('App.tsx')).toBe(false);
    expect(isSystemIgnored('index.ts')).toBe(false);
    expect(isSystemIgnored('styles.css')).toBe(false);
  });

  it('handles trimmed values', () => {
    expect(isSystemIgnored(' .git')).toBe(true);
    expect(isSystemIgnored('   App.tsx   ')).toBe(false);
  });
});
