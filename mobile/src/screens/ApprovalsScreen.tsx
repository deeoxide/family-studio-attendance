import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ScreenContainer } from '@/components/ScreenContainer';
import { Body, Card, EmptyState, Muted, PrimaryButton, SecondaryButton, Segmented, Toast } from '@/components/ui';
import { useLanguage } from '@/state/LanguageContext';
import { leaveApi, attendanceApi } from '@/api/endpoints';
import { ApiError } from '@/api/client';
import type { LeaveType } from '@/api/types';
import { color, headingFont } from '@/theme/tokens';
import { formatRange, formatDateWeekdayShort, hhmm, pick } from '@/lib/format';

const TYPE_KEY: Record<LeaveType, 'annual' | 'sick' | 'personal'> = { ANNUAL: 'annual', SICK: 'sick', PERSONAL: 'personal' };
type Tab = 'leave' | 'attendance';

export function ApprovalsScreen() {
  const { lang, t } = useLanguage();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('leave');
  const [toast, setToast] = useState<string | null>(null);
  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  const leaveQ = useQuery({ queryKey: ['leave', 'pending'], queryFn: () => leaveApi.pending().then((r) => r.requests) });
  const corrQ = useQuery({
    queryKey: ['attendance', 'corrections', 'pending'],
    queryFn: () => attendanceApi.pendingCorrections().then((r) => r.corrections),
  });

  const invalidateLeave = () => qc.invalidateQueries({ queryKey: ['leave'] });
  const invalidateCorr = () => {
    qc.invalidateQueries({ queryKey: ['attendance', 'corrections'] });
    qc.invalidateQueries({ queryKey: ['attendance'] });
  };

  const approveLeave = useMutation({
    mutationFn: (id: string) => leaveApi.approve(id),
    onSuccess: () => { invalidateLeave(); flash(t('approvedToast')); },
    onError: (e) => flash(e instanceof ApiError ? e.message : t('errorGeneric')),
  });
  const rejectLeave = useMutation({
    mutationFn: (id: string) => leaveApi.reject(id),
    onSuccess: () => { invalidateLeave(); flash(t('rejectedToast')); },
    onError: (e) => flash(e instanceof ApiError ? e.message : t('errorGeneric')),
  });
  const approveCorr = useMutation({
    mutationFn: (id: string) => attendanceApi.approveCorrection(id),
    onSuccess: () => { invalidateCorr(); flash(t('approvedToast')); },
    onError: (e) => flash(e instanceof ApiError ? e.message : t('errorGeneric')),
  });
  const rejectCorr = useMutation({
    mutationFn: (id: string) => attendanceApi.rejectCorrection(id),
    onSuccess: () => { invalidateCorr(); flash(t('rejectedToast')); },
    onError: (e) => flash(e instanceof ApiError ? e.message : t('errorGeneric')),
  });

  const leave = leaveQ.data ?? [];
  const corrections = corrQ.data ?? [];

  return (
    <ScreenContainer title={t('tabAppr')}>
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { key: 'leave', label: `${t('leaveApprovals')}${leave.length ? ` (${leave.length})` : ''}` },
          { key: 'attendance', label: `${t('attendanceCorrections')}${corrections.length ? ` (${corrections.length})` : ''}` },
        ]}
      />

      {tab === 'leave' ? (
        leave.length === 0 && leaveQ.isSuccess ? (
          <EmptyState title={t('allClear')} note={t('allClearNote')} />
        ) : (
          leave.map((r) => (
            <Card key={r.id} style={{ gap: 11 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
                <Avatar initials={r.user?.initials} />
                <View style={{ flex: 1 }}>
                  <Body style={{ fontSize: 13.5 }}>{r.user ? pick(lang, r.user.nameEn, r.user.nameLo) : ''}</Body>
                  <Muted style={{ marginTop: 2, fontSize: 11 }}>{t(TYPE_KEY[r.leaveType])}</Muted>
                </View>
                <Text style={{ fontFamily: headingFont('en'), fontSize: 20 }}>{r.workingDays}</Text>
              </View>
              <Body style={{ fontSize: 12, color: color.neutral800 }}>{formatRange(r.fromDate, r.toDate, lang)}</Body>
              <Muted>{r.reason || t('noReason')}</Muted>
              <Actions
                onApprove={() => approveLeave.mutate(r.id)}
                onReject={() => rejectLeave.mutate(r.id)}
                approving={approveLeave.isPending && approveLeave.variables === r.id}
                rejecting={rejectLeave.isPending && rejectLeave.variables === r.id}
              />
            </Card>
          ))
        )
      ) : corrections.length === 0 && corrQ.isSuccess ? (
        <EmptyState title={t('noCorrections')} note={t('allClearNote')} />
      ) : (
        corrections.map((c) => {
          const times = [c.checkInAt ? `${t('inShort')} ${hhmm(c.checkInAt)}` : null, c.checkOutAt ? `${t('outShort')} ${hhmm(c.checkOutAt)}` : null]
            .filter(Boolean)
            .join(' · ');
          return (
            <Card key={c.id} style={{ gap: 11 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
                <Avatar initials={c.user?.initials} />
                <View style={{ flex: 1 }}>
                  <Body style={{ fontSize: 13.5 }}>{c.user ? pick(lang, c.user.nameEn, c.user.nameLo) : ''}</Body>
                  <Muted style={{ marginTop: 2, fontSize: 11 }}>{formatDateWeekdayShort(c.date, lang)}</Muted>
                </View>
              </View>
              <Body style={{ fontSize: 12, color: color.neutral800 }}>{times}</Body>
              <Muted>{c.reason || t('noReason')}</Muted>
              <Actions
                onApprove={() => approveCorr.mutate(c.id)}
                onReject={() => rejectCorr.mutate(c.id)}
                approving={approveCorr.isPending && approveCorr.variables === c.id}
                rejecting={rejectCorr.isPending && rejectCorr.variables === c.id}
              />
            </Card>
          );
        })
      )}

      {toast ? <View style={{ position: 'absolute', left: 0, right: 0, bottom: 8 }}><Toast message={toast} /></View> : null}
    </ScreenContainer>
  );
}

function Avatar({ initials }: { initials?: string }) {
  return (
    <View style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: color.divider, backgroundColor: color.neutral100, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: headingFont('en'), fontWeight: '600', fontSize: 12, color: color.neutral800 }}>{initials}</Text>
    </View>
  );
}

function Actions({
  onApprove,
  onReject,
  approving,
  rejecting,
}: {
  onApprove: () => void;
  onReject: () => void;
  approving: boolean;
  rejecting: boolean;
}) {
  const { t } = useLanguage();
  return (
    <View style={{ flexDirection: 'row', gap: 9 }}>
      <View style={{ flex: 1 }}>
        <PrimaryButton label={t('approve')} onPress={onApprove} loading={approving} />
      </View>
      <View style={{ flex: 1 }}>
        <SecondaryButton label={t('reject')} onPress={onReject} loading={rejecting} />
      </View>
    </View>
  );
}
