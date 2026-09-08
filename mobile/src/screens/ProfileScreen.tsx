import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScreenContainer } from '@/components/ScreenContainer';
import { Card, Muted, SecondaryButton } from '@/components/ui';
import { useAuth } from '@/state/AuthContext';
import { useLanguage } from '@/state/LanguageContext';
import { officeApi } from '@/api/endpoints';
import { color, headingFont, bodyFont, radius } from '@/theme/tokens';
import { pick } from '@/lib/format';

const PREFS_KEY = 'attendance.prefs';
type PrefKey = 'late' | 'payslip' | 'holiday';
const DEFAULT_PREFS: Record<PrefKey, boolean> = { late: true, payslip: true, holiday: false };

export function ProfileScreen() {
  const { user, logout } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const officeQ = useQuery({ queryKey: ['office'], queryFn: () => officeApi.get().then((r) => r.office) });
  const [prefs, setPrefs] = useState<Record<PrefKey, boolean>>(DEFAULT_PREFS);

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
    </ScreenContainer>
  );
}
