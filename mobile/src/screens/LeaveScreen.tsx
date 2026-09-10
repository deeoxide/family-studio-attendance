import React, { useState } from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ScreenContainer } from '@/components/ScreenContainer';
import { Body, Card, Heading, Kicker, Muted, PrimaryButton, Segmented, Tag } from '@/components/ui';
import { ApplyLeaveModal } from '@/components/ApplyLeaveModal';
import { useLanguage } from '@/state/LanguageContext';
import { leaveApi } from '@/api/endpoints';
import type { LeaveStatus, LeaveType } from '@/api/types';
import { color, headingFont } from '@/theme/tokens';
import { formatRange } from '@/lib/format';
import { groupHolidays, nextUpcoming, daysUntil } from '@/lib/holidays';
import { todayISODate } from '@/lib/date';

const TYPE_KEY: Record<LeaveType, 'annual' | 'sick' | 'personal' | 'unpaid'> = { ANNUAL: 'annual', SICK: 'sick', PERSONAL: 'personal', UNPAID: 'unpaid' };
const TYPE_NOTE_KEY: Record<LeaveType, 'annualNote' | 'sickNote' | 'personalNote' | 'unpaidNote'> = { ANNUAL: 'annualNote', SICK: 'sickNote', PERSONAL: 'personalNote', UNPAID: 'unpaidNote' };
const STATUS_VARIANT: Record<LeaveStatus, 'outline' | 'accent' | 'neutral'> = { PENDING: 'outline', APPROVED: 'accent', REJECTED: 'neutral' };
const STATUS_KEY: Record<LeaveStatus, 'pending' | 'approved' | 'rejected'> = { PENDING: 'pending', APPROVED: 'approved', REJECTED: 'rejected' };

type LeaveTab = 'balance' | 'holidays' | 'requests';

export function LeaveScreen() {
  const { lang, t } = useLanguage();
  const [tab, setTab] = useState<LeaveTab>('balance');
  const [applyOpen, setApplyOpen] = useState(false);

  const balanceQ = useQuery({ queryKey: ['leave', 'balance'], queryFn: () => leaveApi.balance().then((r) => r.balances) });
  const holidaysQ = useQuery({ queryKey: ['leave', 'holidays'], queryFn: () => leaveApi.holidays().then((r) => r.holidays) });
  const requestsQ = useQuery({ queryKey: ['leave', 'requests'], queryFn: () => leaveApi.requests().then((r) => r.requests) });

  const groups = holidaysQ.data ? groupHolidays(holidaysQ.data, lang) : [];
  const next = nextUpcoming(groups, todayISODate());

  return (
    <ScreenContainer title={t('tabLeave')}>
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { key: 'balance', label: t('balance') },
          { key: 'holidays', label: t('holidays') },
          { key: 'requests', label: t('requests') },
        ]}
      />

      {tab === 'balance' ? (
        <View style={{ gap: 14 }}>
          {(balanceQ.data ?? []).map((b) => (
            <Card key={b.leaveType}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Heading>{t(TYPE_KEY[b.leaveType])}</Heading>
                <Body style={{ fontSize: 11.5, color: color.neutral700 }}>{`${b.usedDays} of ${b.totalDays} used`}</Body>
              </View>
              <View style={{ height: 6, backgroundColor: color.neutral200, borderRadius: 99, marginVertical: 10, overflow: 'hidden' }}>
                <View style={{ height: '100%', width: `${Math.min(100, Math.round((b.usedDays / b.totalDays) * 100))}%`, backgroundColor: color.accent }} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Muted style={{ flexShrink: 1 }}>{t(TYPE_NOTE_KEY[b.leaveType])}</Muted>
                <Body style={{ fontFamily: headingFont('en'), fontSize: 22, color: color.accent800 }}>{`${b.remainingDays} left`}</Body>
              </View>
            </Card>
          ))}
          <PrimaryButton label={t('applyLeave')} onPress={() => setApplyOpen(true)} />
        </View>
      ) : null}

      {tab === 'holidays' ? (
        <View style={{ gap: 14 }}>
          {next ? (
            <Card style={{ borderColor: color.accent200, backgroundColor: color.accent100 }}>
              <Kicker>{t('nextHoliday')}</Kicker>
              <Heading style={{ fontSize: 21, marginTop: 5, color: color.accent900 }}>{next.name}</Heading>
              <Body style={{ fontSize: 12, marginTop: 4, color: color.accent800 }}>
                {next.dateLabel} · in {daysUntil(next.fromISO, todayISODate())} days
              </Body>
            </Card>
          ) : null}
          <Card style={{ padding: 0 }}>
            <View style={{ padding: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: color.divider }}>
              <Kicker>{t('holidays2026')}</Kicker>
            </View>
            {groups.map((g, i) => (
              <View key={g.key} style={{ flexDirection: 'row', gap: 13, padding: 13, paddingHorizontal: 16, borderBottomWidth: i === groups.length - 1 ? 0 : 1, borderBottomColor: color.divider }}>
                <Body style={{ width: 78, fontFamily: headingFont('en'), fontSize: 13, color: color.accent700 }}>{g.dateLabel}</Body>
                <View style={{ flex: 1 }}>
                  <Body style={{ fontSize: 13 }}>{g.name}</Body>
                  <Muted style={{ marginTop: 2, fontSize: 11 }}>{g.note}</Muted>
                </View>
                <Muted style={{ fontSize: 11, color: color.neutral600 }}>{g.days === 1 ? '1 day' : `${g.days} days`}</Muted>
              </View>
            ))}
          </Card>
          <Muted>{t('holidayNote')}</Muted>
        </View>
      ) : null}

      {tab === 'requests' ? (
        <View style={{ gap: 12 }}>
          {(requestsQ.data ?? []).map((r) => (
            <Card key={r.id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Heading>{t(TYPE_KEY[r.leaveType])}</Heading>
                <Tag label={t(STATUS_KEY[r.status])} variant={STATUS_VARIANT[r.status]} />
              </View>
              <Body style={{ fontSize: 12, marginTop: 6, color: color.neutral800 }}>
                {formatRange(r.fromDate, r.toDate, lang)} · {r.workingDays} {r.workingDays === 1 ? t('workingDay') : t('workingDays')}
              </Body>
              <Muted style={{ marginTop: 4 }}>{r.reason || t('noReason')}</Muted>
            </Card>
          ))}
          <PrimaryButton label={t('applyLeave')} onPress={() => setApplyOpen(true)} />
        </View>
      ) : null}

      <ApplyLeaveModal
        visible={applyOpen}
        onClose={() => setApplyOpen(false)}
        holidays={holidaysQ.data ?? []}
        onSubmitted={() => setTab('requests')}
      />
    </ScreenContainer>
  );
}
