import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TeamScreen } from '@/screens/TeamScreen';
import { PersonDetailScreen } from '@/screens/PersonDetailScreen';

const Stack = createNativeStackNavigator();

/** Team tab (Manager): roll call → direct report detail (personal info, record leave). */
export function TeamStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TeamRoll" component={TeamScreen} />
      <Stack.Screen name="PersonDetail" component={PersonDetailScreen} />
    </Stack.Navigator>
  );
}
