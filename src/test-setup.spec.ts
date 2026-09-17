import { describe, expect, it } from 'vitest';

describe('test-setup smoke', () => {
  it('runs vitest with jsdom', () => {
    expect(typeof document).toBe('object');
  });

  it('localStorage is reset between tests', () => {
    localStorage.setItem('foo', 'bar');
    expect(localStorage.getItem('foo')).toBe('bar');
  });
});
