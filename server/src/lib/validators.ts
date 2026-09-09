import { z } from 'zod';

/** A YYYY-MM-DD calendar date. */
export const isoDate = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a YYYY-MM-DD date');

/**
 * A HH:MM 24-hour wall-clock time, range-checked so "29:99" is rejected at the
 * schema (the regex alone let it through, and the value was then silently
 * dropped downstream).
 */
export const hhmm = z
  .string()
  .regex(/^\d{2}:\d{2}$/, 'Use a HH:MM time')
  .refine((value) => {
    const [h, m] = value.split(':').map(Number);
    return h <= 23 && m <= 59;
  }, 'Use a valid HH:MM time');

/** Optional short free-text field (trimmed, capped). */
export const optionalText = (max = 120) => z.string().trim().max(max).optional();

/** Optional YYYY-MM-DD; `''` is allowed as an explicit "clear this field". */
export const optionalDate = isoDate.optional().or(z.literal(''));
