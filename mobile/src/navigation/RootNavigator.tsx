import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import LoadingScreen from '../components/LoadingScreen';
import AuthNavigator from './AuthNavigator';
import AdminTabNavigator from './AdminTabNavigator';
import EmployeeTabNavigator from './EmployeeTabNavigator';
import { ADMIN_ROLES, MANAGEMENT_ROLES } from '../utils/constants';

export default function RootNavigator() {
  const { isLoading, isAuthenticated, user } = useAuth();

  if (isLoading) {
    return <LoadingScreen message="Loading..." />;
  }

  if (!isAuthenticated || !user) {
    return <AuthNavigator />;
  }

  // Admin & management roles get the admin tab layout
  if (
    (ADMIN_ROLES as readonly string[]).includes(user.role) ||
    (MANAGEMENT_ROLES as readonly string[]).includes(user.role)
  ) {
    return <AdminTabNavigator />;
  }

  // Employee gets employee tab layout
  return <EmployeeTabNavigator />;
}
