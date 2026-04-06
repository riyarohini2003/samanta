import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { defaultScreenOptions } from './screenOptions';
import CollectionsScreen from '../../screens/shared/CollectionsScreen';
import CollectionPayScreen from '../../screens/shared/CollectionPayScreen';
import LoanDetailScreen from '../../screens/shared/LoanDetailScreen';

const Stack = createNativeStackNavigator();

export default function EmployeeCollectionsStack() {
  return (
    <Stack.Navigator screenOptions={defaultScreenOptions}>
      <Stack.Screen name="Collections" component={CollectionsScreen} options={{ title: 'Collections' }} />
      <Stack.Screen name="CollectionPay" component={CollectionPayScreen} options={{ title: 'Record Payment' }} />
      <Stack.Screen name="LoanDetail" component={LoanDetailScreen} options={{ title: 'Loan Details' }} />
    </Stack.Navigator>
  );
}
