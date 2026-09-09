import type { ZodTypeAny, infer as ZodInfer } from 'zod';
import { ZodError } from 'zod';
import { badRequest } from './errors';

/**
 * Parse `data` with `schema` or throw a 400 carrying the first issue's message.
 * Replaces the `const parsed = schema.safeParse(...); if (!parsed.success) return
 * res.status(400)...` block that was repeated in every route.
 */
export function parse<S extends ZodTypeAny>(schema: S, data: unknown, fallback = 'Invalid request'): ZodInfer<S> {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  throw badRequest(firstIssueMessage(result.error, fallback));
}

export function firstIssueMessage(error: ZodError, fallback: string): string {
  return error.issues[0]?.message ?? fallback;
}
