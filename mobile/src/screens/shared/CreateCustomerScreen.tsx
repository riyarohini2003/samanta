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
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { customerApi } from '../../api';
import { ApiError } from '../../types';
import Card from '../../components/Card';
import { colors, fontSize, fontWeight, spacing, radius } from '../../theme';

export default function CreateCustomerScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    fullName: '',
    fatherOrHusband: '',
    mobile: '',
    aadhaar: '',
    panOrTaxId: '',
    gender: '',
    occupation: '',
    monthlyIncome: '',
    currentAddress: '',
    permanentAddress: '',
    guarantorName: '',
    guarantorMobile: '',
    guarantorRelation: '',
    bankName: '',
    bankAccount: '',
    ifsc: '',
    nomineeName: '',
    nomineeRelation: '',
  });

  const set = (key: string) => (value: string) => setForm((p) => ({ ...p, [key]: value }));

  const handleSubmit = async () => {
    if (!form.fullName.trim()) { Alert.alert('Validation', 'Full name is required'); return; }
    if (!form.mobile.trim()) { Alert.alert('Validation', 'Mobile number is required'); return; }
    if (!form.currentAddress.trim()) { Alert.alert('Validation', 'Current address is required'); return; }

    setLoading(true);
    try {
      await customerApi.create({
        fullName: form.fullName.trim(),
        fatherOrHusband: form.fatherOrHusband || undefined,
        mobile: form.mobile.trim(),
        aadhaar: form.aadhaar || undefined,
        panOrTaxId: form.panOrTaxId || undefined,
        gender: form.gender || undefined,
        occupation: form.occupation || undefined,
        monthlyIncome: form.monthlyIncome ? parseFloat(form.monthlyIncome) : undefined,
        currentAddress: form.currentAddress.trim(),
        permanentAddress: form.permanentAddress || undefined,
        guarantorName: form.guarantorName || undefined,
        guarantorMobile: form.guarantorMobile || undefined,
        guarantorRelation: form.guarantorRelation || undefined,
        bankName: form.bankName || undefined,
        bankAccount: form.bankAccount || undefined,
        ifsc: form.ifsc || undefined,
        nomineeName: form.nomineeName || undefined,
        nomineeRelation: form.nomineeRelation || undefined,
        branchId: user?.branchId || '',
      });
      Alert.alert('Success', 'Customer created successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      const apiErr = err as ApiError;
      Alert.alert('Error', apiErr.error || 'Failed to create customer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.sectionTitle}>Basic Information</Text>
        <Field label="Full Name *" value={form.fullName} onChange={set('fullName')} />
        <Field label="Father/Husband Name" value={form.fatherOrHusband} onChange={set('fatherOrHusband')} />
        <Field label="Mobile Number *" value={form.mobile} onChange={set('mobile')} keyboard="phone-pad" />
        <Field label="Aadhaar Number" value={form.aadhaar} onChange={set('aadhaar')} keyboard="number-pad" />
        <Field label="PAN / Tax ID" value={form.panOrTaxId} onChange={set('panOrTaxId')} autoCapitalize="characters" />
        <Field label="Gender" value={form.gender} onChange={set('gender')} />
        <Field label="Occupation" value={form.occupation} onChange={set('occupation')} />
        <Field label="Monthly Income" value={form.monthlyIncome} onChange={set('monthlyIncome')} keyboard="number-pad" />
      </Card>

      <Card style={{ marginTop: spacing.md }}>
        <Text style={styles.sectionTitle}>Address</Text>
        <Field label="Current Address *" value={form.currentAddress} onChange={set('currentAddress')} multiline />
        <Field label="Permanent Address" value={form.permanentAddress} onChange={set('permanentAddress')} multiline />
      </Card>

      <Card style={{ marginTop: spacing.md }}>
        <Text style={styles.sectionTitle}>Guarantor</Text>
        <Field label="Name" value={form.guarantorName} onChange={set('guarantorName')} />
        <Field label="Mobile" value={form.guarantorMobile} onChange={set('guarantorMobile')} keyboard="phone-pad" />
        <Field label="Relation" value={form.guarantorRelation} onChange={set('guarantorRelation')} />
      </Card>

      <Card style={{ marginTop: spacing.md }}>
        <Text style={styles.sectionTitle}>Bank Details</Text>
        <Field label="Bank Name" value={form.bankName} onChange={set('bankName')} />
        <Field label="Account Number" value={form.bankAccount} onChange={set('bankAccount')} keyboard="number-pad" />
        <Field label="IFSC Code" value={form.ifsc} onChange={set('ifsc')} autoCapitalize="characters" />
      </Card>

      <Card style={{ marginTop: spacing.md }}>
        <Text style={styles.sectionTitle}>Nominee</Text>
        <Field label="Nominee Name" value={form.nomineeName} onChange={set('nomineeName')} />
        <Field label="Relation" value={form.nomineeRelation} onChange={set('nomineeRelation')} />
      </Card>

      <TouchableOpacity
        style={[styles.submitBtn, loading && { opacity: 0.7 }]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.submitText}>Create Customer</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

function Field({ label, value, onChange, keyboard, multiline, autoCapitalize }: {
  label: string; value: string; onChange: (v: string) => void;
  keyboard?: 'default' | 'number-pad' | 'phone-pad' | 'decimal-pad';
  multiline?: boolean; autoCapitalize?: 'none' | 'characters';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.multilineInput]}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboard || 'default'}
        multiline={multiline}
        autoCapitalize={autoCapitalize}
        placeholderTextColor={colors.textTertiary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing['5xl'] },
  sectionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text, marginBottom: spacing.md },
  field: { marginBottom: spacing.md },
  label: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.medium, marginBottom: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 44,
    fontSize: fontSize.base,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  multilineInput: { height: 80, textAlignVertical: 'top', paddingTop: spacing.md },
  submitBtn: {
    backgroundColor: colors.primary,
    height: 52,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  submitText: { color: colors.white, fontSize: fontSize.md, fontWeight: fontWeight.semibold },
});
