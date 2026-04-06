import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { collectionApi } from '../../api';
import StatCard from '../../components/StatCard';
import Card from '../../components/Card';
import Badge, { getStatusVariant } from '../../components/Badge';
import Avatar from '../../components/Avatar';
import { colors, fontSize, fontWeight, spacing, radius } from '../../theme';
import { formatMoney, getToday, formatDate } from '../../utils/formatters';
import { DueItem, DueSummary } from '../../types';

export default function DashboardScreen() {
  const { user, isAdmin } = useAuth();
  const navigation = useNavigation<any>();
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<DueSummary | null>(null);
  const [dueItems, setDueItems] = useState<DueItem[]>([]);

  const loadData = useCallback(async () => {
    try {
      const result = await collectionApi.getDueList({ date: getToday() });
      setSummary(result.summary);
      setDueItems(result.rows.slice(0, 10));
    } catch {
      // Silently fail — dashboard is best-effort
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
    >
      {/* Greeting */}
      <View style={styles.greeting}>
        <View style={styles.greetingLeft}>
          <Text style={styles.greetingText}>
            Welcome back,
          </Text>
          <Text style={styles.greetingName}>{user?.name}</Text>
          <Text style={styles.greetingDate}>{formatDate(getToday(), 'dddd, DD MMM YYYY')}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
          <MaterialIcons name="notifications-none" size={28} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Collection Summary */}
      {summary && (
        <>
          <Text style={styles.sectionTitle}>Today's Collection</Text>
          <View style={styles.statsRow}>
            <StatCard
              title="Total Due"
              value={formatMoney(summary.totalDue, true)}
              icon="account-balance-wallet"
              color={colors.primary}
            />
            <View style={{ width: spacing.md }} />
            <StatCard
              title="Collected"
              value={formatMoney(summary.totalCollected, true)}
              icon="check-circle"
              color={colors.success}
            />
          </View>
          <View style={[styles.statsRow, { marginTop: spacing.md }]}>
            <StatCard
              title="Pending"
              value={formatMoney(summary.pendingCollection, true)}
              icon="pending-actions"
              color={colors.warning}
            />
            <View style={{ width: spacing.md }} />
            <StatCard
              title="Customers"
              value={String(summary.totalCustomers)}
              icon="people"
              color={colors.info}
            />
          </View>

          {/* Status breakdown */}
          <View style={styles.statusRow}>
            <StatusPill label="Paid" count={summary.paid} color={colors.success} />
            <StatusPill label="Pending" count={summary.pending} color={colors.warning} />
            <StatusPill label="Partial" count={summary.partial} color={colors.primary} />
            <StatusPill label="Missed" count={summary.missed} color={colors.danger} />
          </View>
        </>
      )}

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsRow}>
        <QuickAction
          icon="payments"
          label="Collect"
          color={colors.primary}
          onPress={() => navigation.navigate('CollectionsTab')}
        />
        <QuickAction
          icon="person-add"
          label="New Customer"
          color={colors.success}
          onPress={() => navigation.navigate('CustomersTab', { screen: 'CreateCustomer' })}
        />
        {isAdmin && (
          <QuickAction
            icon="description"
            label="Applications"
            color={colors.warning}
            onPress={() => navigation.navigate('ApplicationsTab')}
          />
        )}
        <QuickAction
          icon="account-balance"
          label={isAdmin ? 'All Loans' : 'My Loans'}
          color={colors.info}
          onPress={() => isAdmin
            ? navigation.navigate('MoreTab', { screen: 'Loans' })
            : navigation.navigate('LoansTab')
          }
        />
      </View>

      {/* Due Today List */}
      {dueItems.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Due Today</Text>
            <TouchableOpacity onPress={() => navigation.navigate('CollectionsTab')}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>
          {dueItems.map((item) => (
            <Card
              key={item.id}
              style={styles.dueCard}
              onPress={() => navigation.navigate('CollectionPay', { item })}
            >
              <View style={styles.dueRow}>
                <Avatar name={item.loanAccount.customer.fullName} size={40} />
                <View style={styles.dueInfo}>
                  <Text style={styles.dueName}>{item.loanAccount.customer.fullName}</Text>
                  <Text style={styles.dueAcct}>{item.loanAccount.accountNo}</Text>
                </View>
                <View style={styles.dueRight}>
                  <Text style={styles.dueAmount}>{formatMoney(item.dueAmount - item.paidAmount)}</Text>
                  <Badge label={item.status} variant={getStatusVariant(item.status)} />
                </View>
              </View>
            </Card>
          ))}
        </>
      )}
    </ScrollView>
  );
}

function StatusPill({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: color + '15' }]}>
      <Text style={[styles.pillCount, { color }]}>{count}</Text>
      <Text style={[styles.pillLabel, { color }]}>{label}</Text>
    </View>
  );
}

function QuickAction({ icon, label, color, onPress }: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.action} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.actionIcon, { backgroundColor: color + '15' }]}>
        <MaterialIcons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.actionLabel} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing['5xl'] },
  greeting: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing['2xl'],
  },
  greetingLeft: {},
  greetingText: { fontSize: fontSize.sm, color: colors.textSecondary },
  greetingName: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: colors.text },
  greetingDate: { fontSize: fontSize.sm, color: colors.textTertiary, marginTop: 2 },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
    marginTop: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  viewAll: { fontSize: fontSize.sm, color: colors.primaryLight, fontWeight: fontWeight.medium },
  statsRow: { flexDirection: 'row' },
  statusRow: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  pill: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  pillCount: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  pillLabel: { fontSize: fontSize.xs, marginTop: 2 },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  action: {
    flex: 1,
    alignItems: 'center',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  actionLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
    textAlign: 'center',
  },
  dueCard: { marginBottom: spacing.sm },
  dueRow: { flexDirection: 'row', alignItems: 'center' },
  dueInfo: { flex: 1, marginLeft: spacing.md },
  dueName: { fontSize: fontSize.base, fontWeight: fontWeight.medium, color: colors.text },
  dueAcct: { fontSize: fontSize.xs, color: colors.textTertiary, marginTop: 2 },
  dueRight: { alignItems: 'flex-end' },
  dueAmount: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.text, marginBottom: 4 },
});
