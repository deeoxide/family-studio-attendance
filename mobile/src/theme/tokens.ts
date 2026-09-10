/**
 * Design tokens for the Family Studio staff app.
 *
 * The app is an instrument — a daily GPS check-in, an occasional leave request or
 * payslip — so the palette is drawn from a photo lab rather than from a landing
 * page: a cool print-viewing-booth grey for the ground, a blue-black ink like a
 * camera body, and one desaturated daylight slate-blue (≈5500K studio light) as
 * the single accent. Status colours are muted and each has a job: olive green =
 * on time, manila ochre = warning letter (no money), dried brick = deduction.
 *
 * Palette weight: grey ground ~90%, slate accent ~7%, ink ~3%.
 */

export const color = {
  bg: '#eceef0',
  surface: '#e0e3e6',
  text: '#21262b',
  accent: '#456277',
  divider: 'rgba(33,38,43,0.14)',

  neutral100: '#f3f5f6',
  neutral200: '#e6e9eb',
  neutral300: '#d2d7da',
  neutral400: '#b0b7bb',
  neutral500: '#8f979c',
  neutral600: '#6f777c',
  neutral700: '#535a5f',
  neutral800: '#3a4045',
  neutral900: '#242a2e',

  accent100: '#eef2f4',
  accent200: '#d8e1e6',
  accent300: '#b6c6cf',
  accent400: '#8ea4b0',
  accent500: '#647e8c',
  accent600: '#4b6675',
  accent700: '#3a5060',
  accent800: '#2c3d49',
  accent900: '#1f2b33',

  white: '#ffffff',

  // Punctuality scale — three distinct muted steps, each role-named.
  ok: '#4d7355',        // on time — a green that leans olive
  okBg: '#eef2ec',
  okBorder: '#cfdcc9',
  warn: '#9a7d3f',      // warning letter issued, no deduction — manila ochre
  warnBg: '#f3efe6',
  warnBorder: '#e2d6b8',
  warnInk: '#6b5526',
  danger: '#9a4b3d',    // deduction applies — dried brick
  dangerBg: '#f4ece9',
  dangerBorder: '#e3ccc4',
  dangerInk: '#7a3a2e',
} as const;

/**
 * Corner radius by role, not one blanket value: square edges on dense data
 * (stat grids, the segmented control), a small softening on cards / inputs /
 * buttons, a circle for avatars.
 */
export const radius = { none: 0, sm: 3, md: 5, lg: 8, pill: 999 } as const;

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
 * English  — Source Serif 4. A studio that mounts and albums portraits earns a
 *            serif; this one is a text face with lining figures, so it carries
 *            headings and every column of digits (times, distances, salaries) on
 *            one baseline. Body copy rides on it too.
 * Lao      — Noto Sans Lao throughout.
 *
 * Section labels ("kickers") are set with kickerStyle below — sentence case, no
 * tracking, no caps. The tracked-out ALL-CAPS eyebrow is a template tell.
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

/**
 * Section label ("kicker"). Quiet, sentence case — takes the string as authored.
 * Pass a colour to tint it to a status; defaults to the slate accent.
 */
export function kickerStyle(tint: string = color.accent700) {
  return { fontSize: 11, letterSpacing: 0.2, fontWeight: '500' as const, color: tint };
}

export function headingFont(lang: 'en' | 'lo'): string {
  return lang === 'lo' ? fontFamily.laoMedium : fontFamily.headingEn;
}
export function bodyFont(lang: 'en' | 'lo'): string {
  return lang === 'lo' ? fontFamily.lao : fontFamily.bodyEn;
}
export function bodyFontMedium(lang: 'en' | 'lo'): string {
  return lang === 'lo' ? fontFamily.laoMedium : fontFamily.bodyEnMedium;
}
