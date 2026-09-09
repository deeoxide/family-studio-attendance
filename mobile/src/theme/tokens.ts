/**
 * Design tokens ported from the Claude Design system
 * (_ds/classical-.../styles.css) — the source of truth for colour, type
 * and spacing. Keep this file in sync if the design system is retuned.
 *
 * Palette target: white ground ~90%, gold accent ~7%, ink ~3%.
 */

export const color = {
  bg: '#f3f2f2',
  surface: '#eae9e9',
  text: '#201f1d',
  accent: '#b68235',
  divider: 'rgba(32,31,29,0.16)',

  neutral100: '#f8f4f4',
  neutral200: '#eae7e7',
  neutral300: '#d7d3d3',
  neutral400: '#bab6b6',
  neutral500: '#9b9797',
  neutral600: '#7d7979',
  neutral700: '#605d5d',
  neutral800: '#444141',
  neutral900: '#2d2b2b',

  accent100: '#fff3e4',
  accent200: '#ffe3bf',
  accent300: '#facb8d',
  accent400: '#e1ad66',
  accent500: '#c28d41',
  accent600: '#a06f24',
  accent700: '#7d5411',
  accent800: '#5a3b0a',
  accent900: '#3a270d',

  white: '#ffffff',

  // Punctuality traffic-light. Muted to sit inside the white / gold / ink palette.
  ok: '#3f7d4f',
  okBg: '#eef3ee',
  okBorder: '#cfe0d1',
  warn: '#b68235', // = accent, the "yellow" level
  warnBg: '#fff3e4',
  danger: '#b0402f',
  dangerBg: '#f7ebe8',
  dangerBorder: '#e6c9c2',
} as const;

export const radius = { sm: 2, md: 4, lg: 7 } as const;

export const space = { 1: 4.6, 2: 9.2, 3: 13.8, 4: 18.4, 6: 27.6, 8: 36.8 } as const;

/** react-native shadow props, one flavour per _ds shadow token. */
export const shadow = {
  sm: { shadowColor: '#2d2b2b', shadowOpacity: 0.14, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  md: { shadowColor: '#2d2b2b', shadowOpacity: 0.16, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  lg: { shadowColor: '#2d2b2b', shadowOpacity: 0.22, shadowRadius: 32, shadowOffset: { width: 0, height: 12 }, elevation: 10 },
} as const;

/**
 * Font family names as registered with expo-font in App.tsx.
 *
 * English  — Source Serif 4: a formal, modern-classical serif with lining
 *            figures, so digits sit on a single baseline in tables and totals.
 * Lao      — Noto Sans Lao throughout.
 */
export const fontFamily = {
  headingEn: 'SourceSerif4_600SemiBold',
  headingEnRegular: 'SourceSerif4_400Regular',
  bodyEn: 'SourceSerif4_400Regular',
  bodyEnMedium: 'SourceSerif4_600SemiBold',
  lao: 'NotoSansLao_400Regular',
  laoMedium: 'NotoSansLao_600SemiBold',
} as const;

/**
 * Spread onto any <Text> that shows figures (salaries, times, codes, counts)
 * so every digit is the same width — columns and totals line up regardless of
 * the values. Harmless on non-numeric text.
 */
export const tabularNums: { fontVariant: ['tabular-nums'] } = { fontVariant: ['tabular-nums'] };

export function headingFont(lang: 'en' | 'lo'): string {
  return lang === 'lo' ? fontFamily.laoMedium : fontFamily.headingEn;
}
export function bodyFont(lang: 'en' | 'lo'): string {
  return lang === 'lo' ? fontFamily.lao : fontFamily.bodyEn;
}
export function bodyFontMedium(lang: 'en' | 'lo'): string {
  return lang === 'lo' ? fontFamily.laoMedium : fontFamily.bodyEnMedium;
}
