import React from 'react';
import { View, StyleSheet } from 'react-native';
import EmptyState from '../../components/EmptyState';
import { colors } from '../../theme';

export default function NotificationsScreen() {
  return (
    <View style={styles.container}>
      <EmptyState
        icon="notifications-none"
        title="No notifications"
        message="You're all caught up! New notifications will appear here."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
});
