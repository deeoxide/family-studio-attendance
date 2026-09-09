import React, { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/state/LanguageContext';
import { attendanceApi } from '@/api/endpoints';
import { ApiError } from '@/api/client';
import { color, headingFont, shadow } from '@/theme/tokens';
import { PrimaryButton, ErrorNote, Muted } from '@/components/ui';
import { TextField } from '@/components/Field';
import { DateField } from '@/components/DateField';
import { todayISODate } from '@/lib/date';

const HHMM = /^\d{2}:\d{2}$/;

/**
 * HR / Admin: set or fix one day's check-in / check-out for an employee, no
 * approval step. Leave a box blank to keep whatever the record already has.
 */
export function CorrectAttendanceModal({
  visible,
  onClose,
  personId,
  personName,
  onDone,
}: {
  visible: boolean;
  onClose: () => void;
  personId: string;
  personName: string;
  onDone: (msg: string) => void;
}) {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [date, setDate] = useState(todayISODate());
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: () =>
      attendanceApi.setManual({
        userId: personId,
        date,
        checkIn: checkIn.trim() ? checkIn.trim() : undefined,
        checkOut: checkOut.trim() ? checkOut.trim() : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance'] });
      setCheckIn('');
      setCheckOut('');
      setError(null);
      onDone(t('attendanceSaved'));
      onClose();
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : t('errorGeneric')),
  });

  const submit = () => {
    setError(null);
    if (!checkIn.trim() && !checkOut.trim()) return setError(t('timeHint'));
    if (checkIn.trim() && !HHMM.test(checkIn.trim())) return setError(t('timeHint'));
    if (checkOut.trim() && !HHMM.test(checkOut.trim())) return setError(t('timeHint'));
    mut.mutate();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(32,31,29,0.32)' }} onPress={onClose} />
        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 14, borderTopRightRadius: 14, padding: 20, paddingBottom: 34, gap: 12, ...shadow.lg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Text style={{ fontFamily: headingFont('en'), fontWeight: '600', fontSize: 20, color: color.text }}>{t('correctAttendance')}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={{ fontSize: 20, color: color.neutral700 }}>×</Text>
            </Pressable>
          </View>
          <Muted style={{ marginTop: -4 }}>{personName}</Muted>

          <View style={{ marginBottom: 2 }}>
            <DateField label={t('forDay')} value={date} onChange={setDate} />
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <TextField label={t('checkInTime')} value={checkIn} onChangeText={setCheckIn} placeholder="09:05" keyboardType="numbers-and-punctuation" />
            </View>
            <View style={{ flex: 1 }}>
              <TextField label={t('checkOutTime')} value={checkOut} onChangeText={setCheckOut} placeholder="18:00" keyboardType="numbers-and-punctuation" />
            </View>
          </View>
          <Muted style={{ marginTop: -6 }}>{t('timeHint')}</Muted>

          {error ? <ErrorNote message={error} /> : null}
          <PrimaryButton label={t('saveChanges')} loading={mut.isPending} onPress={submit} />
        </View>
      </View>
    </Modal>
  );
}
