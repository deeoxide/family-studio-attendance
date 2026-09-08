import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts as useCormorant, CormorantGaramond_400Regular, CormorantGaramond_600SemiBold } from '@expo-google-fonts/cormorant-garamond';
import { useFonts as useLora, Lora_400Regular, Lora_600SemiBold } from '@expo-google-fonts/lora';
import { useFonts as useNotoLao, NotoSansLao_400Regular, NotoSansLao_500Medium, NotoSansLao_600SemiBold } from '@expo-google-fonts/noto-sans-lao';
import { View, ActivityIndicator } from 'react-native';

import { AuthProvider } from '@/state/AuthContext';
import { LanguageProvider } from '@/state/LanguageContext';
import { queryClient } from '@/api/queryClient';
import { RootNavigator } from '@/navigation/RootNavigator';
import { color } from '@/theme/tokens';

export default function App() {
  const [cormorantLoaded] = useCormorant({ CormorantGaramond_400Regular, CormorantGaramond_600SemiBold });
  const [loraLoaded] = useLora({ Lora_400Regular, Lora_600SemiBold });
  const [laoLoaded] = useNotoLao({ NotoSansLao_400Regular, NotoSansLao_500Medium, NotoSansLao_600SemiBold });

  const fontsReady = cormorantLoaded && loraLoaded && laoLoaded;

  if (!fontsReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: color.bg }}>
        <ActivityIndicator color={color.accent} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <AuthProvider>
            <StatusBar style="dark" />
            <RootNavigator />
          </AuthProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
