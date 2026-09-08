import React, { useMemo, useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/state/LanguageContext';
import { leaveApi } from '@/api/endpoints';
import { ApiError } from '@/api/client';
import type { Holiday, LeaveType } from '@/api/types';
import { color, radius, bodyFont, headingFont, shadow } from '@/theme/tokens';
import { PrimaryButton, ErrorNote, Muted } from '@/components/ui';
import { DateField } from '@/components/DateField';
import { workingDaysBetween } from '@/lib/workingDays';
import { todayISODate } from '@/lib/date';

const TYPES: LeaveType[] = ['ANNUAL', 'SICK', 'PERSONAL'];
const TYPE_KEY: Record<LeaveType, 'annual' | 'sick' | 'personal'> = { ANNUAL: 'annual', SICK: 'sick', PERSONAL: 'personal' };

export function ApplyLeaveModal({
  visible,
  onClose,
  holidays,
  onSubmitted,
}: {
  visible: boolean;
  onClose: () => void;
  holidays: Holiday[];
  onSubmitted: (msg: string) => void;
}) {
  const { lang, t } = useLanguage();
  const qc = useQueryClient();
  const [leaveType, setLeaveType] = useState<LeaveType>('ANNUAL');
  const today = todayISODate();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const holidayISO = useMemo(() => holidays.map((h) => h.date), [holidays]);
  const wd = useMemo(() => workingDaysBetween(from, to, holidayISO), [from, to, holidayISO]);

  const calcNote = !wd
    ? t('noWorkingDays')
    : (() => {
        const parts: string[] = [];
        if (wd.weekendDays) parts.push(`${wd.weekendDays} weekend day${wd.weekendDays > 1 ? 's' : ''}`);
        if (wd.holidayDays) parts.push(`${wd.holidayDays} public holiday${wd.holidayDays > 1 ? 's' : ''}`);
        return parts.length ? `Working days deducted, excluding ${parts.join(' and ')}.` : 'Working days deducted from your balance.';
      })();

  const applyMut = useMutation({
    mutationFn: () => leaveApi.apply(leaveType, from, to, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave'] });
      onSubmitted(t('leaveSent'));
      setReason('');
      setError(null);
      onClose();
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : t('errorGeneric')),
  });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(32,31,29,0.32)' }} onPress={onClose} />
        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 14, borderTopRightRadius: 14, padding: 20, paddingBottom: 34, gap: 14, maxHeight: '85%', ...shadow.lg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Text style={{ fontFamily: headingFont(lang), fontWeight: '600', fontSize: 20, color: color.text }}>{t('applyLeave')}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={{ fontSize: 20, color: color.neutral700 }}>×</Text>
            </Pressable>
          </View>

          <View>
            <Text style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: color.neutral700, marginBottom: 7 }}>{t('type')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {TYPES.map((ty) => {
                const active = leaveType === ty;
                return (
                  <Pressable
                    key={ty}
                    onPress={() => setLeaveType(ty)}
                    style={{
                      minHeight: 44,
                      paddingHorizontal: 14,
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: active ? color.accent : color.divider,
                      backgroundColor: active ? color.accent100 : 'transparent',
                      borderRadius: radius.md,
                    }}
                  >
                    <Text style={{ fontFamily: bodyFont(lang), fontSize: 12.5, color: active ? color.accent800 : color.neutral800 }}>{t(TYPE_KEY[ty])}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <DateField label={t('from')} value={from} onChange={(v) => { setFrom(v); if (v > to) setTo(v); }} />
            <DateField label={t('to')} value={to} onChange={setTo} />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 13, borderWidth: 1, borderColor: color.divider, borderRadius: radius.md, backgroundColor: color.neutral100 }}>
            <Text style={{ flexShrink: 1, fontSize: 11.5, color: color.neutral800, lineHeight: 16 }}>{calcNote}</Text>
            <Text style={{ fontFamily: headingFont(lang), fontSize: 24, color: color.text }}>{wd ? wd.days : '—'}</Text>
          </View>

          <View>
            <Text style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: color.neutral700, marginBottom: 6 }}>{t('reason')}</Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={2}
              style={{ minHeight: 64, borderWidth: 1, borderColor: color.divider, borderRadius: radius.md, padding: 10, fontFamily: bodyFont(lang), fontSize: 14, textAlignVertical: 'top' }}
            />
          </View>

          {error ? <ErrorNote message={error} /> : null}

          <PrimaryButton
            label={t('sendApproval')}
            loading={applyMut.isPending}
            onPress={() => {
              setError(null);
              applyMut.mutate();
            }}
          />
          <Muted style={{ textAlign: 'center' }}>{t('approverNote')}</Muted>
        </View>
      </View>
    </Modal>
  );
}
