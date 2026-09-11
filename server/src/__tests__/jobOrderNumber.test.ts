import { describe, expect, it } from 'vitest';
import { buildJobOrderNo } from '../lib/jobOrderNumber';

describe('buildJobOrderNo', () => {
  it('builds the first internal job of the month', () => {
    expect(buildJobOrderNo('2026-09-03', 'INTERNAL', 0)).toBe('JO010926-001');
  });

  it('builds the first external job of the month', () => {
    expect(buildJobOrderNo('2026-09-03', 'EXTERNAL', 0)).toBe('JO010926-002');
  });

  it('increments the sequence within the same month and category', () => {
    expect(buildJobOrderNo('2026-09-20', 'INTERNAL', 1)).toBe('JO020926-001');
  });

  it('counts internal and external work separately, both starting at 01', () => {
    expect(buildJobOrderNo('2026-09-20', 'EXTERNAL', 0)).toBe('JO010926-002');
  });

  it('pads a two-digit month and takes the last two digits of the year', () => {
    expect(buildJobOrderNo('2027-01-05', 'INTERNAL', 0)).toBe('JO010127-001');
  });
});
