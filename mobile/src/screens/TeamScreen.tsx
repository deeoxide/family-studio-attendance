import React from 'react';
import { Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ScreenContainer } from '@/components/ScreenContainer';
import { Body, Card, Heading, Muted, StatCell, StatRow, Tag } from '@/components/ui';
import { useLanguage } from '@/state/LanguageContext';
import { attendanceApi } from '@/api/endpoints';
import { color, headingFont } from '@/theme/tokens';
import { hhmm, pick } from '@/lib/format';
import { formatDateLong } from '@/lib/format';
import { todayISODate } from '@/lib/date';

export function TeamScreen() {
  const { lang, t } = useLanguage();
  const teamQ = useQuery({ queryKey: ['attendance', 'team-today'], queryFn: () => attendanceApi.teamToday().then((r) => r.team) });

  const team = teamQ.data ?? [];
  const present = team.filter((m) => m.checkInAt && !m.onLeave).length;
  const late = team.filter((m) => m.lateMinutes > 0).length;
  const onLeave = team.filter((m) => m.onLeave).length;

  return (
    <ScreenContainer title={t('tabTeam')}>
      <StatRow>
        <StatCell value={present} label={t('present')} />
        <StatCell value={late} label={t('late')} valueColor={color.accent700} />
        <StatCell value={onLeave} label={t('onLeave')} />
      </StatRow>

      <View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <Heading>{t('rollToday')}</Heading>
          <Muted style={{ fontSize: 11 }}>{formatDateLong(todayISODate(), lang)}</Muted>
        </View>
        <Card style={{ padding: 0 }}>
          {team.map((m, i) => {
            const isLate = m.lateMinutes > 0;
            const status = m.onLeave ? t('onLeave') : m.checkInAt ? (isLate ? t('late') : t('present')) : t('notInYet');
            const variant = m.onLeave ? 'outline' : isLate ? 'accent' : m.checkInAt ? 'neutral' : 'outline';
            const detail = m.onLeave
              ? t('onLeave')
              : m.checkInAt
              ? `${hhmm(m.checkInAt)} · ${m.distance != null ? Math.round(m.distance) : '—'} m`
              : '—';
            return (
              <View key={m.user.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, paddingHorizontal: 16, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: color.divider }}>
                <View style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: color.divider, backgroundColor: color.neutral100, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontFamily: headingFont('en'), fontWeight: '600', fontSize: 12, color: color.neutral800 }}>{m.user.initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Body style={{ fontSize: 13 }}>{pick(lang, m.user.nameEn, m.user.nameLo)}</Body>
                  <Muted style={{ marginTop: 2, fontSize: 11 }}>{detail}</Muted>
                </View>
                <Tag label={status} variant={variant as any} />
              </View>
            );
          })}
          {team.length === 0 ? (
            <View style={{ padding: 16 }}>
              <Muted>—</Muted>
            </View>
          ) : null}
        </Card>
      </View>
    </ScreenContainer>
  );
}
