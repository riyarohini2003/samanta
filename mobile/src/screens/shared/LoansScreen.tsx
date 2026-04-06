import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { loanApi } from '../../api';
import { LoanAccount } from '../../types';
import Card from '../../components/Card';
import Badge, { getStatusVariant } from '../../components/Badge';
import SearchBar from '../../components/SearchBar';
import FilterChips from '../../components/FilterChips';
import EmptyState from '../../components/EmptyState';
import { colors, fontSize, fontWeight, spacing } from '../../theme';
import { formatMoney, formatDate } from '../../utils/formatters';

const STATUS_CHIPS = [
  { key: '', label: 'All' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'OVERDUE', label: 'Overdue' },
  { key: 'NPA', label: 'NPA' },
  { key: 'CLOSED', label: 'Closed' },
];

export default function LoansScreen() {
  const navigation = useNavigation<any>();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loans, setLoans] = useState<LoanAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const result = await loanApi.list({
        status: statusFilter || undefined,
        q: search || undefined,
      });
      setLoans(result.rows);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => { setLoading(true); loadData(); }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const renderItem = ({ item }: { item: LoanAccount }) => (
    <Card
      style={styles.card}
      onPress={() => navigation.navigate('LoanDetail', { id: item.id })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.acctNo}>{item.accountNo}</Text>
        <Badge label={item.status} variant={getStatusVariant(item.status)} />
      </View>
      <Text style={styles.customerName}>{item.customer?.fullName}</Text>

      <View style={styles.detailGrid}>
        <View style={styles.detailCell}>
          <Text style={styles.detailLabel}>Type</Text>
          <Text style={styles.detailValue}>{item.loanType}</Text>
        </View>
        <View style={styles.detailCell}>
          <Text style={styles.detailLabel}>Principal</Text>
          <Text style={styles.detailValue}>{formatMoney(item.principal)}</Text>
        </View>
        <View style={styles.detailCell}>
          <Text style={styles.detailLabel}>Paid</Text>
          <Text style={[styles.detailValue, { color: colors.success }]}>{formatMoney(item.paidAmount)}</Text>
        </View>
        <View style={styles.detailCell}>
          <Text style={styles.detailLabel}>Pending</Text>
          <Text style={[styles.detailValue, { color: colors.danger }]}>{formatMoney(item.pendingAmount)}</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBg}>
        <View style={[styles.progressFill, { width: `${Math.min((item.paidAmount / item.totalPayable) * 100, 100)}%` }]} />
      </View>
      <Text style={styles.progressText}>
        {((item.paidAmount / item.totalPayable) * 100).toFixed(1)}% collected
      </Text>
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search loans..." />
      </View>
      <FilterChips chips={STATUS_CHIPS} selected={statusFilter} onSelect={setStatusFilter} />

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={loans}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
          ListEmptyComponent={
            <EmptyState icon="account-balance" title="No loans found" />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  list: { padding: spacing.lg, paddingTop: spacing.sm },
  card: { marginBottom: spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  acctNo: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text },
  customerName: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 4, marginBottom: spacing.md },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  detailCell: { width: '50%', marginBottom: spacing.sm },
  detailLabel: { fontSize: fontSize.xs, color: colors.textTertiary },
  detailValue: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text, marginTop: 2 },
  progressBg: {
    height: 6,
    backgroundColor: colors.borderLight,
    borderRadius: 3,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: 3,
  },
  progressText: { fontSize: fontSize.xs, color: colors.textTertiary, marginTop: 4, textAlign: 'right' },
});
