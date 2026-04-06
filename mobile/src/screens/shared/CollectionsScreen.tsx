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
import { collectionApi } from '../../api';
import { DueItem, DueSummary } from '../../types';
import Card from '../../components/Card';
import Badge, { getStatusVariant } from '../../components/Badge';
import Avatar from '../../components/Avatar';
import SearchBar from '../../components/SearchBar';
import FilterChips from '../../components/FilterChips';
import EmptyState from '../../components/EmptyState';
import StatCard from '../../components/StatCard';
import { colors, fontSize, fontWeight, spacing, radius } from '../../theme';
import { formatMoney, getToday, formatDate } from '../../utils/formatters';
import { LOAN_TYPES } from '../../utils/constants';
import dayjs from 'dayjs';

const STATUS_CHIPS = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'PAID', label: 'Paid' },
  { key: 'PARTIAL', label: 'Partial' },
  { key: 'MISSED', label: 'Missed' },
];

export default function CollectionsScreen() {
  const navigation = useNavigation<any>();
  const [date, setDate] = useState(getToday());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [items, setItems] = useState<DueItem[]>([]);
  const [summary, setSummary] = useState<DueSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const result = await collectionApi.getDueList({
        date,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        q: search || undefined,
      });
      setItems(result.rows);
      setSummary(result.summary);
    } catch {
      // Handle error silently
    } finally {
      setLoading(false);
    }
  }, [date, statusFilter, search]);

  useEffect(() => { setLoading(true); loadData(); }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const changeDate = (offset: number) => {
    setDate(dayjs(date).add(offset, 'day').format('YYYY-MM-DD'));
  };

  const renderItem = ({ item }: { item: DueItem }) => {
    const remaining = item.dueAmount - item.paidAmount;
    return (
      <Card
        style={styles.itemCard}
        onPress={() => navigation.navigate('CollectionPay', { item })}
      >
        <View style={styles.itemRow}>
          <Avatar name={item.loanAccount.customer.fullName} size={44} />
          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>{item.loanAccount.customer.fullName}</Text>
            <Text style={styles.itemMeta}>
              {item.loanAccount.accountNo} | #{item.installmentNo} | {item.loanAccount.loanType}
            </Text>
            {item.loanAccount.assignedEmployee && (
              <Text style={styles.itemEmployee}>
                {item.loanAccount.assignedEmployee.name}
              </Text>
            )}
          </View>
          <View style={styles.itemRight}>
            <Text style={styles.itemAmount}>{formatMoney(remaining)}</Text>
            <Badge label={item.status} variant={getStatusVariant(item.status)} />
          </View>
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      {/* Date Picker */}
      <View style={styles.datePicker}>
        <TouchableOpacity onPress={() => changeDate(-1)} style={styles.dateArrow}>
          <MaterialIcons name="chevron-left" size={28} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setDate(getToday())}>
          <Text style={styles.dateText}>{formatDate(date, 'ddd, DD MMM YYYY')}</Text>
          {date === getToday() && <Text style={styles.todayLabel}>Today</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => changeDate(1)} style={styles.dateArrow}>
          <MaterialIcons name="chevron-right" size={28} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      {summary && (
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: colors.primaryBg }]}>
            <Text style={[styles.summaryValue, { color: colors.primary }]}>
              {formatMoney(summary.totalDue, true)}
            </Text>
            <Text style={styles.summaryLabel}>Due</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.successLight }]}>
            <Text style={[styles.summaryValue, { color: colors.success }]}>
              {formatMoney(summary.totalCollected, true)}
            </Text>
            <Text style={styles.summaryLabel}>Collected</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.warningLight }]}>
            <Text style={[styles.summaryValue, { color: colors.warning }]}>
              {formatMoney(summary.pendingCollection, true)}
            </Text>
            <Text style={styles.summaryLabel}>Pending</Text>
          </View>
        </View>
      )}

      {/* Search */}
      <View style={styles.searchWrap}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search customer, loan..."
        />
      </View>

      {/* Status Filter */}
      <FilterChips chips={STATUS_CHIPS} selected={statusFilter} onSelect={setStatusFilter} />

      {/* List */}
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="event-available"
              title="No collections due"
              message={`No installments ${statusFilter !== 'ALL' ? `with status "${statusFilter}" ` : ''}due on this date`}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  datePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dateArrow: { padding: spacing.xs },
  dateText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text, textAlign: 'center' },
  todayLabel: { fontSize: fontSize.xs, color: colors.primaryLight, textAlign: 'center', marginTop: 2 },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  summaryCard: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  summaryValue: { fontSize: fontSize.base, fontWeight: fontWeight.bold },
  summaryLabel: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  searchWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  list: { padding: spacing.lg, paddingTop: spacing.sm },
  itemCard: { marginBottom: spacing.sm },
  itemRow: { flexDirection: 'row', alignItems: 'center' },
  itemInfo: { flex: 1, marginLeft: spacing.md },
  itemName: { fontSize: fontSize.base, fontWeight: fontWeight.medium, color: colors.text },
  itemMeta: { fontSize: fontSize.xs, color: colors.textTertiary, marginTop: 2 },
  itemEmployee: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  itemRight: { alignItems: 'flex-end' },
  itemAmount: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.text, marginBottom: 4 },
});
