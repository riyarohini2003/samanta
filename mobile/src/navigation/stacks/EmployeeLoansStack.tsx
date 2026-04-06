import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { defaultScreenOptions } from './screenOptions';
import LoansScreen from '../../screens/shared/LoansScreen';
import LoanDetailScreen from '../../screens/shared/LoanDetailScreen';

const Stack = createNativeStackNavigator();

export default function EmployeeLoansStack() {
  return (
    <Stack.Navigator screenOptions={defaultScreenOptions}>
      <Stack.Screen name="Loans" component={LoansScreen} options={{ title: 'My Loans' }} />
      <Stack.Screen name="LoanDetail" component={LoanDetailScreen} options={{ title: 'Loan Details' }} />
    </Stack.Navigator>
  );
}
