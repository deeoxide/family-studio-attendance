import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ScreenContainer } from '@/components/ScreenContainer';
import { Card, ErrorNote, Muted, PrimaryButton } from '@/components/ui';
import { TextField, ChoiceRow } from '@/components/Field';
import { DateField } from '@/components/DateField';
import { Icon } from '@/components/Icon';
import { useLanguage } from '@/state/LanguageContext';
import { peopleApi } from '@/api/endpoints';
import { ApiError } from '@/api/client';
import type { RegisterEmployeeInput, Role } from '@/api/types';
import { color } from '@/theme/tokens';
import { pick } from '@/lib/format';

const ROLE_KEY: Record<Role, 'roleEmp' | 'roleMgr' | 'roleHr' | 'roleAdmin'> = {
  EMPLOYEE: 'roleEmp',
  MANAGER: 'roleMgr',
  HR: 'roleHr',
  ADMIN: 'roleAdmin',
};
const num = (s: string) => Math.max(0, Math.round(Number(s.replace(/[^\d]/g, '')) || 0));

export function RegisterEmployeeScreen({ navigation }: any) {
  const { lang, t } = useLanguage();
  const qc = useQueryClient();
  const peopleQ = useQuery({ queryKey: ['people'], queryFn: () => peopleApi.list() });
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({
    nameEn: '',
    nameLo: '',
    email: '',
    employeeCode: '',
    roleTitleEn: '',
    roleTitleLo: '',
    role: 'EMPLOYEE' as Role,
    managerId: '',
    password: '',
    basicSalary: '',
    allowance: '',
    otAmount: '',
    phone: '',
    address: '',
    dateOfBirth: '',
    startDate: '',
    nationalId: '',
    bankAccount: '',
  });
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  const managerOptions = useMemo(
    () => [
      { key: '', label: t('noManager') },
      ...(peopleQ.data?.people ?? []).map((r) => ({ key: r.id, label: pick(lang, r.nameEn, r.nameLo) })),
    ],
    [peopleQ.data, lang, t],
  );

  const mut = useMutation({
    mutationFn: () => {
      const body: RegisterEmployeeInput = {
        email: f.email.trim().toLowerCase(),
        nameEn: f.nameEn.trim(),
        nameLo: f.nameLo.trim(),
        roleTitleEn: f.roleTitleEn.trim(),
        roleTitleLo: f.roleTitleLo.trim(),
        role: f.role,
        password: f.password,
        basicSalary: num(f.basicSalary),
        allowance: num(f.allowance),
        otAmount: num(f.otAmount),
        managerId: f.managerId || undefined,
        employeeCode: f.employeeCode.trim() || undefined,
        phone: f.phone.trim() || undefined,
        address: f.address.trim() || undefined,
        dateOfBirth: f.dateOfBirth || undefined,
        startDate: f.startDate || undefined,
        nationalId: f.nationalId.trim() || undefined,
        bankAccount: f.bankAccount.trim() || undefined,
      };
      return peopleApi.register(body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['people'] });
      navigation.goBack();
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : t('errorGeneric')),
  });

  const ready =
    f.nameEn.trim() && f.nameLo.trim() && f.email.trim() && f.roleTitleEn.trim() && f.roleTitleLo.trim() && f.password.length >= 6;

  return (
    <ScreenContainer title={t('newEmployee')}>
      <Pressable onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }} hitSlop={10}>
        <Icon name="chevronLeft" size={15} color={color.accent700} />
        <Text style={{ fontSize: 12.5, color: color.accent700 }}>{t('tabPeople')}</Text>
      </Pressable>

      <Card>
        <TextField label={t('nameEnLabel')} value={f.nameEn} onChangeText={set('nameEn')} autoCapitalize="words" />
        <TextField label={t('nameLoLabel')} value={f.nameLo} onChangeText={set('nameLo')} />
        <TextField label={t('email')} value={f.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" />
        <TextField label={t('employeeCodeLabel')} value={f.employeeCode} onChangeText={set('employeeCode')} hint={t('employeeCodeAuto')} autoCapitalize="none" />
        <TextField label={t('temporaryPassword')} value={f.password} onChangeText={set('password')} autoCapitalize="none" />
      </Card>

      <Card>
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
      </Card>

      <Card>
        <TextField label={t('phone')} value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" />
        <TextField label={t('address')} value={f.address} onChangeText={set('address')} multiline />
        <View style={{ marginBottom: 14 }}>
          <DateField label={t('dateOfBirth')} value={f.dateOfBirth || '1995-01-01'} onChange={set('dateOfBirth')} />
        </View>
        <View style={{ marginBottom: 14 }}>
          <DateField label={t('startDate')} value={f.startDate || '2025-01-01'} onChange={set('startDate')} />
        </View>
        <TextField label={t('nationalId')} value={f.nationalId} onChangeText={set('nationalId')} autoCapitalize="none" />
        <TextField label={t('bankAccount')} value={f.bankAccount} onChangeText={set('bankAccount')} autoCapitalize="none" />
      </Card>

      {error ? <ErrorNote message={error} /> : null}
      <PrimaryButton label={t('createEmployee')} loading={mut.isPending} disabled={!ready} onPress={() => { setError(null); mut.mutate(); }} />
      <Muted style={{ textAlign: 'center' }}>{t('employeeCodeAuto')}</Muted>
    </ScreenContainer>
  );
}
