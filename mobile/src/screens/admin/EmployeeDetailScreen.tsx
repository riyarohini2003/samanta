import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Linking,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import { employeeApi } from '../../api';
import { User } from '../../types';
import Card from '../../components/Card';
import Avatar from '../../components/Avatar';
import Badge from '../../components/Badge';
import { colors, fontSize, fontWeight, spacing, radius } from '../../theme';
import { formatDate } from '../../utils/formatters';

export default function EmployeeDetailScreen() {
  const route = useRoute<any>();
  const { id } = route.params;
  const [employee, setEmployee] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try { setEmployee(await employeeApi.get(id)); } catch {} finally { setLoading(false); }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);
  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  if (loading) return <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1 } as any} />;
  if (!employee) return <Text style={{ textAlign: 'center', marginTop: 40 }}>Employee not found</Text>;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
    >
      <Card style={styles.profileCard}>
        <View style={styles.center}>
          <Avatar name={employee.name} size={72} />
          <Text style={styles.name}>{employee.name}</Text>
          <Badge label={employee.role.replace('_', ' ')} variant="primary" size="md" />
          {!employee.isActive && (
            <Badge label="Inactive" variant="danger" size="md" />
          )}
        </View>

        <View style={styles.contactRow}>
          {employee.mobile && (
            <TouchableOpacity
              style={styles.contactBtn}
              onPress={() => Linking.openURL(`tel:${employee.mobile}`)}
            >
              <MaterialIcons name="phone" size={18} color={colors.primary} />
              <Text style={styles.contactText}>{employee.mobile}</Text>
            </TouchableOpacity>
          )}
          {employee.email && (
            <TouchableOpacity
              style={styles.contactBtn}
              onPress={() => Linking.openURL(`mailto:${employee.email}`)}
            >
              <MaterialIcons name="email" size={18} color={colors.primary} />
              <Text style={styles.contactText}>{employee.email}</Text>
            </TouchableOpacity>
          )}
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Details</Text>
        <DetailRow label="Login ID" value={employee.loginId} />
        <DetailRow label="Employee Code" value={employee.employeeCode} />
        <DetailRow label="Branch" value={employee.branch?.name} />
        <DetailRow label="Joining Date" value={formatDate(employee.joiningDate)} />
        <DetailRow label="Address" value={employee.address} />
      </Card>
    </ScrollView>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing['5xl'] },
  profileCard: { marginBottom: spacing.md },
  center: { alignItems: 'center', gap: spacing.sm },
  name: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, marginTop: spacing.md },
  contactRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg, justifyContent: 'center' },
  contactBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primaryBg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full,
  },
  contactText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.medium },
  sectionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text, marginBottom: spacing.md },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  detailLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  detailValue: { fontSize: fontSize.sm, color: colors.text, fontWeight: fontWeight.medium },
});
