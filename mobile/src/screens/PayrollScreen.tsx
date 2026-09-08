import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ScreenContainer } from '@/components/ScreenContainer';
import { Body, Card, Divider, Heading, Kicker, Muted } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { useLanguage } from '@/state/LanguageContext';
import { payrollApi } from '@/api/endpoints';
import { color, headingFont } from '@/theme/tokens';
import { lak } from '@/lib/format';
import { periodLabel } from '@/lib/period';
import type { Payslip } from '@/api/types';

export function PayrollScreen() {
  const { lang, t } = useLanguage();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const payslipsQ = useQuery({ queryKey: ['payroll', 'payslips'], queryFn: () => payrollApi.payslips().then((r) => r.payslips) });

  const payslips = payslipsQ.data ?? [];
  const latest = payslips[0];
  const selected = selectedId ? payslips.find((p) => p.id === selectedId) ?? null : null;

  return (
    <ScreenContainer title={t('tabPay')}>
      {selected ? (
        <PayslipDetail payslip={selected} onBack={() => setSelectedId(null)} />
      ) : (
        <View style={{ gap: 16 }}>
          {latest ? (
            <Card>
              <Kicker>{`${t('netPay')} · ${periodLabel(latest.periodMonth, lang)}`}</Kicker>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 7, marginTop: 8 }}>
                <Text style={{ fontFamily: headingFont('en'), fontSize: 36, color: color.text }}>{lak(latest.net)}</Text>
                <Text style={{ fontSize: 14, color: color.neutral700 }}>LAK</Text>
              </View>
              <Divider style={{ marginVertical: 14 }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <Muted style={{ flexShrink: 1 }}>
                  {latest.status === 'PAID' && latest.paidAt ? `${t('paid')} ${new Date(latest.paidAt).toLocaleDateString()}` : t('periodOpen')}
                </Muted>
                <Pressable
                  onPress={() => setSelectedId(latest.id)}
                  style={{ minHeight: 44, paddingHorizontal: 15, justifyContent: 'center', borderWidth: 1, borderColor: color.accent, borderRadius: 4 }}
                >
                  <Text style={{ fontSize: 12.5, color: color.accent800 }}>{t('viewPayslip')}</Text>
                </Pressable>
              </View>
            </Card>
          ) : null}

          <View>
            <Heading style={{ marginBottom: 8 }}>{t('earlierPayslips')}</Heading>
            <Card style={{ padding: 0 }}>
              {payslips.slice(1).map((p, i) => (
                <Pressable
                  key={p.id}
                  onPress={() => setSelectedId(p.id)}
                  style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, paddingHorizontal: 16, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: color.divider }}
                >
                  <View>
                    <Body style={{ fontSize: 13 }}>{periodLabel(p.periodMonth, lang)}</Body>
                    <Muted style={{ marginTop: 2, fontSize: 11 }}>{p.paidAt ? new Date(p.paidAt).toLocaleDateString() : t('periodOpen')}</Muted>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={{ fontFamily: headingFont('en'), fontSize: 14 }}>{lak(p.net)}</Text>
                    <Icon name="chevronRight" size={15} color={color.neutral500} />
                  </View>
                </Pressable>
              ))}
              {payslips.length <= 1 ? (
                <View style={{ padding: 16 }}>
                  <Muted>—</Muted>
                </View>
              ) : null}
            </Card>
          </View>
        </View>
      )}
    </ScreenContainer>
  );
}

export function PayslipDetail({ payslip, onBack }: { payslip: Payslip; onBack: () => void }) {
  const { lang, t } = useLanguage();
  const lines: Array<{ label: string; value: string; strong?: boolean; muted?: boolean }> = [
    { label: payslip.half ? t('basicHalf') : t('basic'), value: lak(payslip.basic) },
    { label: t('ot'), value: lak(payslip.ot) },
    { label: t('allow'), value: lak(payslip.allowance) },
    { label: t('gross'), value: lak(payslip.gross), strong: true },
    { label: t('sso'), value: `−${lak(payslip.sso)}`, muted: true },
    { label: t('tax'), value: `−${lak(payslip.tax)}`, muted: true },
  ];
  if (payslip.lateDeduction > 0) {
    lines.push({ label: `${t('lateDeduction')} (${payslip.lateRows.filter((r) => r.charged).length} ${t('lateDays')})`, value: `−${lak(payslip.lateDeduction)}` });
  }

  return (
    <View style={{ gap: 15 }}>
      <Pressable onPress={onBack} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }} hitSlop={10}>
        <Icon name="chevronLeft" size={15} color={color.accent700} />
        <Text style={{ fontSize: 12.5, color: color.accent700 }}>{t('allPayslips')}</Text>
      </Pressable>

      <View>
        <Kicker>{t('payslip')}</Kicker>
        <Heading style={{ fontSize: 24, marginTop: 4 }}>{periodLabel(payslip.periodMonth, lang)}</Heading>
      </View>

      <View>
        {lines.map((l, i) => (
          <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: color.divider }}>
            <Text style={{ fontSize: 12.5, color: l.muted ? color.neutral700 : color.text, fontWeight: l.strong ? '600' : '400' }}>{l.label}</Text>
            <Text style={{ fontSize: 12.5, color: l.muted ? color.neutral700 : color.text, fontWeight: l.strong ? '600' : '400' }}>{l.value}</Text>
          </View>
        ))}
      </View>

      {payslip.lateDeduction > 0 ? (
        <Card style={{ padding: 0 }}>
          <View style={{ padding: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: color.divider }}>
            <Kicker>{t('lateBreakdown')}</Kicker>
          </View>
          {payslip.lateRows.map((r, i) => (
            <View key={r.date} style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 11, paddingHorizontal: 16, borderBottomWidth: i === payslip.lateRows.length - 1 ? 0 : 1, borderBottomColor: color.divider }}>
              <Text style={{ fontSize: 12 }}>{r.date}</Text>
              <Text style={{ fontSize: 12, color: r.charged ? color.accent800 : color.neutral600 }}>{r.charged ? `−${lak(r.amount)}` : t('noDeduct')}</Text>
            </View>
          ))}
        </Card>
      ) : null}

      <Card style={{ borderColor: color.accent200, backgroundColor: color.accent100, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text style={{ fontFamily: headingFont(lang), fontWeight: '600', fontSize: 15, color: color.accent900 }}>{t('netPay')}</Text>
        <Text style={{ fontFamily: headingFont('en'), fontSize: 24, color: color.accent900 }}>{lak(payslip.net)}</Text>
      </Card>

      <Muted>{t('payNote')}</Muted>
    </View>
  );
}
