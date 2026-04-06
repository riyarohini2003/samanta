import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { collectionApi, loanApi } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import StatCard from '../../components/StatCard';
import Card from '../../components/Card';
import { colors, fontSize, fontWeight, spacing, radius } from '../../theme';
import { formatMoney, getToday } from '../../utils/formatters';

export default function PerformanceScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    todayDue: 0,
    todayCollected: 0,
    todayPending: 0,
    todayCustomers: 0,
    activeLoans: 0,
  });

  const loadData = useCallback(async () => {
    try {
      const [dueResult, loanResult] = await Promise.all([
        collectionApi.getDueList({ date: getToday(), employeeId: user?.id }),
        loanApi.list({ status: 'ACTIVE', employeeId: user?.id }).catch(() => ({ rows: [] })),
      ]);

      setStats({
        todayDue: dueResult.summary.totalDue,
        todayCollected: dueResult.summary.totalCollected,
        todayPending: dueResult.summary.pendingCollection,
        todayCustomers: dueResult.summary.totalCustomers,
        activeLoans: (loanResult as any).rows?.length || 0,
      });
    } catch {} finally { setLoading(false); }
  }, [user?.id]);

  useEffect(() => { loadData(); }, [loadData]);
  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  if (loading) return <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1 } as any} />;

  const collectionRate = stats.todayDue > 0
    ? ((stats.todayCollected / stats.todayDue) * 100).toFixed(1)
    : '0.0';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
    >
      {/* Collection Rate */}
      <Card style={styles.rateCard}>
        <Text style={styles.rateTitle}>Today's Collection Rate</Text>
        <View style={styles.rateCircle}>
          <Text style={styles.rateValue}>{collectionRate}%</Text>
        </View>
        <View style={styles.rateLegend}>
          <Text style={styles.rateLegendItem}>
            Collected: {formatMoney(stats.todayCollected)}
          </Text>
          <Text style={styles.rateLegendItem}>
            Target: {formatMoney(stats.todayDue)}
          </Text>
        </View>
      </Card>

      {/* Stats Grid */}
      <Text style={styles.sectionTitle}>Today's Summary</Text>
      <View style={styles.statsRow}>
        <StatCard
          title="Due Amount"
          value={formatMoney(stats.todayDue, true)}
          icon="account-balance-wallet"
          color={colors.primary}
        />
        <View style={{ width: spacing.md }} />
        <StatCard
          title="Collected"
          value={formatMoney(stats.todayCollected, true)}
          icon="check-circle"
          color={colors.success}
        />
      </View>
      <View style={[styles.statsRow, { marginTop: spacing.md }]}>
        <StatCard
          title="Pending"
          value={formatMoney(stats.todayPending, true)}
          icon="pending-actions"
          color={colors.warning}
        />
        <View style={{ width: spacing.md }} />
        <StatCard
          title="Customers"
          value={String(stats.todayCustomers)}
          icon="people"
          color={colors.info}
        />
      </View>

      {/* Portfolio */}
      <Text style={styles.sectionTitle}>My Portfolio</Text>
      <Card>
        <View style={styles.portfolioRow}>
          <MaterialIcons name="account-balance" size={24} color={colors.primary} />
          <View style={styles.portfolioInfo}>
            <Text style={styles.portfolioLabel}>Active Loans Assigned</Text>
            <Text style={styles.portfolioValue}>{stats.activeLoans}</Text>
          </View>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing['5xl'] },
  rateCard: { alignItems: 'center', marginBottom: spacing.lg },
  rateTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text, marginBottom: spacing.lg },
  rateCircle: {
    width: 120, height: 120, borderRadius: 60,
    borderWidth: 8, borderColor: colors.success,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.md,
  },
  rateValue: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: colors.success },
  rateLegend: { flexDirection: 'row', gap: spacing.xl },
  rateLegendItem: { fontSize: fontSize.sm, color: colors.textSecondary },
  sectionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text, marginBottom: spacing.md, marginTop: spacing.lg },
  statsRow: { flexDirection: 'row' },
  portfolioRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  portfolioInfo: { flex: 1 },
  portfolioLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  portfolioValue: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, marginTop: 4 },
});
