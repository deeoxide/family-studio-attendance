import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PeopleScreen } from '@/screens/PeopleScreen';
import { PersonDetailScreen } from '@/screens/PersonDetailScreen';
import { RegisterEmployeeScreen } from '@/screens/RegisterEmployeeScreen';

const Stack = createNativeStackNavigator();

/** People tab (HR / Admin): directory → person detail / edit, and register. */
export function PeopleStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PeopleList" component={PeopleScreen} />
      <Stack.Screen name="PersonDetail" component={PersonDetailScreen} />
      <Stack.Screen name="RegisterEmployee" component={RegisterEmployeeScreen} />
    </Stack.Navigator>
  );
}
