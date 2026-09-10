import React from 'react';
import { Text, TextInput, View, type KeyboardTypeOptions } from 'react-native';
import { color, radius, bodyFont, tabularNums } from '@/theme/tokens';
import { useLanguage } from '@/state/LanguageContext';

/** Labelled single-line text input, shared by every form in the app. */
export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  hint,
  keyboardType,
  autoCapitalize,
  secureTextEntry,
  multiline,
  editable = true,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  hint?: string;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words';
  secureTextEntry?: boolean;
  multiline?: boolean;
  editable?: boolean;
}) {
  const { lang } = useLanguage();
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontFamily: bodyFont(lang), fontSize: 12, color: color.neutral700, marginBottom: 6 }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={color.neutral500}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        editable={editable}
        style={[
          {
            minHeight: multiline ? 64 : 48,
            borderWidth: 1,
            borderColor: color.divider,
            borderRadius: radius.md,
            paddingHorizontal: 12,
            paddingTop: multiline ? 10 : 0,
            fontFamily: bodyFont(lang),
            fontSize: 14,
            color: editable ? color.text : color.neutral600,
            backgroundColor: editable ? color.white : color.neutral100,
            textAlignVertical: multiline ? 'top' : 'center',
          },
          tabularNums,
        ]}
      />
      {hint ? <Text style={{ fontSize: 10.5, color: color.neutral600, marginTop: 4 }}>{hint}</Text> : null}
    </View>
  );
}

/** A row of tappable choices (system role, leave type, …). */
export function ChoiceRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ key: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
}) {
  const { lang } = useLanguage();
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontFamily: bodyFont(lang), fontSize: 12, color: color.neutral700, marginBottom: 7 }}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((opt) => {
          const active = value === opt.key;
          return (
            <Text
              key={opt.key}
              onPress={() => onChange(opt.key)}
              style={{
                fontFamily: bodyFont(lang),
                fontSize: 12.5,
                overflow: 'hidden',
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderWidth: 1,
                borderRadius: radius.md,
                borderColor: active ? color.accent : color.divider,
                backgroundColor: active ? color.accent100 : 'transparent',
                color: active ? color.accent800 : color.neutral800,
              }}
            >
              {opt.label}
            </Text>
          );
        })}
      </View>
    </View>
  );
}
