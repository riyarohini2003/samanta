import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { branchApi } from '../../api';
import { Branch } from '../../types';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import StatCard from '../../components/StatCard';
import { colors, fontSize, fontWeight, spacing } from '../../theme';

export default function BranchDetailScreen() {
  const route = useRoute<any>();
  const { id } = route.params;
  const [branch, setBranch] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try { setBranch(await branchApi.get(id)); } catch {} finally { setLoading(false); }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);
  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  if (loading) return <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1 } as any} />;
  if (!branch) return <Text style={{ textAlign: 'center', marginTop: 40 }}>Branch not found</Text>;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
    >
      <Card>
        <View style={styles.header}>
          <Text style={styles.name}>{branch.name}</Text>
          <Badge label={branch.isActive ? 'Active' : 'Inactive'} variant={branch.isActive ? 'success' : 'danger'} size="md" />
        </View>
        <Text style={styles.code}>{branch.code}</Text>
      </Card>

      <View style={styles.statsRow}>
        <StatCard title="Employees" value={branch._count?.users ?? 0} icon="people" color={colors.primary} />
        <View style={{ width: spacing.md }} />
        <StatCard title="Customers" value={branch._count?.customers ?? 0} icon="person" color={colors.success} />
      </View>

      <Card style={{ marginTop: spacing.md }}>
        <Text style={styles.sectionTitle}>Details</Text>
        <DetailRow label="Address" value={branch.address} />
        <DetailRow label="City" value={branch.city} />
        <DetailRow label="State" value={branch.state} />
        <DetailRow label="Pincode" value={branch.pincode} />
        <DetailRow label="Contact" value={branch.contactNumber} />
        {branch.manager && <DetailRow label="Manager" value={branch.manager.name} />}
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  code: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 4 },
  statsRow: { flexDirection: 'row', marginTop: spacing.md },
  sectionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text, marginBottom: spacing.md },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  detailLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  detailValue: { fontSize: fontSize.sm, color: colors.text, fontWeight: fontWeight.medium },
});
