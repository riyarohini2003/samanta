import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { loanApplicationApi } from '../../api';
import { LoanApplication, ApiError } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../../components/Card';
import Badge, { getStatusVariant } from '../../components/Badge';
import Avatar from '../../components/Avatar';
import { colors, fontSize, fontWeight, spacing, radius } from '../../theme';
import { formatMoney, formatDate } from '../../utils/formatters';
import { LOAN_APP_STATUS_LABELS } from '../../utils/constants';

export default function LoanApplicationDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { isAdmin } = useAuth();
  const { id } = route.params;

  const [app, setApp] = useState<LoanApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  const loadData = useCallback(async () => {
    try { setApp(await loanApplicationApi.get(id)); } catch {} finally { setLoading(false); }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);
  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const handleApprove = () => {
    Alert.alert('Approve Application', 'Are you sure you want to approve this loan application?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          setActionLoading(true);
          try {
            await loanApplicationApi.approve(id);
            await loadData();
            Alert.alert('Success', 'Application approved');
          } catch (err) {
            Alert.alert('Error', (err as ApiError).error || 'Failed to approve');
          } finally { setActionLoading(false); }
        },
      },
    ]);
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      Alert.alert('Validation', 'Rejection reason is required');
      return;
    }
    setActionLoading(true);
    try {
      await loanApplicationApi.reject(id, rejectReason.trim());
      await loadData();
      setShowRejectForm(false);
      Alert.alert('Success', 'Application rejected');
    } catch (err) {
      Alert.alert('Error', (err as ApiError).error || 'Failed to reject');
    } finally { setActionLoading(false); }
  };

  if (loading) return <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1 } as any} />;
  if (!app) return <Text style={{ textAlign: 'center', marginTop: 40 }}>Application not found</Text>;

  const canApprove = isAdmin && (app.status === 'SUBMITTED' || app.status === 'UNDER_REVIEW');

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
    >
      {/* Header */}
      <Card>
        <View style={styles.header}>
          <Text style={styles.appNo}>{app.applicationNo}</Text>
          <Badge
            label={LOAN_APP_STATUS_LABELS[app.status] || app.status}
            variant={getStatusVariant(app.status)}
            size="md"
          />
        </View>

        {app.customer && (
          <TouchableOpacity
            style={styles.customerRow}
            onPress={() => navigation.navigate('CustomerDetail', { id: app.customerId })}
          >
            <Avatar name={app.customer.fullName} size={40} />
            <View style={{ marginLeft: spacing.sm, flex: 1 }}>
              <Text style={styles.custName}>{app.customer.fullName}</Text>
              <Text style={styles.custCode}>{app.customer.customerCode} | {app.customer.mobile}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </Card>

      {/* Loan Details */}
      <Card style={{ marginTop: spacing.md }}>
        <Text style={styles.sectionTitle}>Loan Details</Text>
        <View style={styles.grid}>
          <GridItem label="Type" value={app.loanType} />
          <GridItem label="Principal" value={formatMoney(app.principal)} />
          <GridItem label="Interest Rate" value={`${app.interestRate}%`} />
          <GridItem label="Tenure" value={`${app.tenureCount} installments`} />
          <GridItem label="EMI" value={formatMoney(app.installmentAmount)} />
          <GridItem label="Total Payable" value={formatMoney(app.totalPayable)} />
          <GridItem label="Interest Amount" value={formatMoney(app.interestAmount)} />
          <GridItem label="Processing Fee" value={formatMoney(app.processingFee)} />
          <GridItem label="Start Date" value={formatDate(app.startDate, 'DD MMM YYYY')} />
          <GridItem label="Maturity Date" value={formatDate(app.maturityDate, 'DD MMM YYYY')} />
        </View>
        {app.purpose && (
          <View style={styles.purposeWrap}>
            <Text style={styles.purposeLabel}>Purpose</Text>
            <Text style={styles.purposeText}>{app.purpose}</Text>
          </View>
        )}
      </Card>

      {/* Review Info */}
      {app.reviewedBy && (
        <Card style={{ marginTop: spacing.md }}>
          <Text style={styles.sectionTitle}>Review</Text>
          <GridItem label="Reviewed By" value={app.reviewedBy.name} />
          <GridItem label="Reviewed At" value={formatDate(app.reviewedAt, 'DD MMM YY, hh:mm A')} />
          {app.reviewRemark && <GridItem label="Remark" value={app.reviewRemark} />}
        </Card>
      )}

      {/* Admin Actions */}
      {canApprove && (
        <Card style={{ marginTop: spacing.md }}>
          <Text style={styles.sectionTitle}>Actions</Text>

          {showRejectForm ? (
            <View style={styles.rejectForm}>
              <TextInput
                style={styles.rejectInput}
                value={rejectReason}
                onChangeText={setRejectReason}
                placeholder="Reason for rejection *"
                placeholderTextColor={colors.textTertiary}
                multiline
              />
              <View style={styles.rejectActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowRejectForm(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.rejectBtn, actionLoading && { opacity: 0.7 }]}
                  onPress={handleReject}
                  disabled={actionLoading}
                >
                  {actionLoading ? <ActivityIndicator color={colors.white} size="small" /> : (
                    <Text style={styles.rejectBtnText}>Reject</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.approveBtn, actionLoading && { opacity: 0.7 }]}
                onPress={handleApprove}
                disabled={actionLoading}
              >
                <MaterialIcons name="check" size={20} color={colors.white} />
                <Text style={styles.approveBtnText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rejectOutlineBtn}
                onPress={() => setShowRejectForm(true)}
              >
                <MaterialIcons name="close" size={20} color={colors.danger} />
                <Text style={styles.rejectOutlineBtnText}>Reject</Text>
              </TouchableOpacity>
            </View>
          )}
        </Card>
      )}

      <Text style={styles.meta}>Created by {app.createdBy?.name} on {formatDate(app.createdAt, 'DD MMM YYYY')}</Text>
    </ScrollView>
  );
}

function GridItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.gridItem}>
      <Text style={styles.gridLabel}>{label}</Text>
      <Text style={styles.gridValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing['5xl'] },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  appNo: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  customerRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg,
    paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.borderLight,
  },
  custName: { fontSize: fontSize.base, fontWeight: fontWeight.medium, color: colors.text },
  custCode: { fontSize: fontSize.xs, color: colors.textTertiary },
  sectionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text, marginBottom: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  gridItem: { width: '50%', marginBottom: spacing.md },
  gridLabel: { fontSize: fontSize.xs, color: colors.textTertiary },
  gridValue: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text, marginTop: 2 },
  purposeWrap: { borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: spacing.md },
  purposeLabel: { fontSize: fontSize.xs, color: colors.textTertiary },
  purposeText: { fontSize: fontSize.sm, color: colors.text, marginTop: 4 },
  actionRow: { flexDirection: 'row', gap: spacing.md },
  approveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.success, height: 48, borderRadius: radius.lg,
  },
  approveBtnText: { color: colors.white, fontWeight: fontWeight.semibold, fontSize: fontSize.base },
  rejectOutlineBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    borderWidth: 1, borderColor: colors.danger, height: 48, borderRadius: radius.lg,
  },
  rejectOutlineBtnText: { color: colors.danger, fontWeight: fontWeight.semibold, fontSize: fontSize.base },
  rejectForm: { gap: spacing.md },
  rejectInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: spacing.md, height: 80, textAlignVertical: 'top',
    fontSize: fontSize.base, color: colors.text, paddingTop: spacing.md,
  },
  rejectActions: { flexDirection: 'row', gap: spacing.md },
  cancelBtn: { flex: 1, height: 44, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  cancelBtnText: { color: colors.textSecondary, fontWeight: fontWeight.medium },
  rejectBtn: { flex: 1, height: 44, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.danger },
  rejectBtnText: { color: colors.white, fontWeight: fontWeight.semibold },
  meta: { fontSize: fontSize.xs, color: colors.textTertiary, textAlign: 'center', marginTop: spacing.xl },
});
