import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { defaultScreenOptions } from './screenOptions';
import LoanApplicationsScreen from '../../screens/admin/LoanApplicationsScreen';
import LoanApplicationDetailScreen from '../../screens/admin/LoanApplicationDetailScreen';
import CreateLoanApplicationScreen from '../../screens/employee/CreateLoanApplicationScreen';
import CustomerDetailScreen from '../../screens/shared/CustomerDetailScreen';

const Stack = createNativeStackNavigator();

export default function AdminApplicationsStack() {
  return (
    <Stack.Navigator screenOptions={defaultScreenOptions}>
      <Stack.Screen name="LoanApplications" component={LoanApplicationsScreen} options={{ title: 'Loan Applications' }} />
      <Stack.Screen name="LoanApplicationDetail" component={LoanApplicationDetailScreen} options={{ title: 'Application Details' }} />
      <Stack.Screen name="CreateLoanApplication" component={CreateLoanApplicationScreen} options={{ title: 'New Application' }} />
      <Stack.Screen name="CustomerDetail" component={CustomerDetailScreen} options={{ title: 'Customer' }} />
    </Stack.Navigator>
  );
}
