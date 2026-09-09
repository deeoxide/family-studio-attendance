import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ScreenContainer } from '@/components/ScreenContainer';
import { Body, Card, Muted, PrimaryButton, Segmented } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { PunctualityBoard, LevelPill } from '@/components/PunctualityBoard';
import { useLanguage } from '@/state/LanguageContext';
import { peopleApi } from '@/api/endpoints';
import { color, headingFont } from '@/theme/tokens';
import { pick, lak } from '@/lib/format';

export function PeopleScreen({ navigation }: any) {
  const { lang, t } = useLanguage();
  const [tab, setTab] = useState<'directory' | 'kpi'>('directory');
  const peopleQ = useQuery({ queryKey: ['people'], queryFn: () => peopleApi.list() });
  const canAdminister = peopleQ.data?.canAdminister ?? false;
  const openPerson = (id: string) => navigation.navigate('PersonDetail', { id });

  return (
    <ScreenContainer title={t('tabPeople')}>
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { key: 'directory', label: t('directory') },
          { key: 'kpi', label: t('punctualityKpi') },
        ]}
      />

      {tab === 'kpi' ? (
        <PunctualityBoard onOpenPerson={openPerson} />
      ) : (
        <>
          {canAdminister ? (
            <PrimaryButton label={t('registerEmployee')} onPress={() => navigation.navigate('RegisterEmployee')} />
          ) : null}

          <Card style={{ padding: 0 }}>
            {(peopleQ.data?.people ?? []).map((p, i) => (
              <Pressable
                key={p.id}
                onPress={() => openPerson(p.id)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, paddingHorizontal: 16, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: color.divider }}
              >
                <View style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: color.divider, backgroundColor: color.neutral100, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontFamily: headingFont('en'), fontWeight: '600', fontSize: 12, color: color.neutral800 }}>{p.initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                    <LevelPill level={p.punctuality} />
                    <Body style={{ fontSize: 13 }}>{pick(lang, p.nameEn, p.nameLo)}</Body>
                  </View>
                  <Muted style={{ marginTop: 2, fontSize: 11 }}>
                    {pick(lang, p.roleTitleEn, p.roleTitleLo)}
                    {p.lateCount > 0 ? ` · ${p.lateCount} ${t('lateThisMonth').toLowerCase()}` : ''}
                    {canAdminister ? ` · ${lak(p.basicSalary)} LAK` : ''}
                  </Muted>
                </View>
                <Muted style={{ fontSize: 11 }}>{`${p.annualLeaveLeft} d`}</Muted>
                <Icon name="chevronRight" size={15} color={color.neutral500} />
              </Pressable>
            ))}
            {(peopleQ.data?.people ?? []).length === 0 ? (
              <View style={{ padding: 16 }}>
                <Muted>—</Muted>
              </View>
            ) : null}
          </Card>
          <Muted>{t('peopleNote')}</Muted>
        </>
      )}
    </ScreenContainer>
  );
}
