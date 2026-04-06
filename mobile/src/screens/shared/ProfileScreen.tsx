import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { authApi } from '../../api';
import Card from '../../components/Card';
import Avatar from '../../components/Avatar';
import { colors, fontSize, fontWeight, spacing, radius } from '../../theme';
import { formatDate } from '../../utils/formatters';
import { ApiError } from '../../types';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const handleChangePassword = async () => {
    if (!currentPw || !newPw) {
      Alert.alert('Validation', 'Please fill in both fields');
      return;
    }
    if (newPw.length < 6) {
      Alert.alert('Validation', 'New password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await authApi.changePassword(currentPw, newPw);
      Alert.alert('Success', 'Password changed successfully');
      setShowChangePassword(false);
      setCurrentPw('');
      setNewPw('');
    } catch (err) {
      const apiErr = err as ApiError;
      Alert.alert('Error', apiErr.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Header */}
      <Card style={styles.profileCard}>
        <View style={styles.profileCenter}>
          <Avatar name={user.name} size={80} />
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.role}>{user.role.replace('_', ' ')}</Text>
          <Text style={styles.loginId}>@{user.loginId}</Text>
        </View>
      </Card>

      {/* Info */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Account Information</Text>
        <InfoRow icon="badge" label="Employee Code" value={user.employeeCode || user.loginId} />
        <InfoRow icon="email" label="Email" value={user.email || 'Not set'} />
        <InfoRow icon="phone" label="Mobile" value={user.mobile || 'Not set'} />
        <InfoRow icon="business" label="Branch" value={user.branch?.name || 'All Branches'} />
        <InfoRow icon="calendar-today" label="Joined" value={formatDate(user.joiningDate)} />
      </Card>

      {/* Change Password */}
      <Card style={styles.section}>
        <TouchableOpacity
          style={styles.changePasswordHeader}
          onPress={() => setShowChangePassword(!showChangePassword)}
        >
          <MaterialIcons name="lock" size={20} color={colors.text} />
          <Text style={styles.sectionTitle}>Change Password</Text>
          <MaterialIcons
            name={showChangePassword ? 'expand-less' : 'expand-more'}
            size={24}
            color={colors.textTertiary}
          />
        </TouchableOpacity>

        {showChangePassword && (
          <View style={styles.passwordForm}>
            <TextInput
              style={styles.input}
              placeholder="Current Password"
              placeholderTextColor={colors.textTertiary}
              value={currentPw}
              onChangeText={setCurrentPw}
              secureTextEntry
            />
            <TextInput
              style={styles.input}
              placeholder="New Password (min 6 chars)"
              placeholderTextColor={colors.textTertiary}
              value={newPw}
              onChangeText={setNewPw}
              secureTextEntry
            />
            <TouchableOpacity
              style={[styles.changePwBtn, loading && { opacity: 0.7 }]}
              onPress={handleChangePassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.changePwBtnText}>Update Password</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </Card>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <MaterialIcons name="logout" size={20} color={colors.danger} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Samanta LMS Mobile v1.0.0</Text>
    </ScrollView>
  );
}

function InfoRow({ icon, label, value }: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <MaterialIcons name={icon} size={18} color={colors.textTertiary} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing['5xl'] },
  profileCard: { marginBottom: spacing.md },
  profileCenter: { alignItems: 'center' },
  name: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, marginTop: spacing.md },
  role: { fontSize: fontSize.sm, color: colors.primaryLight, fontWeight: fontWeight.medium, marginTop: 4 },
  loginId: { fontSize: fontSize.sm, color: colors.textTertiary, marginTop: 2 },
  section: { marginBottom: spacing.md },
  sectionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text, flex: 1, marginLeft: spacing.sm },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  infoLabel: { fontSize: fontSize.sm, color: colors.textSecondary, marginLeft: spacing.md, flex: 1 },
  infoValue: { fontSize: fontSize.sm, color: colors.text, fontWeight: fontWeight.medium },
  changePasswordHeader: { flexDirection: 'row', alignItems: 'center' },
  passwordForm: { marginTop: spacing.lg, gap: spacing.md },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 44,
    fontSize: fontSize.base,
    color: colors.text,
  },
  changePwBtn: {
    backgroundColor: colors.primary,
    height: 44,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  changePwBtnText: { color: colors.white, fontWeight: fontWeight.semibold },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
    backgroundColor: colors.dangerLight,
    borderRadius: radius.lg,
    marginTop: spacing.md,
  },
  logoutText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.danger },
  version: { textAlign: 'center', color: colors.textTertiary, fontSize: fontSize.xs, marginTop: spacing.xl },
});
