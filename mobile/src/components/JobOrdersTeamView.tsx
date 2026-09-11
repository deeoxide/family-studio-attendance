import React, { useState } from 'react';
import { Platform, Pressable, Share, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Body, Card, EmptyState, LoadingBlock, Muted, Tag } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { useLanguage } from '@/state/LanguageContext';
import { jobOrderApi } from '@/api/endpoints';
import { ApiError } from '@/api/client';
import type { JobStatus, JobWorkType } from '@/api/types';
import { color, headingFont } from '@/theme/tokens';
import { pick, formatDateShort } from '@/lib/format';
import { todayISODate } from '@/lib/date';

const STATUS_KEY: Record<JobStatus, 'jobStatusOpen' | 'jobStatusInProgress' | 'jobStatusClosed'> = {
  OPEN: 'jobStatusOpen',
  IN_PROGRESS: 'jobStatusInProgress',
  CLOSED: 'jobStatusClosed',
};
const STATUS_VARIANT: Record<JobStatus, 'outline' | 'accent' | 'neutral'> = {
  OPEN: 'outline',
  IN_PROGRESS: 'accent',
  CLOSED: 'neutral',
};
const WORK_TYPE_KEY: Record<JobWorkType, 'workInternal' | 'workExternal'> = {
  INTERNAL: 'workInternal',
  EXTERNAL: 'workExternal',
};

/**
 * Manager (their direct reports) / HR / Admin (everyone) view of Open Job —
 * the same roster the app's own "New job order" screen feeds, plus a CSV
 * export for tracking task frequency and turnaround in a spreadsheet. On web
 * the export triggers a normal file download; on a phone there's no
 * filesystem to download into, so it hands the CSV to the native share sheet
 * instead (save to Files, AirDrop, email it, etc.).
 */
export function JobOrdersTeamView() {
  const { lang, t } = useLanguage();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const jobsQ = useQuery({ queryKey: ['jobOrders', 'team'], queryFn: () => jobOrderApi.team().then((r) => r.jobOrders) });
  const jobs = jobsQ.data ?? [];

  async function handleExport() {
    setExportError(null);
    setExporting(true);
    try {
      const csv = await jobOrderApi.exportCsv();
      if (Platform.OS === 'web') {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `job-orders-${todayISODate()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        await Share.share({ message: csv, title: `job-orders-${todayISODate()}.csv` });
      }
    } catch (e) {
      setExportError(e instanceof ApiError ? e.message : t('exportFailed'));
    } finally {
      setExporting(false);
    }
  }

  if (jobsQ.isLoading) return <LoadingBlock />;

  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <Muted style={{ flexShrink: 1 }}>{t('jobOrdersNote')}</Muted>
        <Pressable
          onPress={handleExport}
          disabled={exporting || jobs.length === 0}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            minHeight: 40,
            paddingHorizontal: 12,
            borderWidth: 1,
            borderColor: color.accent,
            borderRadius: 5,
            opacity: exporting || jobs.length === 0 ? 0.5 : 1,
          }}
        >
          <Icon name="download" size={14} color={color.accent800} />
          <Text style={{ fontFamily: headingFont(lang), fontSize: 12.5, color: color.accent800 }}>{t('exportCsv')}</Text>
        </Pressable>
      </View>

      {exportError ? <Muted style={{ color: color.dangerInk }}>{exportError}</Muted> : null}

      {jobs.length === 0 ? (
        <EmptyState title={t('noJobOrdersTeam')} note={t('noJobsNote')} />
      ) : (
        <Card style={{ padding: 0 }}>
          {jobs.map((j, i) => (
            <View key={j.id} style={{ padding: 13, paddingHorizontal: 16, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: color.divider }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Body style={{ fontSize: 13, fontFamily: headingFont(lang) }}>{j.jobOrderNo}</Body>
                  {j.project ? <Body style={{ fontSize: 12.5, marginTop: 2 }}>{j.project}</Body> : null}
                  <Muted style={{ marginTop: 2 }}>
                    {`${j.user ? pick(lang, j.user.nameEn, j.user.nameLo) : ''} · ${j.clientCode} · ${t(WORK_TYPE_KEY[j.workType])}`}
                  </Muted>
                </View>
                <Tag label={t(STATUS_KEY[j.status])} variant={STATUS_VARIANT[j.status]} />
              </View>
              <Body style={{ fontSize: 12.5, marginTop: 8 }}>{j.task}</Body>
              <Muted style={{ marginTop: 6 }}>
                {`${t('dateOpened')}: ${formatDateShort(j.openDate, lang)}`}
                {j.closeDate ? ` · ${t('dateClosed')}: ${formatDateShort(j.closeDate, lang)}` : ''}
              </Muted>
            </View>
          ))}
        </Card>
      )}
    </View>
  );
}
