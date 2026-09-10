import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/state/AuthContext';
import { useLanguage } from '@/state/LanguageContext';
import { color, radius, bodyFont, headingFont } from '@/theme/tokens';
import { Body, Kicker, PrimaryButton, ErrorNote } from '@/components/ui';
import { ApiError } from '@/api/client';

export function LoginScreen() {
  const { login } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('errorGeneric'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={{ alignSelf: 'flex-end' }}>
            <Pressable
              onPress={() => setLang(lang === 'en' ? 'lo' : 'en')}
              style={{ borderWidth: 1, borderColor: color.divider, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 8 }}
            >
              <Text style={{ fontFamily: bodyFont(lang), fontSize: 12, color: color.neutral700 }}>{lang === 'en' ? 'ລາວ' : 'EN'}</Text>
            </Pressable>
          </View>

          <View style={{ marginTop: 28, marginBottom: 34 }}>
            <Kicker>{t('appName')} · attendance, leave, payroll</Kicker>
            <Text style={{ fontFamily: headingFont(lang), fontWeight: lang === 'en' ? '400' : '600', fontSize: 34, color: color.text, marginTop: 8 }}>
              {t('login')}
            </Text>
          </View>

          <Field label={t('email')} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <Field label={t('password')} value={password} onChangeText={setPassword} secureTextEntry />

          {error ? <ErrorNote message={error} /> : null}

          <View style={{ marginTop: 8 }}>
            <PrimaryButton label={t('loginCta')} onPress={onSubmit} loading={loading} disabled={!email || !password} />
          </View>

          <Body style={{ marginTop: 22, fontSize: 11.5, color: color.neutral700, textAlign: 'center' }}>
            Demo accounts: somchai@familystudio.la (manager) · phetsamone@familystudio.la (employee) ·{'\n'}
            manivone@familystudio.la (HR) — password "familystudio" for all.
          </Body>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'email-address';
  autoCapitalize?: 'none';
}) {
  const { lang } = useLanguage();
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontFamily: bodyFont(lang), fontSize: 12, color: color.neutral700, marginBottom: 6 }}>{props.label}</Text>
      <TextInput
        value={props.value}
        onChangeText={props.onChangeText}
        secureTextEntry={props.secureTextEntry}
        keyboardType={props.keyboardType}
        autoCapitalize={props.autoCapitalize}
        style={{
          minHeight: 48,
          borderWidth: 1,
          borderColor: color.divider,
          borderRadius: radius.md,
          paddingHorizontal: 12,
          fontFamily: bodyFont(lang),
          fontSize: 14,
          color: color.text,
          backgroundColor: color.white,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, paddingTop: 12 },
});
