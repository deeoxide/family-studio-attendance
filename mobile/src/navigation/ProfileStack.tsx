import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { AttendanceScreen } from '@/screens/AttendanceScreen';

const Stack = createNativeStackNavigator();

/**
 * Profile tab. Managers and employees reach their own attendance from the
 * Attendance tab; HR / Admin don't have that tab (their bar is already full),
 * so they open it from a row on the Profile screen — that push lives here.
 */
export function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileHome" component={ProfileScreen} />
      <Stack.Screen name="MyAttendance">
        {(props) => <AttendanceScreen {...props} showBack />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
