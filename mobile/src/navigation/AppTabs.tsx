import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '@/state/AuthContext';
import { useLanguage } from '@/state/LanguageContext';
import { color, bodyFont } from '@/theme/tokens';
import { Icon, ICONS } from '@/components/Icon';

import { AttendanceScreen } from '@/screens/AttendanceScreen';
import { LeaveScreen } from '@/screens/LeaveScreen';
import { PayrollScreen } from '@/screens/PayrollScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { ApprovalsScreen } from '@/screens/ApprovalsScreen';
import { PayrollRunScreen } from '@/screens/PayrollRunScreen';
import { PeopleStack } from '@/navigation/PeopleStack';
import { TeamStack } from '@/navigation/TeamStack';

const Tab = createBottomTabNavigator();

const TAB_CONFIG = {
  EMPLOYEE: [
    { name: 'Attendance', icon: 'clock', labelKey: 'tabAtt', component: AttendanceScreen },
    { name: 'Leave', icon: 'calendar', labelKey: 'tabLeave', component: LeaveScreen },
    { name: 'Payroll', icon: 'card', labelKey: 'tabPay', component: PayrollScreen },
    { name: 'Profile', icon: 'person', labelKey: 'tabMe', component: ProfileScreen },
  ],
  MANAGER: [
    { name: 'Team', icon: 'people', labelKey: 'tabTeam', component: TeamStack },
    { name: 'Approvals', icon: 'checklist', labelKey: 'tabAppr', component: ApprovalsScreen },
    { name: 'Leave', icon: 'calendar', labelKey: 'tabLeave', component: LeaveScreen },
    { name: 'Profile', icon: 'person', labelKey: 'tabMe', component: ProfileScreen },
  ],
  HR: [
    { name: 'PayrollRun', icon: 'card', labelKey: 'tabRun', component: PayrollRunScreen },
    { name: 'Approvals', icon: 'checklist', labelKey: 'tabAppr', component: ApprovalsScreen },
    { name: 'Leave', icon: 'calendar', labelKey: 'tabLeave', component: LeaveScreen },
    { name: 'People', icon: 'people', labelKey: 'tabPeople', component: PeopleStack },
    { name: 'Profile', icon: 'person', labelKey: 'tabMe', component: ProfileScreen },
  ],
  ADMIN: [
    { name: 'PayrollRun', icon: 'card', labelKey: 'tabRun', component: PayrollRunScreen },
    { name: 'Approvals', icon: 'checklist', labelKey: 'tabAppr', component: ApprovalsScreen },
    { name: 'Leave', icon: 'calendar', labelKey: 'tabLeave', component: LeaveScreen },
    { name: 'People', icon: 'people', labelKey: 'tabPeople', component: PeopleStack },
    { name: 'Profile', icon: 'person', labelKey: 'tabMe', component: ProfileScreen },
  ],
} as const;

export function AppTabs() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  if (!user) return null;
  const tabs = TAB_CONFIG[user.role];

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.accent800,
        tabBarInactiveTintColor: color.neutral600,
        tabBarStyle: { borderTopColor: color.divider, paddingBottom: 6, paddingTop: 4, height: 62 },
        tabBarLabelStyle: { fontFamily: bodyFont(lang), fontSize: 10 },
      }}
    >
      {tabs.map((tab) => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={{
            tabBarLabel: t(tab.labelKey as any),
            tabBarIcon: ({ color: c }) => <Icon name={tab.icon as keyof typeof ICONS} color={c} size={20} />,
          }}
        />
      ))}
    </Tab.Navigator>
  );
}
