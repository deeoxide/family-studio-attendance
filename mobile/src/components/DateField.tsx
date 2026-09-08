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

  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: color.neutral700, marginBottom: 6 }}>{label}</Text>
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
