import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { defaultScreenOptions } from './screenOptions';
import DashboardScreen from '../../screens/shared/DashboardScreen';
import LoanDetailScreen from '../../screens/shared/LoanDetailScreen';
import CustomerDetailScreen from '../../screens/shared/CustomerDetailScreen';
import NotificationsScreen from '../../screens/shared/NotificationsScreen';

const Stack = createNativeStackNavigator();

export default function AdminDashboardStack() {
  return (
    <Stack.Navigator screenOptions={defaultScreenOptions}>
      <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Dashboard' }} />
      <Stack.Screen name="LoanDetail" component={LoanDetailScreen} options={{ title: 'Loan Details' }} />
      <Stack.Screen name="CustomerDetail" component={CustomerDetailScreen} options={{ title: 'Customer' }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
    </Stack.Navigator>
  );
}
