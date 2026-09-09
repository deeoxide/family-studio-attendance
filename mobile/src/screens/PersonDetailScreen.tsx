import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ScreenContainer } from '@/components/ScreenContainer';
import { Body, Card, LoadingBlock, Muted, PrimaryButton, SecondaryButton, Toast } from '@/components/ui';
import { TextField, ChoiceRow } from '@/components/Field';
import { DateField } from '@/components/DateField';
import { RecordLeaveModal } from '@/components/RecordLeaveModal';
import { CorrectAttendanceModal } from '@/components/CorrectAttendanceModal';
import { Icon } from '@/components/Icon';
import { useLanguage } from '@/state/LanguageContext';
import { peopleApi } from '@/api/endpoints';
import { ApiError } from '@/api/client';
import type { LeaveType, Role, UpdateEmployeeInput } from '@/api/types';
import { color, headingFont, tabularNums } from '@/theme/tokens';
import { pick, lak, formatDateWeekdayShort } from '@/lib/format';
import { levelStyle } from '@/lib/punctuality';
import { periodLabel } from '@/lib/period';
import type { PunctualityDetail } from '@/api/types';

const ROLE_KEY: Record<Role, 'roleEmp' | 'roleMgr' | 'roleHr' | 'roleAdmin'> = {
  EMPLOYEE: 'roleEmp',
  MANAGER: 'roleMgr',
  HR: 'roleHr',
  ADMIN: 'roleAdmin',
};
const LEAVE_KEY: Record<LeaveType, 'annual' | 'sick' | 'personal'> = { ANNUAL: 'annual', SICK: 'sick', PERSONAL: 'personal' };
const num = (s: string) => Math.max(0, Math.round(Number(s.replace(/[^\d]/g, '')) || 0));

export function PersonDetailScreen({ route, navigation }: any) {
  const id = route.params.id as string;
  const { lang, t } = useLanguage();
  const qc = useQueryClient();
  const [toast, setToast] = useState<string | null>(null);
  const [recordOpen, setRecordOpen] = useState(false);
  const [correctOpen, setCorrectOpen] = useState(false);

  const detailQ = useQuery({ queryKey: ['person', id], queryFn: () => peopleApi.get(id) });
  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2600);
  };
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['person', id] });
    qc.invalidateQueries({ queryKey: ['people'] });
  };

  const d = detailQ.data;
  const p = d?.person;
  const canAdminister = d?.canAdminister ?? false;

  return (
    <ScreenContainer title={p ? pick(lang, p.nameEn, p.nameLo) : t('manageEmployee')}>
      <Pressable onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }} hitSlop={10}>
        <Icon name="chevronLeft" size={15} color={color.accent700} />
        <Text style={{ fontSize: 12.5, color: color.accent700 }}>{t('tabPeople')}</Text>
      </Pressable>

      {!d || !p ? (
        <LoadingBlock />
      ) : (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
            <View style={{ width: 46, height: 46, borderRadius: 23, borderWidth: 1, borderColor: color.divider, backgroundColor: color.neutral100, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: headingFont('en'), fontWeight: '600', fontSize: 15, color: color.neutral800 }}>{p.initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Body style={{ fontSize: 14 }}>{pick(lang, p.roleTitleEn, p.roleTitleLo)}</Body>
              <Muted style={{ marginTop: 2 }}>{`${t(ROLE_KEY[p.role])} · ID ${p.employeeCode} · ${p.email}`}</Muted>
            </View>
          </View>

          <PunctualityKpiCard kpi={d.punctuality} />

          <PersonalCard person={p} onSaved={invalidate} onFlash={flash} />

          {canAdminister ? <JobPayCard person={p} onSaved={invalidate} onFlash={flash} /> : null}
          {canAdminister ? (
            <EntitlementCard
              personId={id}
              balances={d.leaveBalances}
              onSaved={invalidate}
              onFlash={flash}
            />
          ) : null}

          <View style={{ gap: 10 }}>
            <PrimaryButton label={t('recordLeave')} onPress={() => setRecordOpen(true)} />
            {canAdminister ? <SecondaryButton label={t('correctAttendance')} onPress={() => setCorrectOpen(true)} /> : null}
            {canAdminister ? <ResetPasswordRow personId={id} onFlash={flash} /> : null}
          </View>

          <RecordLeaveModal
            visible={recordOpen}
            onClose={() => setRecordOpen(false)}
            personId={id}
            personName={pick(lang, p.nameEn, p.nameLo)}
            onDone={flash}
          />
          <CorrectAttendanceModal
            visible={correctOpen}
            onClose={() => setCorrectOpen(false)}
            personId={id}
            personName={pick(lang, p.nameEn, p.nameLo)}
            onDone={flash}
          />
        </>
      )}
      {toast ? <View style={{ position: 'absolute', left: 0, right: 0, bottom: 8 }}><Toast message={toast} /></View> : null}
    </ScreenContainer>
  );
}

