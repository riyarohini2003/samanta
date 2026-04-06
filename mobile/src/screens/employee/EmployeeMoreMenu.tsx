import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import Avatar from '../../components/Avatar';
import { colors, fontSize, fontWeight, spacing, radius } from '../../theme';

interface MenuItem {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  screen: string;
  color: string;
  description: string;
}

const MENU_ITEMS: MenuItem[] = [
  { icon: 'trending-up', label: 'My Performance', screen: 'Performance', color: colors.success, description: 'Collection stats and trends' },
  { icon: 'description', label: 'My Applications', screen: 'LoanApplications', color: colors.primary, description: 'Loan applications I created' },
  { icon: 'note-add', label: 'New Application', screen: 'CreateLoanApplication', color: colors.warning, description: 'Create a new loan application' },
];

export default function EmployeeMoreMenu() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Summary */}
      <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
        <View style={styles.profileCard}>
          <View style={styles.profileRow}>
            <Avatar name={user?.name || ''} size={48} />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.name}</Text>
              <Text style={styles.profileRole}>Employee | {user?.branch?.name || 'Branch'}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={colors.textTertiary} />
          </View>
        </View>
      </TouchableOpacity>

      {/* Menu Items */}
      <Text style={styles.sectionTitle}>Tools</Text>
      {MENU_ITEMS.map((item) => (
        <TouchableOpacity
          key={item.screen}
          style={styles.menuItem}
          onPress={() => navigation.navigate(item.screen, {})}
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
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
  },
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  profileInfo: { flex: 1, marginLeft: spacing.md },
  profileName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
  profileRole: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  sectionTitle: {
    fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textTertiary,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.md,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.lg,
    marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border,
  },
  menuIcon: { width: 40, height: 40, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center' },
  menuInfo: { flex: 1, marginLeft: spacing.md },
  menuLabel: { fontSize: fontSize.base, fontWeight: fontWeight.medium, color: colors.text },
  menuDesc: { fontSize: fontSize.xs, color: colors.textTertiary, marginTop: 2 },
});
