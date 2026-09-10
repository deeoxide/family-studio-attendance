import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Body, Card, LoadingBlock, Muted } from '@/components/ui';
import { useLanguage } from '@/state/LanguageContext';
import { attendanceApi } from '@/api/endpoints';
import type { KpiRow } from '@/api/types';
import { color, headingFont, bodyFont, tabularNums, kickerStyle } from '@/theme/tokens';
import { levelStyle } from '@/lib/punctuality';
import { lak, pick } from '@/lib/format';
import { periodLabel } from '@/lib/period';

/** The colour dot + word for one person's punctuality level. */
export function LevelPill({ level, showLabel = false }: { level: KpiRow['level']; showLabel?: boolean }) {
  const { t } = useLanguage();
  const s = levelStyle(level);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: s.dot }} />
      {showLabel ? <Text style={{ fontSize: 11, color: s.fg }}>{t(s.labelKey)}</Text> : null}
    </View>
  );
}

/**
 * KPI board of late arrivals + leave for the current month. Used as the
 * "Punctuality" view inside People (HR/Admin) and Team (Manager). Tapping a
 * row opens that person's detail screen.
 */
export function PunctualityBoard({ onOpenPerson }: { onOpenPerson: (id: string) => void }) {
  const { lang, t } = useLanguage();
  const kpiQ = useQuery({ queryKey: ['attendance', 'kpi'], queryFn: () => attendanceApi.kpi() });

  if (!kpiQ.data) return <LoadingBlock />;
  const { rows, totals, periodMonth } = kpiQ.data;

  return (
    <View style={{ gap: 14 }}>
      <Card>
        <Text style={{ fontFamily: bodyFont(lang), ...kickerStyle(color.neutral700) }}>
          {periodLabel(periodMonth, lang)}
        </Text>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
          <TotalCell value={totals.green} label={t('punctGreen')} tint={color.ok} />
          <TotalCell value={totals.yellow} label={t('punctYellow')} tint={color.warn} />
          <TotalCell value={totals.red} label={t('punctRed')} tint={color.danger} />
        </View>
        {totals.lateDeduction > 0 ? (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, borderTopWidth: 1, borderTopColor: color.divider, paddingTop: 11 }}>
            <Muted style={{ fontSize: 11.5 }}>{t('lateDeduction')}</Muted>
            <Text style={[{ fontFamily: headingFont('en'), fontSize: 15, color: color.danger }, tabularNums]}>−{lak(totals.lateDeduction)}</Text>
          </View>
        ) : null}
        <Muted style={{ fontSize: 10.5, marginTop: 10 }}>{t('kpiLegend')}</Muted>
      </Card>

      <Card style={{ padding: 0 }}>
        {rows.map((r, i) => (
          <Pressable
            key={r.user.id}
            onPress={() => onOpenPerson(r.user.id)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, paddingHorizontal: 16, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: color.divider }}
          >
            <LevelPill level={r.level} />
            <View style={{ flex: 1 }}>
              <Body style={{ fontSize: 13 }}>{pick(lang, r.user.nameEn, r.user.nameLo)}</Body>
              <Muted style={{ marginTop: 2, fontSize: 11 }}>
                {r.lateCount > 0 ? `${r.lateCount} ${t('times')}` : t('punctGreen')}
                {r.leftEarlyCount > 0 ? ` · ${t('leftEarly')} ${r.leftEarlyCount}` : ''}
                {r.leaveDaysYtd > 0 ? ` · ${t('leaveTakenYtd')} ${r.leaveDaysYtd}` : ''}
              </Muted>
            </View>
            {r.lateDeduction > 0 ? (
              <Text style={[{ fontFamily: headingFont('en'), fontSize: 12.5, color: color.danger }, tabularNums]}>−{lak(r.lateDeduction)}</Text>
            ) : null}
          </Pressable>
        ))}
        {rows.length === 0 ? (
          <View style={{ padding: 16 }}>
            <Muted>—</Muted>
          </View>
        ) : null}
      </Card>
    </View>
  );
}

function TotalCell({ value, label, tint }: { value: number; label: string; tint: string }) {
  return (
    <View style={{ flex: 1, borderWidth: 1, borderColor: color.divider, paddingVertical: 12, alignItems: 'center' }}>
      <Text style={[{ fontFamily: headingFont('en'), fontSize: 24, color: tint }, tabularNums]}>{value}</Text>
      <Text style={{ fontSize: 10.5, color: color.neutral700, marginTop: 4, textAlign: 'center' }}>{label}</Text>
    </View>
  );
}
