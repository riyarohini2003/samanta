import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { defaultScreenOptions } from './screenOptions';
import AdminMoreMenu from '../../screens/admin/AdminMoreMenu';
import BranchesScreen from '../../screens/admin/BranchesScreen';
import BranchDetailScreen from '../../screens/admin/BranchDetailScreen';
import EmployeesScreen from '../../screens/admin/EmployeesScreen';
import EmployeeDetailScreen from '../../screens/admin/EmployeeDetailScreen';
import LoansScreen from '../../screens/shared/LoansScreen';
import LoanDetailScreen from '../../screens/shared/LoanDetailScreen';
import ReportsScreen from '../../screens/admin/ReportsScreen';
import ReportViewScreen from '../../screens/admin/ReportViewScreen';
import AuditLogsScreen from '../../screens/admin/AuditLogsScreen';
import SettingsScreen from '../../screens/admin/SettingsScreen';
import ProfileScreen from '../../screens/shared/ProfileScreen';

const Stack = createNativeStackNavigator();

export default function AdminMoreStack() {
  return (
    <Stack.Navigator screenOptions={defaultScreenOptions}>
      <Stack.Screen name="MoreMenu" component={AdminMoreMenu} options={{ title: 'More' }} />
      <Stack.Screen name="Branches" component={BranchesScreen} options={{ title: 'Branches' }} />
      <Stack.Screen name="BranchDetail" component={BranchDetailScreen} options={{ title: 'Branch Details' }} />
      <Stack.Screen name="Employees" component={EmployeesScreen} options={{ title: 'Employees' }} />
      <Stack.Screen name="EmployeeDetail" component={EmployeeDetailScreen} options={{ title: 'Employee' }} />
      <Stack.Screen name="Loans" component={LoansScreen} options={{ title: 'All Loans' }} />
      <Stack.Screen name="LoanDetail" component={LoanDetailScreen} options={{ title: 'Loan Details' }} />
      <Stack.Screen name="Reports" component={ReportsScreen} options={{ title: 'Reports' }} />
      <Stack.Screen name="ReportView" component={ReportViewScreen} options={{ title: 'Report' }} />
      <Stack.Screen name="AuditLogs" component={AuditLogsScreen} options={{ title: 'Audit Logs' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'My Profile' }} />
    </Stack.Navigator>
  );
}
