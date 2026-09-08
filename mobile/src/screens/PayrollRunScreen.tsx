import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ScreenContainer } from '@/components/ScreenContainer';
import { Body, Card, Divider, Heading, Kicker, Muted, PrimaryButton, Toast } from '@/components/ui';
import { useLanguage } from '@/state/LanguageContext';
import { payrollApi } from '@/api/endpoints';
import { ApiError } from '@/api/client';
import { color, headingFont } from '@/theme/tokens';
import { lak, pick } from '@/lib/format';
import { periodLabel } from '@/lib/period';

export function PayrollRunScreen() {
  const { lang, t } = useLanguage();
  const qc = useQueryClient();
  const [toast, setToast] = useState<string | null>(null);
  const runQ = useQuery({ queryKey: ['payroll', 'run'], queryFn: payrollApi.run });

  const approveMut = useMutation({
    mutationFn: payrollApi.approveRun,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll'] });
      setToast(t('runApprovedToast'));
      setTimeout(() => setToast(null), 2800);
    },
    onError: (e) => {
      setToast(e instanceof ApiError ? e.message : t('errorGeneric'));
      setTimeout(() => setToast(null), 2800);
    },
  });

  const run = runQ.data;
  const allPaid = run ? run.rows.every((r) => r.status === 'PAID') : false;

  return (
    <ScreenContainer title={t('tabRun')}>
      {run ? (
        <>
          <Card>
            <Kicker>{t('periodOpen')}</Kicker>
            <Heading style={{ fontSize: 22, marginTop: 5 }}>{periodLabel(run.periodMonth, lang)}</Heading>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 7, marginTop: 12 }}>
              <Text style={{ fontFamily: headingFont('en'), fontSize: 32, color: color.text }}>{lak(run.netTotal)}</Text>
              <Text style={{ fontSize: 13, color: color.neutral700 }}>LAK</Text>
            </View>
            <Divider style={{ marginVertical: 14 }} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              <Stat label={t('headcount')} value={String(run.headcount)} />
              <Stat label={t('ssoTotal')} value={lak(run.ssoTotal)} />
              <Stat label={t('taxTotal')} value={lak(run.taxTotal)} />
            </View>
          </Card>

          <View>
            <Heading style={{ marginBottom: 8 }}>{t('perPerson')}</Heading>
            <Card style={{ padding: 0 }}>
              {run.rows.map((r, i) => (
                <View key={r.id} style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 12, paddingHorizontal: 16, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: color.divider }}>
                  <View style={{ flexShrink: 1 }}>
                    <Body style={{ fontSize: 13 }}>{pick(lang, r.user.nameEn, r.user.nameLo)}</Body>
                    <Muted style={{ marginTop: 2, fontSize: 11 }}>{pick(lang, r.user.roleTitleEn, r.user.roleTitleLo)}</Muted>
                  </View>
                  <Text style={{ fontFamily: headingFont('en'), fontSize: 14 }}>{lak(r.net)}</Text>
                </View>
              ))}
            </Card>
          </View>

          <PrimaryButton
            label={allPaid ? t('runApproved') : t('approveRun')}
            onPress={() => approveMut.mutate()}
            disabled={allPaid}
            loading={approveMut.isPending}
          />
        </>
      ) : null}
      {toast ? <View style={{ position: 'absolute', left: 0, right: 0, bottom: 8 }}><Toast message={toast} /></View> : null}
    </ScreenContainer>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ minWidth: '45%' }}>
      <Muted style={{ fontSize: 10.5 }}>{label}</Muted>
      <Text style={{ fontFamily: headingFont('en'), fontSize: 17, marginTop: 2 }}>{value}</Text>
    </View>
  );
}
