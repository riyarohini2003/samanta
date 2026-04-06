import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { defaultScreenOptions } from './screenOptions';
import CustomersScreen from '../../screens/shared/CustomersScreen';
import CustomerDetailScreen from '../../screens/shared/CustomerDetailScreen';
import CreateCustomerScreen from '../../screens/shared/CreateCustomerScreen';
import LoanDetailScreen from '../../screens/shared/LoanDetailScreen';

const Stack = createNativeStackNavigator();

export default function EmployeeCustomersStack() {
  return (
    <Stack.Navigator screenOptions={defaultScreenOptions}>
      <Stack.Screen name="Customers" component={CustomersScreen} options={{ title: 'Customers' }} />
      <Stack.Screen name="CustomerDetail" component={CustomerDetailScreen} options={{ title: 'Customer' }} />
      <Stack.Screen name="CreateCustomer" component={CreateCustomerScreen} options={{ title: 'New Customer' }} />
      <Stack.Screen name="LoanDetail" component={LoanDetailScreen} options={{ title: 'Loan Details' }} />
    </Stack.Navigator>
  );
}
