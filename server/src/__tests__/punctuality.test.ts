import { describe, it, expect } from 'vitest';
import { punctualityLevel } from '../lib/punctuality';

describe('punctualityLevel', () => {
  it('green with no late days', () => {
    expect(punctualityLevel(0)).toBe('green');
  });

  it('yellow for 1–3 late days (warning-letter zone)', () => {
    expect(punctualityLevel(1)).toBe('yellow');
    expect(punctualityLevel(3)).toBe('yellow');
  });

  it('red from the 4th late day (deduction zone)', () => {
    expect(punctualityLevel(4)).toBe('red');
    expect(punctualityLevel(15)).toBe('red');
  });
});