function PunctualityKpiCard({ kpi }: { kpi: PunctualityDetail }) {
  const { lang, t } = useLanguage();
  const s = levelStyle(kpi.level);
  return (
    <Card style={{ padding: 0, borderColor: s.border, backgroundColor: s.bg }}>
      <View style={{ padding: 15, flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flexShrink: 1 }}>
          <Text style={{ fontSize: 9.5, letterSpacing: 1.5, textTransform: 'uppercase', color: s.fg }}>
            {t('punctualityKpi')} · {periodLabel(kpi.periodMonth, lang)}
          </Text>
          <Text style={{ fontFamily: headingFont('en'), fontSize: 17, marginTop: 5, color: s.fg }}>{t(s.labelKey)}</Text>
          <Text style={{ fontSize: 11.5, marginTop: 5, color: color.neutral700, lineHeight: 16 }}>
            {kpi.leftEarlyCount > 0 ? `${t('leftEarly')} ${kpi.leftEarlyCount} · ` : ''}
            {t('leaveTakenYtd')} {kpi.leaveDaysYtd}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: s.dot }} />
            <Text style={[{ fontFamily: headingFont('en'), fontSize: 30, color: s.fg }, tabularNums]}>{kpi.lateCount}</Text>
          </View>
          <Text style={{ fontSize: 10, color: color.neutral700, marginTop: 2 }}>{t('lateThisMonth')}</Text>
        </View>
      </View>
      {kpi.lateDeduction > 0 ? (
        <View style={{ borderTopWidth: 1, borderTopColor: s.border, padding: 13, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 11.5, color: color.neutral700 }}>{t('lateDeduction')}</Text>
          <Text style={[{ fontFamily: headingFont('en'), fontSize: 16, color: color.danger }, tabularNums]}>−{lak(kpi.lateDeduction)}</Text>
        </View>
      ) : null}
      {kpi.lateRows.length > 0 ? (
        <View style={{ borderTopWidth: 1, borderTopColor: s.border }}>
          {kpi.lateRows.map((row, i) => (
            <View key={row.date} style={{ padding: 11, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: i === 0 ? 0 : 1, borderTopColor: s.border }}>
              <Text style={{ fontSize: 12, color: color.text }}>{formatDateWeekdayShort(row.date, lang)}</Text>
              <Text style={[{ fontSize: 12, color: row.charged ? color.danger : color.neutral600 }, tabularNums]}>
                {`+${Math.floor(row.lateMinutes / 60)}h ${row.lateMinutes % 60}m`}
                {row.charged ? ` · −${lak(row.amount)}` : ` · ${t('noDeduct')}`}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={{ borderTopWidth: 1, borderTopColor: s.border, padding: 13 }}>
          <Muted style={{ fontSize: 11 }}>{t('noLateThisMonth')}</Muted>
        </View>
      )}
    </Card>
  );
}

function SectionHead({ label }: { label: string }) {
  return (
    <View style={{ padding: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: color.divider }}>
      <Text style={{ fontSize: 9.5, letterSpacing: 1.5, textTransform: 'uppercase', color: color.neutral700 }}>{label}</Text>
    </View>
  );
}

function PersonalCard({ person, onSaved, onFlash }: { person: any; onSaved: () => void; onFlash: (m: string) => void }) {
  const { t } = useLanguage();
  const [f, setF] = useState({
    nameEn: person.nameEn,
    nameLo: person.nameLo,
    phone: person.phone ?? '',
    address: person.address ?? '',
    dateOfBirth: person.dateOfBirth ?? '',
    nationalId: person.nationalId ?? '',
    bankAccount: person.bankAccount ?? '',
  });
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  const mut = useMutation({
    mutationFn: () => {
      const body: UpdateEmployeeInput = {
        nameEn: f.nameEn.trim(),
        nameLo: f.nameLo.trim(),
        phone: f.phone.trim() || null,
        address: f.address.trim() || null,
        dateOfBirth: f.dateOfBirth || null,
        nationalId: f.nationalId.trim() || null,
        bankAccount: f.bankAccount.trim() || null,
      };
      return peopleApi.update(person.id, body);
    },
    onSuccess: () => {
      onSaved();
      onFlash(t('employeeUpdated'));
    },
    onError: (e) => onFlash(e instanceof ApiError ? e.message : t('errorGeneric')),
  });

  return (
    <Card style={{ padding: 0 }}>
      <SectionHead label={t('personalInfo')} />
      <View style={{ padding: 16, paddingTop: 12 }}>
        <TextField label={t('nameEnLabel')} value={f.nameEn} onChangeText={set('nameEn')} autoCapitalize="words" />
        <TextField label={t('nameLoLabel')} value={f.nameLo} onChangeText={set('nameLo')} />
        <TextField label={t('phone')} value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" />
        <TextField label={t('address')} value={f.address} onChangeText={set('address')} multiline />
        <View style={{ marginBottom: 14 }}>
          <DateField label={t('dateOfBirth')} value={f.dateOfBirth || '1990-01-01'} onChange={set('dateOfBirth')} />
        </View>
        <TextField label={t('nationalId')} value={f.nationalId} onChangeText={set('nationalId')} autoCapitalize="none" />
        <TextField label={t('bankAccount')} value={f.bankAccount} onChangeText={set('bankAccount')} autoCapitalize="none" />
        <PrimaryButton label={t('saveChanges')} loading={mut.isPending} onPress={() => mut.mutate()} />
      </View>
    </Card>
  );
}

function JobPayCard({ person, onSaved, onFlash }: { person: any; onSaved: () => void; onFlash: (m: string) => void }) {
  const { lang, t } = useLanguage();
  const peopleQ = useQuery({ queryKey: ['people'], queryFn: () => peopleApi.list() });
  const [f, setF] = useState({
    roleTitleEn: person.roleTitleEn,
    roleTitleLo: person.roleTitleLo,
    role: person.role as Role,
    basicSalary: String(person.basicSalary),
    allowance: String(person.allowance),
    otAmount: String(person.otAmount),
    startDate: person.startDate ?? '',
    managerId: (person.managerId ?? '') as string,
  });
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  const managerOptions = useMemo(() => {
    const rows = (peopleQ.data?.people ?? []).filter((r) => r.id !== person.id);
    return [{ key: '', label: t('noManager') }, ...rows.map((r) => ({ key: r.id, label: pick(lang, r.nameEn, r.nameLo) }))];
  }, [peopleQ.data, person.id, lang, t]);

  const mut = useMutation({
    mutationFn: () => {
      const body: UpdateEmployeeInput = {
        roleTitleEn: f.roleTitleEn.trim(),
        roleTitleLo: f.roleTitleLo.trim(),
        role: f.role,
        basicSalary: num(f.basicSalary),
        allowance: num(f.allowance),
        otAmount: num(f.otAmount),
        startDate: f.startDate || null,
        managerId: f.managerId || null,
      };
      return peopleApi.update(person.id, body);
    },
    onSuccess: () => {
      onSaved();
      onFlash(t('employeeUpdated'));
    },
    onError: (e) => onFlash(e instanceof ApiError ? e.message : t('errorGeneric')),
  });

  return (
    <Card style={{ padding: 0 }}>
      <SectionHead label={t('jobAndPay')} />
      <View style={{ padding: 16, paddingTop: 12 }}>
        <TextField label={`${t('roleTitle')} (EN)`} value={f.roleTitleEn} onChangeText={set('roleTitleEn')} autoCapitalize="sentences" />
        <TextField label={`${t('roleTitle')} (ລາວ)`} value={f.roleTitleLo} onChangeText={set('roleTitleLo')} />
        <ChoiceRow
          label={t('systemRole')}
          value={f.role}
          onChange={(r) => setF((s) => ({ ...s, role: r }))}
          options={(['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN'] as Role[]).map((r) => ({ key: r, label: t(ROLE_KEY[r]) }))}
        />
        <ChoiceRow label={t('reportsTo')} value={f.managerId} onChange={set('managerId')} options={managerOptions} />
        <TextField label={t('basicSalaryLabel')} value={f.basicSalary} onChangeText={set('basicSalary')} keyboardType="number-pad" />
        <TextField label={t('allowanceLabel')} value={f.allowance} onChangeText={set('allowance')} keyboardType="number-pad" />
        <TextField label={t('otLabel')} value={f.otAmount} onChangeText={set('otAmount')} keyboardType="number-pad" />
        <View style={{ marginBottom: 14 }}>
          <DateField label={t('startDate')} value={f.startDate || '2020-01-01'} onChange={set('startDate')} />
        </View>
        <PrimaryButton label={t('saveChanges')} loading={mut.isPending} onPress={() => mut.mutate()} />
      </View>
    </Card>
  );
}

function EntitlementCard({
  personId,
  balances,
  onSaved,
  onFlash,
}: {
  personId: string;
  balances: Array<{ leaveType: LeaveType; totalDays: number }>;
  onSaved: () => void;
  onFlash: (m: string) => void;
}) {
  const { t } = useLanguage();
  const initial: Record<string, string> = {};
  for (const ty of ['ANNUAL', 'SICK', 'PERSONAL'] as LeaveType[]) {
    initial[ty] = String(balances.find((b) => b.leaveType === ty)?.totalDays ?? 0);
  }
  const [f, setF] = useState(initial);

  const mut = useMutation({
    mutationFn: (leaveType: LeaveType) =>
      peopleApi.setLeaveBalance(personId, { leaveType, totalDays: Math.max(0, Math.round(Number(f[leaveType]) || 0)) }),
    onSuccess: () => {
      onSaved();
      onFlash(t('entitlementSaved'));
    },
    onError: (e) => onFlash(e instanceof ApiError ? e.message : t('errorGeneric')),
  });

  return (
    <Card style={{ padding: 0 }}>
      <SectionHead label={t('leaveEntitlement')} />
      <View style={{ padding: 16, paddingTop: 12, gap: 4 }}>
        {(['ANNUAL', 'SICK', 'PERSONAL'] as LeaveType[]).map((ty) => (
          <View key={ty} style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <TextField
                label={`${t(LEAVE_KEY[ty])} · ${t('daysPerYear')}`}
                value={f[ty]}
                onChangeText={(v) => setF((s) => ({ ...s, [ty]: v }))}
                keyboardType="number-pad"
              />
            </View>
            <Pressable
              onPress={() => mut.mutate(ty)}
              style={{ minHeight: 48, paddingHorizontal: 14, marginBottom: 14, justifyContent: 'center', borderWidth: 1, borderColor: color.accent, borderRadius: 4, backgroundColor: color.accent100 }}
            >
              <Text style={{ fontSize: 12, color: color.accent800 }}>{t('save')}</Text>
            </Pressable>
          </View>
        ))}
      </View>
    </Card>
  );
}

function ResetPasswordRow({ personId, onFlash }: { personId: string; onFlash: (m: string) => void }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState('');
  const mut = useMutation({
    mutationFn: () => peopleApi.resetPassword(personId, pw),
    onSuccess: () => {
      setPw('');
      setOpen(false);
      onFlash(t('passwordReset'));
    },
    onError: (e) => onFlash(e instanceof ApiError ? e.message : t('errorGeneric')),
  });

  if (!open) return <SecondaryButton label={t('resetPassword')} onPress={() => setOpen(true)} />;
  return (
    <Card>
      <TextField label={t('newPasswordLabel')} value={pw} onChangeText={setPw} autoCapitalize="none" />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <SecondaryButton label={t('cancel')} onPress={() => setOpen(false)} />
        </View>
        <View style={{ flex: 1 }}>
          <PrimaryButton label={t('resetPassword')} loading={mut.isPending} disabled={pw.length < 6} onPress={() => mut.mutate()} />
        </View>
      </View>
    </Card>
  );
}
