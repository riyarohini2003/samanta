import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import Avatar from '../../components/Avatar';
import Card from '../../components/Card';
import { colors, fontSize, fontWeight, spacing, radius } from '../../theme';

interface MenuItem {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  screen: string;
  color: string;
  description: string;
}

const MENU_ITEMS: MenuItem[] = [
  { icon: 'account-balance', label: 'All Loans', screen: 'Loans', color: colors.primary, description: 'View all loan accounts' },
  { icon: 'business', label: 'Branches', screen: 'Branches', color: colors.info, description: 'Manage branches' },
  { icon: 'people', label: 'Employees', screen: 'Employees', color: colors.secondary, description: 'Manage employees' },
  { icon: 'assessment', label: 'Reports', screen: 'Reports', color: colors.success, description: '12 report templates' },
  { icon: 'history', label: 'Audit Logs', screen: 'AuditLogs', color: colors.warning, description: 'Activity trail' },
  { icon: 'settings', label: 'Settings', screen: 'Settings', color: colors.textSecondary, description: 'App configuration' },
];

export default function AdminMoreMenu() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Summary */}
      <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
        <Card style={styles.profileCard}>
          <View style={styles.profileRow}>
            <Avatar name={user?.name || ''} size={48} />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.name}</Text>
              <Text style={styles.profileRole}>{user?.role.replace('_', ' ')}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={colors.textTertiary} />
          </View>
        </Card>
      </TouchableOpacity>

      {/* Menu Items */}
      <Text style={styles.sectionTitle}>Management</Text>
      {MENU_ITEMS.map((item) => (
        <TouchableOpacity
          key={item.screen}
          style={styles.menuItem}
          onPress={() => navigation.navigate(item.screen)}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIcon, { backgroundColor: item.color + '15' }]}>
            <MaterialIcons name={item.icon} size={22} color={item.color} />
          </View>
          <View style={styles.menuInfo}>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Text style={styles.menuDesc}>{item.description}</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={colors.textTertiary} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing['5xl'] },
  profileCard: { marginBottom: spacing.xl },
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  profileInfo: { flex: 1, marginLeft: spacing.md },
  profileName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
  profileRole: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuInfo: { flex: 1, marginLeft: spacing.md },
  menuLabel: { fontSize: fontSize.base, fontWeight: fontWeight.medium, color: colors.text },
  menuDesc: { fontSize: fontSize.xs, color: colors.textTertiary, marginTop: 2 },
});
