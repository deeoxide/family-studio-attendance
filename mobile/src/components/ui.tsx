import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextProps,
  View,
  ViewProps,
} from 'react-native';
import { color, radius, shadow, headingFont, bodyFont, tabularNums, kickerStyle } from '@/theme/tokens';
import { useLanguage } from '@/state/LanguageContext';

// ── Text ──────────────────────────────────────────────────────────────────

export function Body({ style, ...props }: TextProps) {
  const { lang } = useLanguage();
  return <Text style={[{ fontFamily: bodyFont(lang), color: color.text, fontSize: 14 }, tabularNums, style]} {...props} />;
}

export function Heading({ style, ...props }: TextProps) {
  const { lang } = useLanguage();
  return (
    <Text
      style={[{ fontFamily: headingFont(lang), color: color.text, fontSize: 17, fontWeight: lang === 'lo' ? '600' : undefined }, tabularNums, style]}
      {...props}
    />
  );
}

export function Kicker({ style, children, ...props }: TextProps) {
  const { lang } = useLanguage();
  return (
    <Text style={[{ fontFamily: bodyFont(lang) }, kickerStyle(), style]} {...props}>
      {children}
    </Text>
  );
}

export function Muted({ style, ...props }: TextProps) {
  const { lang } = useLanguage();
  return <Text style={[{ fontFamily: bodyFont(lang), color: color.neutral700, fontSize: 11.5, lineHeight: 17 }, tabularNums, style]} {...props} />;
}

// ── Layout ────────────────────────────────────────────────────────────────

export function Card({ style, ...props }: ViewProps) {
  return <View style={[styles.card, style]} {...props} />;
}

export function Divider({ style }: { style?: ViewProps['style'] }) {
  return <View style={[styles.divider, style]} />;
}

// ── Tag ───────────────────────────────────────────────────────────────────

export type TagVariant = 'accent' | 'neutral' | 'outline';

export function Tag({ label, variant = 'neutral' }: { label: string; variant?: TagVariant }) {
  const { lang } = useLanguage();
  const styleFor: Record<TagVariant, { bg: string; fg: string; border?: string }> = {
    accent: { bg: color.accent100, fg: color.accent800 },
    neutral: { bg: color.neutral100, fg: color.neutral800 },
    outline: { bg: 'transparent', fg: color.accent, border: color.accent },
  };
  const v = styleFor[variant];
  return (
    <View
      style={[
        styles.tag,
        { backgroundColor: v.bg, borderColor: v.border ?? 'transparent', borderWidth: v.border ? 1 : 0 },
      ]}
    >
      <Text style={{ color: v.fg, fontSize: 11, fontFamily: bodyFont(lang) }}>{label}</Text>
    </View>
  );
}

// ── Buttons ───────────────────────────────────────────────────────────────

interface ButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
}

export function PrimaryButton({ label, onPress, disabled, loading, fullWidth = true }: ButtonProps) {
  const { lang } = useLanguage();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btnBase,
        { width: fullWidth ? '100%' : undefined },
        {
          borderColor: color.accent,
          backgroundColor: pressed ? color.accent200 : color.accent100,
          opacity: disabled ? 0.42 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color.accent800} />
      ) : (
        <Text style={{ fontFamily: headingFont(lang), fontWeight: lang === 'en' ? '600' : undefined, fontSize: 16, color: color.accent800 }}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function SecondaryButton({ label, onPress, disabled, loading, fullWidth = true }: ButtonProps) {
  const { lang } = useLanguage();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btnBase,
        { width: fullWidth ? '100%' : undefined },
        { borderColor: color.neutral900, backgroundColor: pressed ? color.neutral100 : color.white, opacity: disabled ? 0.42 : 1 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color.neutral900} />
      ) : (
        <Text style={{ fontFamily: headingFont(lang), fontWeight: lang === 'en' ? '600' : undefined, fontSize: 16, color: color.neutral900 }}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function GhostButton({ label, onPress, disabled }: ButtonProps) {
  const { lang } = useLanguage();
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={8}>
      <Text style={{ fontFamily: bodyFont(lang), fontSize: 12.5, color: color.accent700, textDecorationLine: 'underline' }}>{label}</Text>
    </Pressable>
  );
}

// ── Segmented control ────────────────────────────────────────────────────

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ key: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
}) {
  const { lang } = useLanguage();
  return (
    <View style={styles.segment}>
      {options.map((opt, i) => (
        <Pressable
          key={opt.key}
          onPress={() => onChange(opt.key)}
          style={{
            minHeight: 36,
            paddingHorizontal: 13,
            justifyContent: 'center',
            alignItems: 'center',
            borderLeftWidth: i === 0 ? 0 : 1,
            borderLeftColor: color.divider,
            backgroundColor: value === opt.key ? color.accent100 : color.white,
          }}
        >
          <Text style={{ fontFamily: bodyFont(lang), fontSize: 12, color: value === opt.key ? color.accent800 : color.neutral700 }}>
            {opt.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// ── Stat grid ─────────────────────────────────────────────────────────────

export function StatCell({ value, label, valueColor }: { value: string | number; label: string; valueColor?: string }) {
  const { lang } = useLanguage();
  return (
    <View style={{ flex: 1, paddingVertical: 14, alignItems: 'center' }}>
      <Text style={[{ fontFamily: headingFont(lang), fontSize: 28, color: valueColor ?? color.text }, tabularNums]}>{value}</Text>
      <Muted style={{ marginTop: 5, fontSize: 10.5 }}>{label}</Muted>
    </View>
  );
}

export function StatRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.statRow}>{children}</View>;
}

// ── Toast ─────────────────────────────────────────────────────────────────

export function Toast({ message }: { message: string }) {
  const { lang } = useLanguage();
  return (
    <View style={styles.toast}>
      <Text style={{ color: '#fff', fontFamily: bodyFont(lang), fontSize: 12.5 }}>{message}</Text>
    </View>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return <Text style={styles.errorNote}>{message}</Text>;
}

export function EmptyState({ title, note }: { title: string; note: string }) {
  return (
    <Card style={{ alignItems: 'center', paddingVertical: 34 }}>
      <Heading style={{ fontSize: 17 }}>{title}</Heading>
      <Muted style={{ marginTop: 6, textAlign: 'center' }}>{note}</Muted>
    </Card>
  );
}

export function LoadingBlock() {
  return (
    <View style={{ paddingVertical: 40, alignItems: 'center' }}>
      <ActivityIndicator color={color.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: color.divider, borderRadius: radius.md, padding: 16 },
  divider: { height: 1, backgroundColor: color.divider },
  tag: { alignSelf: 'flex-start', paddingVertical: 3, paddingHorizontal: 10, borderRadius: radius.sm },
  btnBase: {
    minHeight: 54,
    borderWidth: 1.5,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  // Segmented control and the stat grid carry dense data — square edges, like a ledger.
  segment: { flexDirection: 'row', borderWidth: 1, borderColor: color.divider, borderRadius: radius.none, overflow: 'hidden' },
  statRow: { flexDirection: 'row', borderWidth: 1, borderColor: color.divider, borderRadius: radius.none, overflow: 'hidden' },
  toast: {
    backgroundColor: color.neutral900,
    borderRadius: radius.md,
    paddingVertical: 13,
    paddingHorizontal: 15,
    ...shadow.md,
  },
  errorNote: { fontSize: 11.5, color: color.accent800, borderLeftWidth: 2, borderLeftColor: color.accent, paddingLeft: 10, lineHeight: 17 },
});
