/**
 * Prepare a validated patch object for `prisma.update`:
 *  - a key set to `''` becomes `null` (the caller is clearing that field)
 *  - a key set to `undefined` is dropped (leave whatever is stored)
 *
 * Returns a loosely-typed object on purpose — it feeds straight into a Prisma
 * `data:` argument, whose own types do the checking.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function nullifyBlanks(obj: Record<string, unknown>): Record<string, any> {
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, v === '' ? null : v]),
  );
}
