import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize, radius } from '../theme';

type Variant = 'success' | 'warning' | 'danger' | 'info' | 'default' | 'primary';

interface Props {
  label: string;
  variant?: Variant;
  size?: 'sm' | 'md';
}

const variantColors: Record<Variant, { bg: string; text: string }> = {
  success: { bg: colors.successLight, text: colors.success },
  warning: { bg: colors.warningLight, text: colors.warning },
  danger: { bg: colors.dangerLight, text: colors.danger },
  info: { bg: colors.infoLight, text: colors.info },
  primary: { bg: colors.primaryBg, text: colors.primary },
  default: { bg: colors.borderLight, text: colors.textSecondary },
};

export default function Badge({ label, variant = 'default', size = 'sm' }: Props) {
  const c = variantColors[variant];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }, size === 'md' && styles.badgeMd]}>
      <Text style={[styles.text, { color: c.text }, size === 'md' && styles.textMd]}>
        {label}
      </Text>
    </View>
  );
}

// Map status strings to badge variants
export function getStatusVariant(status: string): Variant {
  switch (status) {
    case 'ACTIVE':
    case 'PAID':
    case 'APPROVED':
    case 'DISBURSED':
      return 'success';
    case 'PENDING':
    case 'SUBMITTED':
    case 'UNDER_REVIEW':
    case 'DRAFT':
      return 'warning';
    case 'OVERDUE':
    case 'MISSED':
    case 'REJECTED':
    case 'NPA':
      return 'danger';
    case 'CLOSED':
    case 'WRITTEN_OFF':
      return 'info';
    case 'PARTIAL':
    case 'SENT_BACK':
      return 'primary';
    default:
      return 'default';
  }
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  badgeMd: {
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  text: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  textMd: {
    fontSize: fontSize.sm,
  },
});
