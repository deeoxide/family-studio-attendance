import { color } from '@/theme/tokens';
import type { StringKey } from '@/i18n/strings';
import type { PunctualityLevel } from '@/api/types';

/** Traffic-light colours + label for a punctuality level. */
export function levelStyle(level: PunctualityLevel): { dot: string; bg: string; border: string; fg: string; labelKey: StringKey } {
  if (level === 'red') return { dot: color.danger, bg: color.dangerBg, border: color.dangerBorder, fg: color.danger, labelKey: 'punctRed' };
  if (level === 'yellow') return { dot: color.warn, bg: color.warnBg, border: color.accent200, fg: color.accent800, labelKey: 'punctYellow' };
  return { dot: color.ok, bg: color.okBg, border: color.okBorder, fg: color.ok, labelKey: 'punctGreen' };
}

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
