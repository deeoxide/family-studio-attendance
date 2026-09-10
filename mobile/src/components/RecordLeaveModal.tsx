import React, { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/state/LanguageContext';
import { leaveApi } from '@/api/endpoints';
import { ApiError } from '@/api/client';
import type { LeaveType } from '@/api/types';
import { color, radius, headingFont, shadow } from '@/theme/tokens';
import { PrimaryButton, ErrorNote, Muted } from '@/components/ui';
import { TextField, ChoiceRow } from '@/components/Field';
import { DateField } from '@/components/DateField';
import { todayISODate } from '@/lib/date';

const TYPE_KEY: Record<LeaveType, 'annual' | 'sick' | 'personal' | 'unpaid'> = { ANNUAL: 'annual', SICK: 'sick', PERSONAL: 'personal', UNPAID: 'unpaid' };

/** HR/Admin (anyone) or a manager (their report): log leave that is already approved. */
export function RecordLeaveModal({
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
  const { lang, t } = useLanguage();
  const qc = useQueryClient();
  const today = todayISODate();
  const [leaveType, setLeaveType] = useState<LeaveType>('ANNUAL');
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: () => leaveApi.record({ userId: personId, leaveType, from, to, reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave'] });
      qc.invalidateQueries({ queryKey: ['people'] });
      qc.invalidateQueries({ queryKey: ['person', personId] });
      setReason('');
      setError(null);
      onDone(t('leaveRecorded'));
      onClose();
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : t('errorGeneric')),
  });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(32,31,29,0.32)' }} onPress={onClose} />
        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 14, borderTopRightRadius: 14, padding: 20, paddingBottom: 34, gap: 12, maxHeight: '88%', ...shadow.lg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Text style={{ fontFamily: headingFont(lang), fontWeight: '600', fontSize: 20, color: color.text }}>{t('recordLeave')}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={{ fontSize: 20, color: color.neutral700 }}>×</Text>
            </Pressable>
          </View>
          <Muted style={{ marginTop: -4 }}>{personName}</Muted>

          <ChoiceRow
            label={t('type')}
            value={leaveType}
            onChange={setLeaveType}
            options={(['ANNUAL', 'SICK', 'PERSONAL'] as LeaveType[]).map((ty) => ({ key: ty, label: t(TYPE_KEY[ty]) }))}
          />

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <DateField label={t('from')} value={from} onChange={(v) => { setFrom(v); if (v > to) setTo(v); }} />
            <DateField label={t('to')} value={to} onChange={setTo} />
          </View>

          <TextField label={t('reason')} value={reason} onChangeText={setReason} multiline />

          {error ? <ErrorNote message={error} /> : null}
          <PrimaryButton label={t('recordLeave')} loading={mut.isPending} onPress={() => { setError(null); mut.mutate(); }} />
          <Muted style={{ textAlign: 'center' }}>{t('recordLeaveNote')}</Muted>
        </View>
      </View>
    </Modal>
  );
}
