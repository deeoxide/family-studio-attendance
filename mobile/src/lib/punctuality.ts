import { color } from '@/theme/tokens';
import type { StringKey } from '@/i18n/strings';

export interface PunctualityStyle {
  headlineKey: StringKey;
  noteKey: StringKey;
  ink: string;
  bg: string;
  border: string;
  kicker: string;
  body: string;
}

/** Card styling for the punctuality state, ported from the prototype's `punct` object. */
export function punctualityStyle(p: { warned: boolean; deducting: boolean; half: boolean }): PunctualityStyle {
  if (p.half) {
    return { headlineKey: 'punctHalf', noteKey: 'punctHalfNote', ink: color.neutral900, bg: color.white, border: color.neutral900, kicker: color.neutral700, body: color.neutral700 };
  }
  if (p.deducting) {
    return { headlineKey: 'punctDeduct', noteKey: 'punctDeductNote', ink: color.accent900, bg: color.accent100, border: color.accent200, kicker: color.accent800, body: color.accent800 };
  }
  if (p.warned) {
    return { headlineKey: 'punctWarned', noteKey: 'punctWarnedNote', ink: color.accent900, bg: color.accent100, border: color.accent200, kicker: color.accent800, body: color.accent800 };
  }
  return { headlineKey: 'punctClear', noteKey: 'punctClearNote', ink: color.text, bg: color.white, border: color.divider, kicker: color.neutral700, body: color.neutral700 };
}
