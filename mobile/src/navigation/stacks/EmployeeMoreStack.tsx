import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { defaultScreenOptions } from './screenOptions';
import EmployeeMoreMenu from '../../screens/employee/EmployeeMoreMenu';
import PerformanceScreen from '../../screens/employee/PerformanceScreen';
import LoanApplicationsScreen from '../../screens/admin/LoanApplicationsScreen';
import LoanApplicationDetailScreen from '../../screens/admin/LoanApplicationDetailScreen';
import CreateLoanApplicationScreen from '../../screens/employee/CreateLoanApplicationScreen';
import ProfileScreen from '../../screens/shared/ProfileScreen';

const Stack = createNativeStackNavigator();

export default function EmployeeMoreStack() {
  return (
    <Stack.Navigator screenOptions={defaultScreenOptions}>
      <Stack.Screen name="MoreMenu" component={EmployeeMoreMenu} options={{ title: 'More' }} />
      <Stack.Screen name="Performance" component={PerformanceScreen} options={{ title: 'My Performance' }} />
      <Stack.Screen name="LoanApplications" component={LoanApplicationsScreen} options={{ title: 'My Applications' }} />
      <Stack.Screen name="LoanApplicationDetail" component={LoanApplicationDetailScreen} options={{ title: 'Application' }} />
      <Stack.Screen name="CreateLoanApplication" component={CreateLoanApplicationScreen} options={{ title: 'New Application' }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'My Profile' }} />
    </Stack.Navigator>
  );
}
