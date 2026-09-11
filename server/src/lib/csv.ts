/** Quote a field only if it needs it (contains a comma, quote, or newline). */
function csvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Build a CSV document (CRLF line endings) from a header row and data rows. */
export function toCsv(headers: string[], rows: string[][]): string {
  return [headers, ...rows].map((row) => row.map(csvField).join(',')).join('\r\n') + '\r\n';
}
