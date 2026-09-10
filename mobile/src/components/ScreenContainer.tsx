import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/state/AuthContext';
import { useLanguage } from '@/state/LanguageContext';
import { color, radius, bodyFont, headingFont, kickerStyle } from '@/theme/tokens';

const ROLE_LABEL_KEY = { EMPLOYEE: 'roleEmp', MANAGER: 'roleMgr', HR: 'roleHr', ADMIN: 'roleAdmin' } as const;

export function ScreenContainer({
  title,
  scroll = true,
  refreshControl,
  children,
}: {
  title: string;
  scroll?: boolean;
  refreshControl?: React.ReactElement;
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const { lang, setLang, t } = useLanguage();

  const Content = scroll ? ScrollView : View;
  const contentProps = scroll
    ? { contentContainerStyle: styles.scrollContent, refreshControl, showsVerticalScrollIndicator: false }
    : { style: { flex: 1 } };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.white }} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View style={{ flexShrink: 1 }}>
          <Text style={{ fontFamily: bodyFont(lang), ...kickerStyle() }}>
            {user ? t(ROLE_LABEL_KEY[user.role]) : ''}
          </Text>
          <Text style={{ fontFamily: headingFont(lang), fontWeight: lang === 'en' ? '600' : undefined, fontSize: 21, color: color.text, marginTop: 3 }}>
            {title}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
          <View style={styles.langSwitch}>
            {(['en', 'lo'] as const).map((l, i) => (
              <Pressable
                key={l}
                onPress={() => setLang(l)}
                style={{
                  minHeight: 34,
                  minWidth: 38,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderLeftWidth: i === 0 ? 0 : 1,
                  borderLeftColor: color.divider,
                  paddingHorizontal: 8,
                  backgroundColor: lang === l ? color.accent100 : color.white,
                }}
              >
                <Text style={{ fontFamily: bodyFont(lang), fontSize: 11.5, color: lang === l ? color.accent800 : color.neutral700 }}>
                  {l === 'en' ? 'EN' : 'ລາວ'}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.avatar}>
            <Text style={{ fontFamily: headingFont(lang), fontWeight: '600', fontSize: 13, color: color.neutral800 }}>{user?.initials}</Text>
          </View>
        </View>
      </View>
      <Content {...(contentProps as any)}>{children}</Content>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: color.divider,
  },
  langSwitch: { flexDirection: 'row', borderWidth: 1, borderColor: color.divider, borderRadius: radius.md, overflow: 'hidden' },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: color.divider,
    backgroundColor: color.neutral100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: { padding: 20, paddingBottom: 40, gap: 16 },
});
