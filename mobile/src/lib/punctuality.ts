import { color } from '@/theme/tokens';
import type { StringKey } from '@/i18n/strings';
import type { PunctualityLevel } from '@/api/types';

/** Traffic-light colours + label for a punctuality level. */
export function levelStyle(level: PunctualityLevel): { dot: string; bg: string; border: string; fg: string; labelKey: StringKey } {
  if (level === 'red') return { dot: color.danger, bg: color.dangerBg, border: color.dangerBorder, fg: color.dangerInk, labelKey: 'punctRed' };
  if (level === 'yellow') return { dot: color.warn, bg: color.warnBg, border: color.warnBorder, fg: color.warnInk, labelKey: 'punctYellow' };
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
    return { headlineKey: 'punctHalf', noteKey: 'punctHalfNote', ink: color.dangerInk, bg: color.dangerBg, border: color.danger, kicker: color.dangerInk, body: color.dangerInk };
  }
  if (p.deducting) {
    return { headlineKey: 'punctDeduct', noteKey: 'punctDeductNote', ink: color.dangerInk, bg: color.dangerBg, border: color.dangerBorder, kicker: color.dangerInk, body: color.dangerInk };
  }
  if (p.warned) {
    return { headlineKey: 'punctWarned', noteKey: 'punctWarnedNote', ink: color.warnInk, bg: color.warnBg, border: color.warnBorder, kicker: color.warnInk, body: color.warnInk };
  }
  return { headlineKey: 'punctClear', noteKey: 'punctClearNote', ink: color.text, bg: color.white, border: color.divider, kicker: color.neutral700, body: color.neutral700 };
}
