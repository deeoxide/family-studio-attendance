import React, { useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/state/LanguageContext';
import { useAuth } from '@/state/AuthContext';
import { attendanceApi } from '@/api/endpoints';
import { ApiError } from '@/api/client';
import type { OutingCategory } from '@/api/types';
import { color, radius, bodyFont, headingFont, shadow } from '@/theme/tokens';
import { PrimaryButton, ErrorNote, Muted } from '@/components/ui';
import { DateField } from '@/components/DateField';
import { todayISODate } from '@/lib/date';

const HHMM = /^\d{2}:\d{2}$/;
const CATEGORIES: OutingCategory[] = ['MEETING', 'CLIENT', 'ERRAND', 'DOCUMENT', 'OTHER'];
const CATEGORY_KEY: Record<OutingCategory, 'outMeeting' | 'outClient' | 'outErrand' | 'outDocument' | 'outOther'> = {
  MEETING: 'outMeeting',
  CLIENT: 'outClient',
  ERRAND: 'outErrand',
  DOCUMENT: 'outDocument',
  OTHER: 'outOther',
};

/** Log an outing during the shift. Employees send it to their manager; managers self-log and HR is informed. */
export function OutingModal({ visible, onClose, onDone }: { visible: boolean; onClose: () => void; onDone: (m: string) => void }) {
  const { lang, t } = useLanguage();
  const { user } = useAuth();
  const qc = useQueryClient();
  const selfLogged = !!user && user.role !== 'EMPLOYEE';

  const [date, setDate] = useState(todayISODate());
  const [fromTime, setFromTime] = useState('');
  const [toTime, setToTime] = useState('');
  const [category, setCategory] = useState<OutingCategory>('CLIENT');
  const [purpose, setPurpose] = useState('');
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setFromTime('');
    setToTime('');
    setPurpose('');
    setError(null);
  };

  const mut = useMutation({
    mutationFn: () => attendanceApi.submitOuting({ date, fromTime: fromTime.trim(), toTime: toTime.trim(), category, purpose: purpose.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', 'outings'] });
      onDone(selfLogged ? t('outingLogged') : t('outingSent'));
      reset();
      onClose();
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : t('errorGeneric')),
  });

  const submit = () => {
    setError(null);
    if (!HHMM.test(fromTime.trim()) || !HHMM.test(toTime.trim())) return setError(t('outingTimeHint'));
    if (toTime.trim() <= fromTime.trim()) return setError(t('outingOrderHint'));
    mut.mutate();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(32,31,29,0.32)' }} onPress={onClose} />
        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 14, borderTopRightRadius: 14, padding: 20, paddingBottom: 34, gap: 13, maxHeight: '88%', ...shadow.lg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Text style={{ fontFamily: headingFont(lang), fontWeight: '600', fontSize: 20, color: color.text }}>{t('logOuting')}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={{ fontSize: 20, color: color.neutral700 }}>×</Text>
            </Pressable>
          </View>

          <View>
            <Text style={{ fontFamily: bodyFont(lang), fontSize: 12, color: color.neutral700, marginBottom: 7 }}>{t('outingKind')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {CATEGORIES.map((c) => {
                const active = category === c;
                return (
                  <Pressable
                    key={c}
                    onPress={() => setCategory(c)}
                    style={{
                      minHeight: 42,
                      paddingHorizontal: 13,
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: active ? color.accent : color.divider,
                      backgroundColor: active ? color.accent100 : 'transparent',
                      borderRadius: radius.md,
                    }}
                  >
                    <Text style={{ fontFamily: bodyFont(lang), fontSize: 12.5, color: active ? color.accent800 : color.neutral800 }}>{t(CATEGORY_KEY[c])}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={{ marginBottom: 2 }}>
            <DateField label={t('forDay')} value={date} onChange={setDate} />
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: bodyFont(lang), fontSize: 12, color: color.neutral700, marginBottom: 6 }}>{t('outingFrom')}</Text>
              <TextInput
                value={fromTime}
                onChangeText={setFromTime}
                placeholder="14:00"
                placeholderTextColor={color.neutral500}
                keyboardType="numbers-and-punctuation"
                style={timeInput(lang)}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: bodyFont(lang), fontSize: 12, color: color.neutral700, marginBottom: 6 }}>{t('outingBackBy')}</Text>
              <TextInput
                value={toTime}
                onChangeText={setToTime}
                placeholder="16:30"
                placeholderTextColor={color.neutral500}
                keyboardType="numbers-and-punctuation"
                style={timeInput(lang)}
              />
            </View>
          </View>

          <View>
            <Text style={{ fontFamily: bodyFont(lang), fontSize: 12, color: color.neutral700, marginBottom: 6 }}>{t('outingPurpose')}</Text>
            <TextInput
              value={purpose}
              onChangeText={setPurpose}
              multiline
              numberOfLines={2}
              placeholder={t('outingPurposeHint')}
              placeholderTextColor={color.neutral500}
              style={{ minHeight: 60, borderWidth: 1, borderColor: color.divider, borderRadius: radius.md, padding: 10, fontFamily: bodyFont(lang), fontSize: 14, color: color.text, textAlignVertical: 'top' }}
            />
          </View>

          {error ? <ErrorNote message={error} /> : null}

          <PrimaryButton label={selfLogged ? t('logOutingCta') : t('sendApproval')} loading={mut.isPending} onPress={submit} />
          <Muted style={{ textAlign: 'center' }}>{selfLogged ? t('outingLoggedNote') : t('outingApprovalNote')}</Muted>
        </View>
      </View>
    </Modal>
  );
}

const timeInput = (lang: 'en' | 'lo') => ({
  minHeight: 46,
  borderWidth: 1,
  borderColor: color.divider,
  borderRadius: radius.md,
  paddingHorizontal: 12,
  fontFamily: bodyFont(lang),
  fontSize: 14,
  color: color.text,
});
