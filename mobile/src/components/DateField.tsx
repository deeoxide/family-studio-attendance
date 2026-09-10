import React, { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { color, radius, bodyFont } from '@/theme/tokens';
import { useLanguage } from '@/state/LanguageContext';
import { fromISODate, toISODate } from '@/lib/date';
import { formatDateShort } from '@/lib/format';

export function DateField({ label, value, onChange }: { label: string; value: string; onChange: (iso: string) => void }) {
  const { lang } = useLanguage();
  const [open, setOpen] = useState(false);

  const labelStyle = { fontFamily: bodyFont(lang), fontSize: 12, color: color.neutral700, marginBottom: 6 } as const;

  // @react-native-community/datetimepicker renders nothing on web (it logs
  // "DateTimePicker is not supported on: web"), so the leave and missed-punch
  // date fields were dead there. Fall back to the browser's native date input,
  // which already speaks our YYYY-MM-DD format.
  if (Platform.OS === 'web') {
    return (
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={labelStyle}>{label}</Text>
        {React.createElement('input', {
          type: 'date',
          value,
          onChange: (e: { target: { value: string } }) => onChange(e.target.value),
          style: {
            boxSizing: 'border-box',
            width: '100%',
            minHeight: 46,
            border: `1px solid ${color.divider}`,
            borderRadius: radius.md,
            padding: '0 12px',
            fontSize: 14,
            fontFamily: 'inherit',
            color: color.text,
            background: color.white,
          },
        })}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text style={labelStyle}>{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        style={{ minHeight: 46, borderWidth: 1, borderColor: color.divider, borderRadius: radius.md, justifyContent: 'center', paddingHorizontal: 12 }}
      >
        <Text style={{ fontFamily: bodyFont(lang), fontSize: 14, color: color.text }}>{formatDateShort(value, lang)}</Text>
      </Pressable>
      {open ? (
        <DateTimePicker
          value={fromISODate(value)}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={(_, date) => {
            setOpen(Platform.OS === 'ios');
            if (date) onChange(toISODate(date));
          }}
        />
      ) : null}
    </View>
  );
}
