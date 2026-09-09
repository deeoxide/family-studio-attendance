import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScreenContainer } from '@/components/ScreenContainer';
import { Card, Muted, PrimaryButton, SecondaryButton, Toast } from '@/components/ui';
import { TextField } from '@/components/Field';
import { DateField } from '@/components/DateField';
import { useAuth } from '@/state/AuthContext';
import { useLanguage } from '@/state/LanguageContext';
import { officeApi, authApi } from '@/api/endpoints';
import { ApiError } from '@/api/client';
import type { UpdateMeInput } from '@/api/types';
import { color, headingFont, bodyFont, radius } from '@/theme/tokens';
import { pick, formatDateShort } from '@/lib/format';

const PREFS_KEY = 'attendance.prefs';
type PrefKey = 'late' | 'payslip' | 'holiday';
const DEFAULT_PREFS: Record<PrefKey, boolean> = { late: true, payslip: true, holiday: false };

export function ProfileScreen() {
  const { user, logout, refreshMe } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const officeQ = useQuery({ queryKey: ['office'], queryFn: () => officeApi.get().then((r) => r.office) });
  const [prefs, setPrefs] = useState<Record<PrefKey, boolean>>(DEFAULT_PREFS);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(PREFS_KEY).then((raw) => {
      if (raw) {
        try {
          setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) });
        } catch {}
      }
    });
  }, []);

  const toggle = (key: PrefKey) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next)).catch(() => {});
  };

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  const office = officeQ.data;
  const settingLabels: Array<{ key: PrefKey; label: string }> = [
    { key: 'late', label: 'Remind me at 08:45' },
    { key: 'payslip', label: 'Notify when the payslip is ready' },
    { key: 'holiday', label: 'Holiday notices' },
  ];

  if (!user) return null;

  return (
    <ScreenContainer title={t('tabMe')}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: color.divider }}>
        <View style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 1, borderColor: color.divider, backgroundColor: color.neutral100, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: headingFont('en'), fontWeight: '600', fontSize: 19, color: color.neutral800 }}>{user.initials}</Text>
        </View>
        <View>
          <Text style={{ fontFamily: headingFont(lang), fontWeight: lang === 'en' ? '600' : undefined, fontSize: 19, color: color.text }}>
            {pick(lang, user.nameEn, user.nameLo)}
          </Text>
          <Muted style={{ marginTop: 2 }}>{`${pick(lang, user.roleTitleEn, user.roleTitleLo)} · ID ${user.employeeCode}`}</Muted>
        </View>
      </View>

      <PersonalInfoCard onSaved={refreshMe} onFlash={flash} />

      {office ? (
        <Card style={{ padding: 0 }}>
          <View style={{ padding: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: color.divider }}>
            <Text style={{ fontSize: 9.5, letterSpacing: 1.5, textTransform: 'uppercase', color: color.neutral700 }}>{t('workplace')}</Text>
          </View>
          <View style={{ padding: 14, paddingHorizontal: 16, gap: 7 }}>
            <Text style={{ fontSize: 13, color: color.text }}>{office.name}</Text>
            <Muted>
              {pick(lang, office.addressEn, office.addressLo)}
              {'\n'}
              {`${office.lat.toFixed(4)}° N, ${office.lng.toFixed(4)}° E · radius ${office.radiusM} m`}
            </Muted>
            <Muted>{t('shiftNote')}</Muted>
          </View>
        </Card>
      ) : null}

      <Card style={{ padding: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: color.divider }}>
          <Text style={{ fontSize: 13, color: color.text }}>{t('language')}</Text>
          <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: color.divider, borderRadius: radius.md, overflow: 'hidden' }}>
            {(['en', 'lo'] as const).map((l, i) => (
              <Pressable
                key={l}
                onPress={() => setLang(l)}
                style={{ minHeight: 38, minWidth: 56, alignItems: 'center', justifyContent: 'center', borderLeftWidth: i === 0 ? 0 : 1, borderLeftColor: color.divider, backgroundColor: lang === l ? color.accent100 : color.white, paddingHorizontal: 8 }}
              >
                <Text style={{ fontFamily: bodyFont(lang), fontSize: 12, color: lang === l ? color.accent800 : color.neutral700 }}>{l === 'en' ? 'English' : 'ລາວ'}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        {settingLabels.map((s, i) => (
          <View key={s.key} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, paddingHorizontal: 16, borderBottomWidth: i === settingLabels.length - 1 ? 0 : 1, borderBottomColor: color.divider }}>
            <Text style={{ fontSize: 13, flexShrink: 1, color: color.text }}>{s.label}</Text>
            <Pressable
              onPress={() => toggle(s.key)}
              style={{ width: 44, height: 26, borderRadius: 99, borderWidth: 1, borderColor: prefs[s.key] ? color.accent : color.neutral300, backgroundColor: prefs[s.key] ? color.accent200 : color.neutral200, justifyContent: 'center' }}
            >
              <View style={{ position: 'absolute', top: 1.5, left: prefs[s.key] ? 20 : 2, width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: prefs[s.key] ? color.accent : color.neutral300 }} />
            </Pressable>
          </View>
        ))}
      </Card>

      <SecondaryButton label={t('signOut')} onPress={logout} />
      {toast ? <View style={{ position: 'absolute', left: 0, right: 0, bottom: 8 }}><Toast message={toast} /></View> : null}
    </ScreenContainer>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  const { t } = useLanguage();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: color.divider }}>
      <Muted style={{ fontSize: 12 }}>{label}</Muted>
      <Text style={{ fontSize: 12.5, color: value ? color.text : color.neutral500, flexShrink: 1, textAlign: 'right' }}>
        {value || t('notSet')}
      </Text>
    </View>
  );
}

