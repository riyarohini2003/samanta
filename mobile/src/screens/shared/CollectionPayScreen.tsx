import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Location from 'expo-location';
import { collectionApi } from '../../api';
import { DueItem, PaymentMode, ApiError } from '../../types';
import Badge, { getStatusVariant } from '../../components/Badge';
import Card from '../../components/Card';
import Avatar from '../../components/Avatar';
import { colors, fontSize, fontWeight, spacing, radius } from '../../theme';
import { formatMoney, formatDate } from '../../utils/formatters';
import { PAYMENT_MODES } from '../../utils/constants';
import { v4 as uuidv4 } from 'uuid';

const MODE_LABELS: Record<string, string> = {
  CASH: 'Cash',
  UPI: 'UPI',
  BANK: 'Bank Transfer',
  CHEQUE: 'Cheque',
};

export default function CollectionPayScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const item: DueItem = route.params?.item;

  const remaining = item.dueAmount - item.paidAmount;

  const [amount, setAmount] = useState(String(remaining));
  const [penalty, setPenalty] = useState('0');
  const [mode, setMode] = useState<PaymentMode>('CASH');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    Alert.alert(
      'Confirm Payment',
      `Collect ${formatMoney(amt)} via ${MODE_LABELS[mode]} from ${item.loanAccount.customer.fullName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: submitPayment },
      ]
    );
  };

  const submitPayment = async () => {
    setLoading(true);
    try {
      // Try to get location
      let geoLat: number | undefined;
      let geoLng: number | undefined;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          geoLat = loc.coords.latitude;
          geoLng = loc.coords.longitude;
        }
      } catch {
        // Location unavailable, proceed without it
      }

      await collectionApi.recordPayment({
        loanAccountId: item.loanAccount.id,
        scheduleId: item.id,
        amount: parseFloat(amount),
        penalty: parseFloat(penalty) || 0,
        mode,
        note: note || undefined,
        geoLat,
        geoLng,
        clientRef: uuidv4(),
      });

      Alert.alert('Success', 'Payment recorded successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      const apiErr = err as ApiError;
      Alert.alert('Error', apiErr.error || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Customer Info */}
      <Card style={styles.customerCard}>
        <View style={styles.customerRow}>
          <Avatar name={item.loanAccount.customer.fullName} size={50} />
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>{item.loanAccount.customer.fullName}</Text>
            <Text style={styles.customerCode}>{item.loanAccount.customer.customerCode}</Text>
            <Text style={styles.customerPhone}>{item.loanAccount.customer.mobile}</Text>
          </View>
        </View>
      </Card>

      {/* Loan Info */}
      <Card style={styles.loanCard}>
        <View style={styles.loanHeader}>
          <Text style={styles.loanAcct}>{item.loanAccount.accountNo}</Text>
          <Badge label={item.loanAccount.loanType} variant="primary" size="md" />
        </View>
        <View style={styles.loanGrid}>
          <InfoCell label="Installment" value={`#${item.installmentNo}`} />
          <InfoCell label="Due Date" value={formatDate(item.dueDate, 'DD MMM YY')} />
          <InfoCell label="Due Amount" value={formatMoney(item.dueAmount)} />
          <InfoCell label="Already Paid" value={formatMoney(item.paidAmount)} />
          <InfoCell label="Remaining" value={formatMoney(remaining)} highlight />
          <InfoCell label="Status" value={item.status} />
        </View>
      </Card>

      {/* Payment Form */}
      <Card>
        <Text style={styles.formTitle}>Payment Details</Text>

        {/* Amount */}
        <Text style={styles.label}>Amount *</Text>
        <View style={styles.amountWrap}>
          <Text style={styles.currency}>₹</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={colors.textTertiary}
          />
        </View>

        {/* Quick Amount Buttons */}
        <View style={styles.quickAmounts}>
          <QuickBtn label={formatMoney(remaining)} onPress={() => setAmount(String(remaining))} active={amount === String(remaining)} />
          <QuickBtn label="Half" onPress={() => setAmount(String(Math.ceil(remaining / 2)))} />
          <QuickBtn label="Custom" onPress={() => setAmount('')} />
        </View>

        {/* Penalty */}
        <Text style={styles.label}>Penalty</Text>
        <TextInput
          style={styles.input}
          value={penalty}
          onChangeText={setPenalty}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={colors.textTertiary}
        />

        {/* Payment Mode */}
        <Text style={styles.label}>Payment Mode *</Text>
        <View style={styles.modeRow}>
          {PAYMENT_MODES.map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.modeChip, mode === m && styles.modeChipActive]}
              onPress={() => setMode(m as PaymentMode)}
            >
              <MaterialIcons
                name={m === 'CASH' ? 'payments' : m === 'UPI' ? 'qr-code' : m === 'BANK' ? 'account-balance' : 'receipt'}
                size={18}
                color={mode === m ? colors.white : colors.textSecondary}
              />
              <Text style={[styles.modeText, mode === m && styles.modeTextActive]}>
                {MODE_LABELS[m]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Note */}
        <Text style={styles.label}>Note (optional)</Text>
        <TextInput
          style={[styles.input, styles.noteInput]}
          value={note}
          onChangeText={setNote}
          placeholder="Add a note..."
          placeholderTextColor={colors.textTertiary}
          multiline
        />

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handlePay}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <MaterialIcons name="check-circle" size={20} color={colors.white} />
              <Text style={styles.submitText}>Record Payment</Text>
            </>
          )}
        </TouchableOpacity>
      </Card>
    </ScrollView>
  );
}

