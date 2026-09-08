import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '@/state/AuthContext';
import { color } from '@/theme/tokens';
import { LoginScreen } from '@/screens/LoginScreen';
import { AppTabs } from '@/navigation/AppTabs';

export function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: color.bg }}>
        <ActivityIndicator color={color.accent} />
      </View>
    );
  }

  return <NavigationContainer>{user ? <AppTabs /> : <LoginScreen />}</NavigationContainer>;
}