function PersonalInfoCard({ onSaved, onFlash }: { onSaved: () => Promise<void>; onFlash: (m: string) => void }) {
  const { user } = useAuth();
  const { lang, t } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Required<UpdateMeInput>>({
    phone: '',
    address: '',
    dateOfBirth: '',
    nationalId: '',
    bankAccount: '',
  });

  useEffect(() => {
    if (user) {
      setForm({
        phone: user.phone ?? '',
        address: user.address ?? '',
        dateOfBirth: user.dateOfBirth ?? '',
        nationalId: user.nationalId ?? '',
        bankAccount: user.bankAccount ?? '',
      });
    }
  }, [user, editing]);

  const saveMut = useMutation({
    mutationFn: () => authApi.updateMe(form),
    onSuccess: async () => {
      await onSaved();
      setEditing(false);
      onFlash(t('savedToast'));
    },
    onError: (e) => onFlash(e instanceof ApiError ? e.message : t('errorGeneric')),
  });

  if (!user) return null;
  const set = (k: keyof UpdateMeInput) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Card style={{ padding: 0 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: color.divider }}>
        <Text style={{ fontSize: 9.5, letterSpacing: 1.5, textTransform: 'uppercase', color: color.neutral700 }}>{t('personalInfo')}</Text>
        {!editing ? (
          <Pressable onPress={() => setEditing(true)} hitSlop={10}>
            <Text style={{ fontSize: 12, color: color.accent700 }}>{t('edit')}</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={{ padding: 16, paddingTop: 12 }}>
        {editing ? (
          <>
            <TextField label={t('phone')} value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" />
            <TextField label={t('address')} value={form.address} onChangeText={set('address')} multiline />
            <View style={{ marginBottom: 14 }}>
              <DateField label={t('dateOfBirth')} value={form.dateOfBirth || '1990-01-01'} onChange={set('dateOfBirth')} />
            </View>
            <TextField label={t('nationalId')} value={form.nationalId} onChangeText={set('nationalId')} autoCapitalize="none" />
            <TextField label={t('bankAccount')} value={form.bankAccount} onChangeText={set('bankAccount')} autoCapitalize="none" />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 2 }}>
              <View style={{ flex: 1 }}>
                <SecondaryButton label={t('cancel')} onPress={() => setEditing(false)} />
              </View>
              <View style={{ flex: 1 }}>
                <PrimaryButton label={t('saveChanges')} onPress={() => saveMut.mutate()} loading={saveMut.isPending} />
              </View>
            </View>
          </>
        ) : (
          <>
            <InfoRow label={t('phone')} value={user.phone} />
            <InfoRow label={t('address')} value={user.address} />
            <InfoRow label={t('dateOfBirth')} value={user.dateOfBirth ? formatDateShort(user.dateOfBirth, lang) : null} />
            <InfoRow label={t('nationalId')} value={user.nationalId} />
            <InfoRow label={t('bankAccount')} value={user.bankAccount} />
            <InfoRow label={t('startDate')} value={user.startDate ? formatDateShort(user.startDate, lang) : null} />
            <Muted style={{ fontSize: 10.5, marginTop: 8 }}>{t('hrOnlyNote')}</Muted>
          </>
        )}
      </View>
    </Card>
  );
}
