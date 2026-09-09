import React, { useEffect, useState } from 'react';
import { RefreshControl, Text, View, type DimensionValue } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ScreenContainer } from '@/components/ScreenContainer';
import { Body, Card, Divider, ErrorNote, Heading, Kicker, Muted, PrimaryButton, SecondaryButton, StatCell, StatRow, Tag, Toast } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { MissedPunchModal } from '@/components/MissedPunchModal';
import { useLanguage } from '@/state/LanguageContext';
import { attendanceApi } from '@/api/endpoints';
import { ApiError } from '@/api/client';
import type { AttendanceSummary, CorrectionStatus } from '@/api/types';
import { useGeofence } from '@/hooks/useGeofence';
import { color, headingFont, bodyFont } from '@/theme/tokens';
import { elapsedClock, formatDateWeekdayShort, hhmm, hoursMinutes, lak, minutesToClock } from '@/lib/format';
import { punctualityStyle } from '@/lib/punctuality';

export function AttendanceScreen() {
  const { lang, t } = useLanguage();
  const qc = useQueryClient();
  const [toast, setToast] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [punchOpen, setPunchOpen] = useState(false);

  const officeQ = useQuery({ queryKey: ['office'], queryFn: () => attendanceApi.office().then((r) => r.office) });
  const todayQ = useQuery({ queryKey: ['attendance', 'today'], queryFn: () => attendanceApi.today() });
  const summaryQ = useQuery({ queryKey: ['attendance', 'summary'], queryFn: attendanceApi.summary });
  const historyQ = useQuery({ queryKey: ['attendance', 'history'], queryFn: () => attendanceApi.history(4).then((r) => r.records) });
  const correctionsQ = useQuery({
    queryKey: ['attendance', 'corrections'],
    queryFn: () => attendanceApi.myCorrections().then((r) => r.corrections),
  });

  const geo = useGeofence(officeQ.data);

  const record = todayQ.data?.record ?? null;
  const status: 'out' | 'in' | 'done' = !record?.checkInAt ? 'out' : !record.checkOutAt ? 'in' : 'done';

  useEffect(() => {
    if (status !== 'in') return;
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [status]);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }

  const invalidateAttendance = () => {
    qc.invalidateQueries({ queryKey: ['attendance'] });
  };

  const checkInMut = useMutation({
    mutationFn: () => attendanceApi.checkIn(geo.coords!.lat, geo.coords!.lng),
    onSuccess: ({ record: r }) => {
      invalidateAttendance();
      flash(`${t('checkedInAt')} ${hhmm(r.checkInAt)}`);
    },
    onError: (e) => flash(e instanceof ApiError ? e.message : t('errorGeneric')),
  });
  const checkOutMut = useMutation({
    mutationFn: () => attendanceApi.checkOut(geo.coords!.lat, geo.coords!.lng),
    onSuccess: ({ record: r }) => {
      invalidateAttendance();
      flash(`${t('checkedOutAt')} ${hhmm(r.checkOutAt)}`);
    },
    onError: (e) => flash(e instanceof ApiError ? e.message : t('errorGeneric')),
  });

  const office = officeQ.data;
  const distance = geo.distance;
  const outOfRange = office != null && distance != null ? distance > office.radiusM : true;
  const hasFix = distance != null;
  const distColor = !hasFix ? color.neutral600 : outOfRange ? color.neutral900 : color.accent800;
  const radiusPct: DimensionValue = office ? `${(Math.min(office.radiusM, 40) / 40) * 100}%` : '25%';
  const markerPct: DimensionValue = `${(Math.min(distance ?? 0, 40) / 40) * 100}%`;

  const elapsed = record?.checkInAt ? Math.max(0, Math.floor((Date.now() - new Date(record.checkInAt).getTime()) / 1000)) : 0;
  void tick; // re-render trigger for the live timer

  const workedMin =
    record?.checkInAt && record.checkOutAt
      ? Math.round((new Date(record.checkOutAt).getTime() - new Date(record.checkInAt).getTime()) / 60000)
      : 0;
  const netMin = Math.max(0, workedMin - (workedMin > 90 ? 90 : 0));

  const canAct = hasFix && !outOfRange && !checkInMut.isPending && !checkOutMut.isPending;

  return (
    <ScreenContainer
      title={t('tabAtt')}
      refreshControl={
        <RefreshControl
          refreshing={officeQ.isFetching || todayQ.isFetching}
          onRefresh={() => {
            officeQ.refetch();
            todayQ.refetch();
            summaryQ.refetch();
            historyQ.refetch();
            geo.refresh();
          }}
        />
      }
    >
      <Card style={{ gap: 15 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Kicker>{t('locCheck')}</Kicker>
          {hasFix ? <Tag label={outOfRange ? t('outside') : t('inside')} variant={outOfRange ? 'outline' : 'accent'} /> : null}
        </View>

        <View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 7 }}>
            <Text style={{ fontFamily: headingFont('en'), fontSize: 46, color: distColor }}>{hasFix ? Math.round(distance!) : '—'}</Text>
            <Text style={{ fontSize: 13, color: color.neutral700, fontFamily: bodyFont(lang) }}>{t('metresFrom')}</Text>
          </View>

          <View style={{ height: 34, marginTop: 14 }}>
            <View style={{ position: 'absolute', left: 0, right: 0, top: 15, height: 3, backgroundColor: color.neutral200, borderRadius: 99 }} />
            <View style={{ position: 'absolute', left: 0, width: radiusPct, top: 15, height: 3, backgroundColor: color.accent, borderRadius: 99 }} />
            {hasFix ? (
              <View style={{ position: 'absolute', left: markerPct, top: 8, width: 3, height: 17, backgroundColor: color.neutral900, borderRadius: 2, marginLeft: -1.5 }} />
            ) : null}
            <Text style={{ position: 'absolute', left: 0, bottom: 0, fontSize: 10, color: color.neutral600 }}>0 m</Text>
            <Text style={{ position: 'absolute', left: radiusPct, bottom: 0, fontSize: 10, color: color.accent700, marginLeft: -10 }}>
              {office?.radiusM ?? 10} m
            </Text>
            <Text style={{ position: 'absolute', right: 0, bottom: 0, fontSize: 10, color: color.neutral600 }}>40 m</Text>
          </View>

          <Muted style={{ marginTop: 11 }}>
            {geo.status === 'denied' ? t('locationDenied') : geo.status === 'error' ? t('locationError') : t('gpsNote')}
          </Muted>
        </View>

        {status === 'out' ? (
          <PrimaryButton
            label={outOfRange || !hasFix ? t('tooFarIn') : t('checkIn')}
            onPress={() => checkInMut.mutate()}
            disabled={!canAct}
            loading={checkInMut.isPending}
          />
        ) : status === 'in' ? (
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 13, borderWidth: 1, borderColor: color.accent200, backgroundColor: color.accent100, borderRadius: 4 }}>
              <Body style={{ fontSize: 12, color: color.accent800 }}>
                {t('workingSince')} {hhmm(record!.checkInAt)}
              </Body>
              <Text style={{ fontFamily: headingFont('en'), fontSize: 19, color: color.accent800 }}>{elapsedClock(elapsed)}</Text>
            </View>
            <SecondaryButton
              label={outOfRange || !hasFix ? t('tooFarOut') : t('checkOut')}
              onPress={() => checkOutMut.mutate()}
              disabled={!canAct}
              loading={checkOutMut.isPending}
            />
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, borderWidth: 1, borderColor: color.divider, borderRadius: 4 }}>
            <Icon name="check" color={color.accent700} size={18} />
            <Body style={{ fontSize: 12.5, flexShrink: 1 }}>
              {t('dayRecorded')} · {hoursMinutes(netMin)} {t('worked')}
            </Body>
          </View>
        )}
      </Card>

      <Card style={{ padding: 0, gap: 0 }}>
        <View style={{ padding: 13, borderBottomWidth: 1, borderBottomColor: color.divider, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Kicker>{t('today')}</Kicker>
        </View>
        <StatRow>
          <Cell label={t('inShort')} value={hhmm(record?.checkInAt ?? null)} border />
          <Cell label={t('outShort')} value={hhmm(record?.checkOutAt ?? null)} border />
          <Cell label={t('hours')} value={workedMin ? hoursMinutes(netMin) : status === 'in' ? elapsedClock(elapsed).slice(0, 5) : '––'} />
        </StatRow>
        <View style={{ padding: 11, borderTopWidth: 1, borderTopColor: color.divider }}>
          <Muted>{t('shiftNote')}</Muted>
        </View>
      </Card>

      <View>
        <Heading style={{ marginBottom: 8 }}>{t('thisMonth')}</Heading>
        <StatRow>
          <StatCell value={summaryQ.data?.presentCount ?? '—'} label={t('present')} />
          <StatCell value={summaryQ.data?.lateCount ?? '—'} label={t('late')} valueColor={color.accent700} />
          <StatCell value={summaryQ.data?.onLeaveCount ?? '—'} label={t('onLeave')} />
        </StatRow>
      </View>

      {summaryQ.data ? <PunctualityCard summary={summaryQ.data} /> : null}

      {summaryQ.data && office && summaryQ.data.lateRows.length > 0 ? (
        <View>
          <Heading style={{ marginBottom: 8 }}>{t('lateBreakdown')}</Heading>
          <Card style={{ padding: 0 }}>
            {summaryQ.data.lateRows.map((row, i) => {
              const arrivalMin = office.graceEndMin + row.lateMinutes;
              const detail = `${minutesToClock(arrivalMin)} · +${Math.floor(row.lateMinutes / 60)}h ${row.lateMinutes % 60}m`;
              return (
                <View key={row.date} style={{ padding: 12, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: i === 0 ? 0 : 1, borderTopColor: color.divider }}>
                  <View>
                    <Body style={{ fontSize: 13 }}>{formatDateWeekdayShort(row.date, lang)}</Body>
                    <Muted style={{ marginTop: 2, fontSize: 11 }}>{detail}</Muted>
                  </View>
                  <Text style={{ fontFamily: headingFont('en'), fontSize: 13.5, color: row.charged ? color.accent800 : color.neutral600 }}>
                    {row.charged ? `−${lak(row.amount)}${row.unpaid ? ` · ${t('unpaidDay')}` : ''}` : t('noDeduct')}
                  </Text>
                </View>
              );
            })}
          </Card>
          <Muted style={{ marginTop: 9 }}>{t('lateRule')}</Muted>
        </View>
      ) : null}

      <View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <Heading>{t('myCorrections')}</Heading>
        </View>
        {(correctionsQ.data ?? []).length > 0 ? (
          <Card style={{ padding: 0, marginBottom: 10 }}>
            {(correctionsQ.data ?? []).map((c, i) => {
              const statusKey: Record<CorrectionStatus, 'pending' | 'approved' | 'rejected'> = {
                PENDING: 'pending',
                APPROVED: 'approved',
                REJECTED: 'rejected',
              };
              const variant = c.status === 'APPROVED' ? 'accent' : c.status === 'REJECTED' ? 'neutral' : 'outline';
              const times = [c.checkInAt ? `${t('inShort')} ${hhmm(c.checkInAt)}` : null, c.checkOutAt ? `${t('outShort')} ${hhmm(c.checkOutAt)}` : null]
                .filter(Boolean)
                .join(' · ');
              return (
                <View key={c.id} style={{ padding: 12, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: i === 0 ? 0 : 1, borderTopColor: color.divider }}>
                  <View style={{ flexShrink: 1 }}>
                    <Body style={{ fontSize: 13 }}>{formatDateWeekdayShort(c.date, lang)}</Body>
                    <Muted style={{ marginTop: 2, fontSize: 11 }}>{times || c.reason}</Muted>
                  </View>
                  <Tag label={t(statusKey[c.status])} variant={variant} />
                </View>
              );
            })}
          </Card>
        ) : null}
        <SecondaryButton label={t('reportMissedPunch')} onPress={() => setPunchOpen(true)} />
      </View>

      <View>
        <Heading style={{ marginBottom: 8 }}>{t('recentDays')}</Heading>
        <Card style={{ padding: 0 }}>
          {(historyQ.data ?? []).map((r, i) => {
            const isLate = r.lateMinutes > 0;
            return (
              <View key={r.id} style={{ padding: 12, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: i === 0 ? 0 : 1, borderTopColor: color.divider }}>
                <View>
                  <Body style={{ fontSize: 13 }}>{formatDateWeekdayShort(r.date, lang)}</Body>
                  <Muted style={{ marginTop: 2, fontSize: 11 }}>
                    {hhmm(r.checkInAt)} – {hhmm(r.checkOutAt)}
                  </Muted>
                </View>
                <Tag label={isLate ? t('late') : t('present')} variant={isLate ? 'accent' : 'neutral'} />
              </View>
            );
          })}
          {(historyQ.data ?? []).length === 0 ? (
            <View style={{ padding: 16 }}>
              <Muted>—</Muted>
            </View>
          ) : null}
        </Card>
      </View>

      {(checkInMut.isError && checkInMut.error instanceof ApiError) ? <ErrorNote message={checkInMut.error.message} /> : null}
      <MissedPunchModal visible={punchOpen} onClose={() => setPunchOpen(false)} onDone={flash} />
      {toast ? <View style={{ position: 'absolute', left: 0, right: 0, bottom: 8 }}><Toast message={toast} /></View> : null}
    </ScreenContainer>
  );
}