function InfoCell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.infoCell}>
      <Text style={styles.infoCellLabel}>{label}</Text>
      <Text style={[styles.infoCellValue, highlight && { color: colors.primary, fontWeight: '700' as const }]}>{value}</Text>
    </View>
  );
}

function QuickBtn({ label, onPress, active }: { label: string; onPress: () => void; active?: boolean }) {
  return (
    <TouchableOpacity
      style={[styles.quickBtn, active && styles.quickBtnActive]}
      onPress={onPress}
    >
      <Text style={[styles.quickBtnText, active && styles.quickBtnTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing['5xl'] },
  customerCard: { marginBottom: spacing.md },
  customerRow: { flexDirection: 'row', alignItems: 'center' },
  customerInfo: { marginLeft: spacing.md, flex: 1 },
  customerName: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.text },
  customerCode: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  customerPhone: { fontSize: fontSize.sm, color: colors.textTertiary, marginTop: 2 },
  loanCard: { marginBottom: spacing.md },
  loanHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  loanAcct: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
  loanGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  infoCell: { width: '50%', marginBottom: spacing.md },
  infoCellLabel: { fontSize: fontSize.xs, color: colors.textTertiary },
  infoCellValue: { fontSize: fontSize.base, fontWeight: fontWeight.medium, color: colors.text, marginTop: 2 },
  formTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text, marginBottom: spacing.lg },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text, marginBottom: spacing.sm, marginTop: spacing.md },
  amountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primaryBg,
  },
  currency: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: colors.primary, marginRight: spacing.sm },
  amountInput: {
    flex: 1,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.primary,
    height: 56,
  },
  quickAmounts: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  quickBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  quickBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  quickBtnText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.medium },
  quickBtnTextActive: { color: colors.white },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    height: 44,
    fontSize: fontSize.base,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  noteInput: { height: 80, textAlignVertical: 'top', paddingTop: spacing.md },
  modeRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  modeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  modeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  modeText: { fontSize: fontSize.sm, color: colors.textSecondary },
  modeTextActive: { color: colors.white },
  submitBtn: {
    backgroundColor: colors.success,
    height: 52,
    borderRadius: radius.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing['2xl'],
    gap: spacing.sm,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitText: { color: colors.white, fontSize: fontSize.md, fontWeight: fontWeight.semibold },
});
