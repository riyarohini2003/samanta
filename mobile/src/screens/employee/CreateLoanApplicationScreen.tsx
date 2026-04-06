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
import { useNavigation, useRoute } from '@react-navigation/native';
import { loanApplicationApi } from '../../api';
import { LoanType, ApiError } from '../../types';
import Card from '../../components/Card';
import { colors, fontSize, fontWeight, spacing, radius } from '../../theme';
import { LOAN_TYPES } from '../../utils/constants';
import { getToday, formatMoney } from '../../utils/formatters';

export default function CreateLoanApplicationScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const customerId = route.params?.customerId || '';

  const [loading, setLoading] = useState(false);
  const [calcResult, setCalcResult] = useState<{
    installmentAmount: number;
    totalPayable: number;
    interestAmount: number;
    maturityDate: string;
  } | null>(null);

  const [form, setForm] = useState({
    customerId,
    loanType: 'DAILY' as LoanType,
    principal: '',
    interestRate: '',
    processingFee: '0',
    tenureCount: '',
    startDate: getToday(),
    purpose: '',
    notes: '',
  });

  const set = (key: string) => (value: string) => setForm((p) => ({ ...p, [key]: value }));

  const handleCalculate = async () => {
    if (!form.principal || !form.interestRate || !form.tenureCount) {
      Alert.alert('Validation', 'Please fill principal, interest rate, and tenure');
      return;
    }
    try {
      const result = await loanApplicationApi.calculate({
        loanType: form.loanType,
        principal: parseFloat(form.principal),
        interestRate: parseFloat(form.interestRate),
        processingFee: parseFloat(form.processingFee) || 0,
        tenureCount: parseInt(form.tenureCount),
        startDate: form.startDate,
      });
      setCalcResult(result);
    } catch (err) {
      Alert.alert('Error', (err as ApiError).error || 'Calculation failed');
    }
  };

  const handleSubmit = async () => {
    if (!form.customerId.trim()) { Alert.alert('Validation', 'Customer ID is required'); return; }
    if (!form.principal || !form.interestRate || !form.tenureCount) {
      Alert.alert('Validation', 'Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      await loanApplicationApi.create({
        customerId: form.customerId.trim(),
        loanType: form.loanType,
        principal: parseFloat(form.principal),
        interestRate: parseFloat(form.interestRate),
        processingFee: parseFloat(form.processingFee) || 0,
        tenureCount: parseInt(form.tenureCount),
        startDate: form.startDate,
        purpose: form.purpose || undefined,
        notes: form.notes || undefined,
      });
      Alert.alert('Success', 'Loan application submitted successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Error', (err as ApiError).error || 'Failed to create application');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.sectionTitle}>Loan Details</Text>

        {/* Customer ID */}
        <Text style={styles.label}>Customer ID *</Text>
        <TextInput
          style={styles.input}
          value={form.customerId}
          onChangeText={set('customerId')}
          placeholder="Enter customer ID"
          placeholderTextColor={colors.textTertiary}
        />

        {/* Loan Type */}
        <Text style={styles.label}>Loan Type *</Text>
        <View style={styles.typeRow}>
          {LOAN_TYPES.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.typeChip, form.loanType === t && styles.typeChipActive]}
              onPress={() => setForm((p) => ({ ...p, loanType: t as LoanType }))}
            >
              <Text style={[styles.typeText, form.loanType === t && styles.typeTextActive]}>
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Amount Fields */}
        <Text style={styles.label}>Principal Amount *</Text>
        <TextInput
          style={styles.input}
          value={form.principal}
          onChangeText={set('principal')}
          placeholder="e.g. 50000"
          keyboardType="number-pad"
          placeholderTextColor={colors.textTertiary}
        />

        <Text style={styles.label}>Interest Rate (%) *</Text>
        <TextInput
          style={styles.input}
          value={form.interestRate}
          onChangeText={set('interestRate')}
          placeholder="e.g. 24"
          keyboardType="decimal-pad"
          placeholderTextColor={colors.textTertiary}
        />

        <Text style={styles.label}>Processing Fee (%)</Text>
        <TextInput
          style={styles.input}
          value={form.processingFee}
          onChangeText={set('processingFee')}
          placeholder="0"
          keyboardType="decimal-pad"
          placeholderTextColor={colors.textTertiary}
        />

        <Text style={styles.label}>Tenure (# installments) *</Text>
        <TextInput
          style={styles.input}
          value={form.tenureCount}
          onChangeText={set('tenureCount')}
          placeholder="e.g. 100"
          keyboardType="number-pad"
          placeholderTextColor={colors.textTertiary}
        />

        <Text style={styles.label}>Start Date</Text>
        <TextInput
          style={styles.input}
          value={form.startDate}
          onChangeText={set('startDate')}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.textTertiary}
        />

        <Text style={styles.label}>Purpose</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={form.purpose}
          onChangeText={set('purpose')}
          placeholder="Loan purpose..."
          multiline
          placeholderTextColor={colors.textTertiary}
        />

        {/* Calculate Preview */}
        <TouchableOpacity style={styles.calcBtn} onPress={handleCalculate}>
          <Text style={styles.calcBtnText}>Calculate Preview</Text>
        </TouchableOpacity>

        {calcResult && (
          <View style={styles.calcResult}>
            <Text style={styles.calcTitle}>Calculation Preview</Text>
            <View style={styles.calcRow}>
              <Text style={styles.calcLabel}>EMI / Installment</Text>
              <Text style={styles.calcValue}>{formatMoney(calcResult.installmentAmount)}</Text>
            </View>
            <View style={styles.calcRow}>
              <Text style={styles.calcLabel}>Total Interest</Text>
              <Text style={styles.calcValue}>{formatMoney(calcResult.interestAmount)}</Text>
            </View>
            <View style={styles.calcRow}>
              <Text style={styles.calcLabel}>Total Payable</Text>
              <Text style={[styles.calcValue, { color: colors.primary, fontWeight: '700' as const }]}>
                {formatMoney(calcResult.totalPayable)}
              </Text>
            </View>
            <View style={styles.calcRow}>
              <Text style={styles.calcLabel}>Maturity Date</Text>
              <Text style={styles.calcValue}>{calcResult.maturityDate}</Text>
            </View>
          </View>
        )}
      </Card>

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitBtn, loading && { opacity: 0.7 }]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color={colors.white} /> : (
          <Text style={styles.submitText}>Submit Application</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing['5xl'] },
  sectionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text, marginBottom: spacing.lg },
  label: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.medium, marginBottom: spacing.xs, marginTop: spacing.md },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: spacing.md, height: 44, fontSize: fontSize.base,
    color: colors.text, backgroundColor: colors.surface,
  },
  multiline: { height: 80, textAlignVertical: 'top', paddingTop: spacing.md },
  typeRow: { flexDirection: 'row', gap: spacing.sm },
  typeChip: {
    flex: 1, paddingVertical: spacing.md, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  typeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.textSecondary },
  typeTextActive: { color: colors.white },
  calcBtn: {
    backgroundColor: colors.infoLight, height: 44, borderRadius: radius.md,
    justifyContent: 'center', alignItems: 'center', marginTop: spacing.xl,
  },
  calcBtnText: { color: colors.info, fontWeight: fontWeight.semibold, fontSize: fontSize.base },
  calcResult: {
    marginTop: spacing.md, backgroundColor: colors.primaryBg,
    borderRadius: radius.md, padding: spacing.lg,
  },
  calcTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.primary, marginBottom: spacing.md },
  calcRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm },
  calcLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  calcValue: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text },
  submitBtn: {
    backgroundColor: colors.primary, height: 52, borderRadius: radius.lg,
    justifyContent: 'center', alignItems: 'center', marginTop: spacing.xl,
  },
  submitText: { color: colors.white, fontSize: fontSize.md, fontWeight: fontWeight.semibold },
});
