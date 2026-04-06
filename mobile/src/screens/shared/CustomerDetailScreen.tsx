import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { customerApi, loanApi } from '../../api';
import { Customer, LoanAccount } from '../../types';
import Card from '../../components/Card';
import Avatar from '../../components/Avatar';
import Badge, { getStatusVariant } from '../../components/Badge';
import { colors, fontSize, fontWeight, spacing, radius } from '../../theme';
import { formatMoney, formatDate } from '../../utils/formatters';

export default function CustomerDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { id } = route.params;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loans, setLoans] = useState<LoanAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [cust, loanResult] = await Promise.all([
        customerApi.get(id),
        loanApi.list({ q: id }).catch(() => ({ rows: [] })),
      ]);
      setCustomer(cust);
      setLoans((loanResult as any).rows || []);
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

  if (loading) return <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1, justifyContent: 'center' } as any} />;
  if (!customer) return <Text style={{ textAlign: 'center', marginTop: 40 }}>Customer not found</Text>;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
    >
      {/* Profile Card */}
      <Card style={styles.profileCard}>
        <View style={styles.profileRow}>
          <Avatar name={customer.fullName} photoUrl={customer.photoUrl} size={64} />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{customer.fullName}</Text>
            <Text style={styles.profileCode}>{customer.customerCode}</Text>
          </View>
        </View>

        <View style={styles.contactRow}>
          <TouchableOpacity style={styles.contactBtn} onPress={() => Linking.openURL(`tel:${customer.mobile}`)}>
            <MaterialIcons name="phone" size={20} color={colors.primary} />
            <Text style={styles.contactText}>{customer.mobile}</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* Personal Details */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Details</Text>
        <DetailRow label="Father/Husband" value={customer.fatherOrHusband} />
        <DetailRow label="Gender" value={customer.gender} />
        <DetailRow label="DOB" value={formatDate(customer.dob)} />
        <DetailRow label="Occupation" value={customer.occupation} />
        <DetailRow label="Monthly Income" value={customer.monthlyIncome ? formatMoney(customer.monthlyIncome) : undefined} />
        <DetailRow label="Aadhaar" value={customer.aadhaar} />
        <DetailRow label="PAN" value={customer.panOrTaxId} />
      </Card>

      {/* Address */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Address</Text>
        <DetailRow label="Current" value={customer.currentAddress} />
        <DetailRow label="Permanent" value={customer.permanentAddress} />
      </Card>

      {/* Bank Details */}
      {customer.bankName && (
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Bank Details</Text>
          <DetailRow label="Bank" value={customer.bankName} />
          <DetailRow label="Account No" value={customer.bankAccount} />
          <DetailRow label="IFSC" value={customer.ifsc} />
        </Card>
      )}

      {/* Guarantor */}
      {customer.guarantorName && (
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Guarantor</Text>
          <DetailRow label="Name" value={customer.guarantorName} />
          <DetailRow label="Mobile" value={customer.guarantorMobile} />
          <DetailRow label="Relation" value={customer.guarantorRelation} />
        </Card>
      )}

      {/* Loans */}
      {loans.length > 0 && (
        <>
          <Text style={styles.loansTitle}>Loans ({loans.length})</Text>
          {loans.map((loan) => (
            <Card
              key={loan.id}
              style={styles.loanCard}
              onPress={() => navigation.navigate('LoanDetail', { id: loan.id })}
            >
              <View style={styles.loanRow}>
                <View style={styles.loanInfo}>
                  <Text style={styles.loanAcct}>{loan.accountNo}</Text>
                  <Text style={styles.loanMeta}>
                    {loan.loanType} | {formatMoney(loan.principal)}
                  </Text>
                </View>
                <View style={styles.loanRight}>
                  <Badge label={loan.status} variant={getStatusVariant(loan.status)} />
                  <Text style={styles.loanPending}>Due: {formatMoney(loan.pendingAmount)}</Text>
                </View>
              </View>
            </Card>
          ))}
        </>
      )}
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
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  profileInfo: { marginLeft: spacing.lg, flex: 1 },
  profileName: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  profileCode: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  contactRow: { marginTop: spacing.lg, flexDirection: 'row', gap: spacing.md },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primaryBg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  contactText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.medium },
  section: { marginBottom: spacing.md },
  sectionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text, marginBottom: spacing.md },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  detailLabel: { fontSize: fontSize.sm, color: colors.textSecondary, flex: 1 },
  detailValue: { fontSize: fontSize.sm, color: colors.text, fontWeight: fontWeight.medium, flex: 1.5, textAlign: 'right' },
  loansTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  loanCard: { marginBottom: spacing.sm },
  loanRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  loanInfo: { flex: 1 },
  loanAcct: { fontSize: fontSize.base, fontWeight: fontWeight.medium, color: colors.text },
  loanMeta: { fontSize: fontSize.xs, color: colors.textTertiary, marginTop: 2 },
  loanRight: { alignItems: 'flex-end' },
  loanPending: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 4 },
});
