import React from 'react';
import { Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ScreenContainer } from '@/components/ScreenContainer';
import { Body, Card, Muted } from '@/components/ui';
import { useLanguage } from '@/state/LanguageContext';
import { peopleApi } from '@/api/endpoints';
import { color, headingFont } from '@/theme/tokens';
import { pick } from '@/lib/format';

export function PeopleScreen() {
  const { lang, t } = useLanguage();
  const peopleQ = useQuery({ queryKey: ['people'], queryFn: () => peopleApi.list().then((r) => r.people) });

  return (
    <ScreenContainer title={t('tabPeople')}>
      <Card style={{ padding: 0 }}>
        {(peopleQ.data ?? []).map((p, i) => (
          <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, paddingHorizontal: 16, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: color.divider }}>
            <View style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: color.divider, backgroundColor: color.neutral100, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: headingFont('en'), fontWeight: '600', fontSize: 12, color: color.neutral800 }}>{p.initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Body style={{ fontSize: 13 }}>{pick(lang, p.nameEn, p.nameLo)}</Body>
              <Muted style={{ marginTop: 2, fontSize: 11 }}>{pick(lang, p.roleTitleEn, p.roleTitleLo)}</Muted>
            </View>
            <Muted style={{ fontSize: 11 }}>{`${p.annualLeaveLeft} d left`}</Muted>
          </View>
        ))}
        {(peopleQ.data ?? []).length === 0 ? (
          <View style={{ padding: 16 }}>
            <Muted>—</Muted>
          </View>
        ) : null}
      </Card>
      <Muted>{t('peopleNote')}</Muted>
    </ScreenContainer>
  );
}