function Cell({ label, value, border }: { label: string; value: string; border?: boolean }) {
  return (
    <View style={{ flex: 1, padding: 14, borderRightWidth: border ? 1 : 0, borderRightColor: color.divider }}>
      <Text style={{ fontSize: 10, color: color.neutral700, letterSpacing: 0.5 }}>{label}</Text>
      <Text style={{ fontFamily: headingFont('en'), fontSize: 19, marginTop: 3 }}>{value}</Text>
    </View>
  );
}

function PunctualityCard({ summary }: { summary: AttendanceSummary }) {
  const { t } = useLanguage();
  const p = punctualityStyle(summary.punctuality);
  const ticks = Array.from({ length: 15 }, (_, k) => k < Math.min(summary.punctuality.count, 15));
  return (
    <Card style={{ borderColor: p.border, backgroundColor: p.bg, padding: 0, gap: 0 }}>
      <View style={{ padding: 15, flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flexShrink: 1 }}>
          <Text style={{ fontSize: 9.5, letterSpacing: 1.5, textTransform: 'uppercase', color: p.kicker }}>{t('punctuality')}</Text>
          <Text style={{ fontFamily: headingFont('en'), fontSize: 17, marginTop: 5, color: p.ink }}>{t(p.headlineKey)}</Text>
          <Text style={{ fontSize: 11.5, marginTop: 5, color: p.body, lineHeight: 16 }}>{t(p.noteKey)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontFamily: headingFont('en'), fontSize: 34, color: p.ink }}>{summary.punctuality.count}</Text>
          <Text style={{ fontSize: 10, color: p.body, marginTop: 3 }}>{t('lateDays')}</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 5, paddingHorizontal: 15, paddingBottom: 14 }}>
        {ticks.map((filled, i) => (
          <View key={i} style={{ flex: 1, height: 5, borderRadius: 99, backgroundColor: filled ? (i < 3 ? color.accent300 : color.accent) : color.neutral200 }} />
        ))}
      </View>
      {summary.punctuality.total > 0 ? (
        <View style={{ borderTopWidth: 1, borderTopColor: p.border, padding: 13, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 11.5, color: p.body }}>{t('lateDeduction')}</Text>
          <Text style={{ fontFamily: headingFont('en'), fontSize: 18, color: p.ink }}>−{lak(summary.punctuality.total)}</Text>
        </View>
      ) : null}
    </Card>
  );
}
