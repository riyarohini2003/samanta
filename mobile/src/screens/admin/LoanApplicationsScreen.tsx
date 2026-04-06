import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { loanApplicationApi } from '../../api';
import { LoanApplication } from '../../types';
import Card from '../../components/Card';
import Badge, { getStatusVariant } from '../../components/Badge';
import FilterChips from '../../components/FilterChips';
import EmptyState from '../../components/EmptyState';
import { colors, fontSize, fontWeight, spacing } from '../../theme';
import { formatMoney, formatDate } from '../../utils/formatters';
import { LOAN_APP_STATUS_LABELS } from '../../utils/constants';

const STATUS_CHIPS = [
  { key: '', label: 'All' },
  { key: 'SUBMITTED', label: 'Submitted' },
  { key: 'UNDER_REVIEW', label: 'Review' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'DISBURSED', label: 'Disbursed' },
];

export default function LoanApplicationsScreen() {
  const navigation = useNavigation<any>();
  const [statusFilter, setStatusFilter] = useState('');
  const [apps, setApps] = useState<LoanApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const result = await loanApplicationApi.list({ status: statusFilter || undefined });
      setApps(result.rows);
    } catch {} finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { setLoading(true); loadData(); }, [loadData]);
  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const renderItem = ({ item }: { item: LoanApplication }) => (
    <Card
      style={styles.card}
      onPress={() => navigation.navigate('LoanApplicationDetail', { id: item.id })}
    >
      <View style={styles.header}>
        <Text style={styles.appNo}>{item.applicationNo}</Text>
        <Badge label={LOAN_APP_STATUS_LABELS[item.status] || item.status} variant={getStatusVariant(item.status)} />
      </View>
      <Text style={styles.customer}>{item.customer?.fullName}</Text>
      <View style={styles.details}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Type</Text>
          <Text style={styles.detailValue}>{item.loanType}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Principal</Text>
          <Text style={styles.detailValue}>{formatMoney(item.principal)}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Tenure</Text>
          <Text style={styles.detailValue}>{item.tenureCount}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>EMI</Text>
          <Text style={styles.detailValue}>{formatMoney(item.installmentAmount)}</Text>
        </View>
      </View>
      <Text style={styles.date}>Applied: {formatDate(item.createdAt, 'DD MMM YY')}</Text>
    </Card>
  );

  return (
    <View style={styles.container}>
      <FilterChips chips={STATUS_CHIPS} selected={statusFilter} onSelect={setStatusFilter} />
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={apps}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          ListEmptyComponent={<EmptyState icon="description" title="No applications" />}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateLoanApplication', {})}
      >
        <MaterialIcons name="add" size={28} color={colors.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, paddingTop: spacing.sm },
  card: { marginBottom: spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  appNo: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text },
  customer: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 4 },
  details: { flexDirection: 'row', marginTop: spacing.md, flexWrap: 'wrap' },
  detailItem: { width: '25%' },
  detailLabel: { fontSize: fontSize.xs, color: colors.textTertiary },
  detailValue: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text, marginTop: 2 },
  date: { fontSize: fontSize.xs, color: colors.textTertiary, marginTop: spacing.md },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
