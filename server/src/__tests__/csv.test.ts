import { describe, expect, it } from 'vitest';
import { toCsv } from '../lib/csv';

describe('toCsv', () => {
  it('joins headers and rows with commas and CRLF line endings', () => {
    expect(toCsv(['A', 'B'], [['1', '2']])).toBe('A,B\r\n1,2\r\n');
  });

  it('quotes a field containing a comma', () => {
    expect(toCsv(['Task'], [['Retouch, then export']])).toBe('Task\r\n"Retouch, then export"\r\n');
  });

  it('escapes a quote inside a quoted field by doubling it', () => {
    expect(toCsv(['Task'], [['Say "hi"']])).toBe('Task\r\n"Say ""hi"""\r\n');
  });

  it('leaves a plain field unquoted', () => {
    expect(toCsv(['Status'], [['OPEN']])).toBe('Status\r\nOPEN\r\n');
  });
});
