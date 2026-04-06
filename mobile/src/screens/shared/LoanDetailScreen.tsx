import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { loanApi } from '../../api';
import { LoanAccount, RepaymentSchedule, Payment } from '../../types';
import Card from '../../components/Card';
import Badge, { getStatusVariant } from '../../components/Badge';
import Avatar from '../../components/Avatar';
import { colors, fontSize, fontWeight, spacing, radius } from '../../theme';
import { formatMoney, formatDate } from '../../utils/formatters';

export default function LoanDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { id } = route.params;

  const [loan, setLoan] = useState<LoanAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'schedule' | 'payments'>('schedule');

  const loadData = useCallback(async () => {
    try {
      const data = await loanApi.get(id);
      setLoan(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (loading) return <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1 } as any} />;
  if (!loan) return <Text style={{ textAlign: 'center', marginTop: 40 }}>Loan not found</Text>;

  const progress = loan.totalPayable > 0 ? (loan.paidAmount / loan.totalPayable) * 100 : 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
    >
      {/* Header Card */}
      <Card style={styles.headerCard}>
        <View style={styles.headerRow}>
          <Text style={styles.acctNo}>{loan.accountNo}</Text>
          <Badge label={loan.status} variant={getStatusVariant(loan.status)} size="md" />
        </View>

        {loan.customer && (
          <TouchableOpacity
            style={styles.customerRow}
            onPress={() => navigation.navigate('CustomerDetail', { id: loan.customerId })}
          >
            <Avatar name={loan.customer.fullName} size={36} />
            <View style={{ marginLeft: spacing.sm, flex: 1 }}>
              <Text style={styles.custName}>{loan.customer.fullName}</Text>
              <Text style={styles.custCode}>{loan.customer.customerCode}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        )}

        {/* Progress */}
        <View style={styles.progressSection}>
          <View style={styles.progressLabels}>
            <Text style={styles.progressPaid}>Paid: {formatMoney(loan.paidAmount)}</Text>
            <Text style={styles.progressTotal}>of {formatMoney(loan.totalPayable)}</Text>
          </View>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%` }]} />
          </View>
          <Text style={styles.progressPct}>{progress.toFixed(1)}%</Text>
        </View>
      </Card>

      {/* Loan Info Grid */}
      <Card style={styles.infoCard}>
        <View style={styles.infoGrid}>
          <InfoItem label="Loan Type" value={loan.loanType} />
          <InfoItem label="Principal" value={formatMoney(loan.principal)} />
          <InfoItem label="Interest" value={formatMoney(loan.interestAmount)} />
          <InfoItem label="EMI" value={formatMoney(loan.installmentAmount)} />
          <InfoItem label="Start Date" value={formatDate(loan.startDate, 'DD MMM YY')} />
          <InfoItem label="Maturity" value={formatDate(loan.maturityDate, 'DD MMM YY')} />
          <InfoItem label="Pending" value={formatMoney(loan.pendingAmount)} color={colors.danger} />
          <InfoItem label="Overdue" value={formatMoney(loan.overdueAmount)} color={colors.warning} />
          <InfoItem label="Next Due" value={formatDate(loan.nextDueDate, 'DD MMM YY')} />
          <InfoItem label="Disbursed" value={formatDate(loan.disbursedAt, 'DD MMM YY')} />
        </View>
      </Card>

      {/* Tab Toggle */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'schedule' && styles.tabActive]}
          onPress={() => setActiveTab('schedule')}
        >
          <Text style={[styles.tabText, activeTab === 'schedule' && styles.tabTextActive]}>
            Schedule ({loan.schedules?.length || 0})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'payments' && styles.tabActive]}
          onPress={() => setActiveTab('payments')}
        >
          <Text style={[styles.tabText, activeTab === 'payments' && styles.tabTextActive]}>
            Payments ({loan.payments?.length || 0})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Schedule List */}
      {activeTab === 'schedule' && loan.schedules?.map((s) => (
        <Card key={s.id} style={styles.scheduleCard}>
          <View style={styles.scheduleRow}>
            <View style={styles.scheduleNum}>
              <Text style={styles.scheduleNumText}>#{s.installmentNo}</Text>
            </View>
            <View style={styles.scheduleInfo}>
              <Text style={styles.scheduleDate}>{formatDate(s.dueDate, 'DD MMM YY')}</Text>
              <Text style={styles.scheduleDue}>{formatMoney(s.dueAmount)}</Text>
            </View>
            <View style={styles.scheduleRight}>
              <Badge label={s.status} variant={getStatusVariant(s.status)} />
              {s.paidAmount > 0 && (
                <Text style={styles.schedulePaid}>Paid: {formatMoney(s.paidAmount)}</Text>
              )}
            </View>
          </View>
        </Card>
      ))}

      {/* Payments List */}
      {activeTab === 'payments' && loan.payments?.map((p) => (
        <Card key={p.id} style={styles.paymentCard}>
          <View style={styles.paymentRow}>
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentReceipt}>{p.receiptNo}</Text>
              <Text style={styles.paymentDate}>{formatDate(p.collectedAt, 'DD MMM YY, hh:mm A')}</Text>
              <Text style={styles.paymentMode}>{p.mode}</Text>
            </View>
            <View style={styles.paymentRight}>
              <Text style={styles.paymentAmount}>{formatMoney(p.amount)}</Text>
              {p.isReversed && <Badge label="Reversed" variant="danger" />}
            </View>
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}

function InfoItem({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, color ? { color } : undefined]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing['5xl'] },
  headerCard: { marginBottom: spacing.md },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  acctNo: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  custName: { fontSize: fontSize.base, fontWeight: fontWeight.medium, color: colors.text },
  custCode: { fontSize: fontSize.xs, color: colors.textTertiary },
  progressSection: { marginTop: spacing.lg },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  progressPaid: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.success },
  progressTotal: { fontSize: fontSize.sm, color: colors.textTertiary },
  progressBg: { height: 8, backgroundColor: colors.borderLight, borderRadius: 4, marginTop: spacing.sm, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.success, borderRadius: 4 },
  progressPct: { fontSize: fontSize.xs, color: colors.textTertiary, textAlign: 'right', marginTop: 4 },
  infoCard: { marginBottom: spacing.md },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  infoItem: { width: '50%', marginBottom: spacing.md },
  infoLabel: { fontSize: fontSize.xs, color: colors.textTertiary },
  infoValue: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text, marginTop: 2 },
  tabRow: { flexDirection: 'row', marginBottom: spacing.md, gap: spacing.sm },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.textSecondary },
  tabTextActive: { color: colors.white },
  scheduleCard: { marginBottom: spacing.xs },
  scheduleRow: { flexDirection: 'row', alignItems: 'center' },
  scheduleNum: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scheduleNumText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.primary },
  scheduleInfo: { flex: 1, marginLeft: spacing.md },
  scheduleDate: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text },
  scheduleDue: { fontSize: fontSize.xs, color: colors.textTertiary, marginTop: 2 },
  scheduleRight: { alignItems: 'flex-end' },
  schedulePaid: { fontSize: fontSize.xs, color: colors.success, marginTop: 4 },
  paymentCard: { marginBottom: spacing.xs },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  paymentInfo: {},
  paymentReceipt: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text },
  paymentDate: { fontSize: fontSize.xs, color: colors.textTertiary, marginTop: 2 },
  paymentMode: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  paymentRight: { alignItems: 'flex-end' },
  paymentAmount: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.success },
});
