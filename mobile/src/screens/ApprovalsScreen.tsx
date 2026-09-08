import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ScreenContainer } from '@/components/ScreenContainer';
import { Body, Card, EmptyState, Muted, PrimaryButton, SecondaryButton, Toast } from '@/components/ui';
import { useLanguage } from '@/state/LanguageContext';
import { leaveApi } from '@/api/endpoints';
import { ApiError } from '@/api/client';
import type { LeaveType } from '@/api/types';
import { color, headingFont } from '@/theme/tokens';
import { formatRange, pick } from '@/lib/format';

const TYPE_KEY: Record<LeaveType, 'annual' | 'sick' | 'personal'> = { ANNUAL: 'annual', SICK: 'sick', PERSONAL: 'personal' };

export function ApprovalsScreen() {
  const { lang, t } = useLanguage();
  const qc = useQueryClient();
  const [toast, setToast] = useState<string | null>(null);
  const pendingQ = useQuery({ queryKey: ['leave', 'pending'], queryFn: () => leaveApi.pending().then((r) => r.requests) });

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  const invalidate = () => qc.invalidateQueries({ queryKey: ['leave'] });
  const approveMut = useMutation({
    mutationFn: (id: string) => leaveApi.approve(id),
    onSuccess: (_data, id) => {
      invalidate();
      const req = pendingQ.data?.find((r) => r.id === id);
      flash(`${t('approvedToast')} · ${req?.user ? pick(lang, req.user.nameEn, req.user.nameLo) : ''}`);
    },
    onError: (e) => flash(e instanceof ApiError ? e.message : t('errorGeneric')),
  });
  const rejectMut = useMutation({
    mutationFn: (id: string) => leaveApi.reject(id),
    onSuccess: (_data, id) => {
      invalidate();
      const req = pendingQ.data?.find((r) => r.id === id);
      flash(`${t('rejectedToast')} · ${req?.user ? pick(lang, req.user.nameEn, req.user.nameLo) : ''}`);
    },
    onError: (e) => flash(e instanceof ApiError ? e.message : t('errorGeneric')),
  });

  const pending = pendingQ.data ?? [];

  return (
    <ScreenContainer title={t('tabAppr')}>
      {pending.length === 0 && pendingQ.isSuccess ? (
        <EmptyState title={t('allClear')} note={t('allClearNote')} />
      ) : (
        <>
          {pending.length > 0 ? <Muted>{`${pending.length} request${pending.length === 1 ? '' : 's'} waiting`}</Muted> : null}
          {pending.map((r) => (
            <Card key={r.id} style={{ gap: 11 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
                <View style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: color.divider, backgroundColor: color.neutral100, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontFamily: headingFont('en'), fontWeight: '600', fontSize: 12, color: color.neutral800 }}>{r.user?.initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Body style={{ fontSize: 13.5 }}>{r.user ? pick(lang, r.user.nameEn, r.user.nameLo) : ''}</Body>
                  <Muted style={{ marginTop: 2, fontSize: 11 }}>{t(TYPE_KEY[r.leaveType])}</Muted>
                </View>
                <Text style={{ fontFamily: headingFont('en'), fontSize: 20 }}>{r.workingDays}</Text>
              </View>
              <Body style={{ fontSize: 12, color: color.neutral800 }}>{formatRange(r.fromDate, r.toDate, lang)}</Body>
              <Muted>{r.reason || t('noReason')}</Muted>
              <View style={{ flexDirection: 'row', gap: 9 }}>
                <View style={{ flex: 1 }}>
                  <PrimaryButton label={t('approve')} onPress={() => approveMut.mutate(r.id)} loading={approveMut.isPending && approveMut.variables === r.id} />
                </View>
                <View style={{ flex: 1 }}>
                  <SecondaryButton label={t('reject')} onPress={() => rejectMut.mutate(r.id)} loading={rejectMut.isPending && rejectMut.variables === r.id} />
                </View>
              </View>
            </Card>
          ))}
        </>
      )}
      {toast ? <View style={{ position: 'absolute', left: 0, right: 0, bottom: 8 }}><Toast message={toast} /></View> : null}
    </ScreenContainer>
  );
}
