import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Card from '../../components/Card';
import { colors, fontSize, fontWeight, spacing, radius } from '../../theme';
import { REPORT_TYPES } from '../../utils/constants';

const REPORT_COLORS = [
  colors.primary, colors.success, colors.info, colors.secondary,
  colors.warning, colors.primaryLight, colors.danger, colors.textSecondary,
  colors.success, colors.primary, colors.warning, colors.info,
];

export default function ReportsScreen() {
  const navigation = useNavigation<any>();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.subtitle}>Generate and view reports</Text>

      <View style={styles.grid}>
        {REPORT_TYPES.map((report, i) => (
          <TouchableOpacity
            key={report.key}
            style={styles.reportCard}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('ReportView', { type: report.key, title: report.label })}
          >
            <View style={[styles.iconWrap, { backgroundColor: REPORT_COLORS[i] + '15' }]}>
              <MaterialIcons
                name={report.icon as keyof typeof MaterialIcons.glyphMap}
                size={24}
                color={REPORT_COLORS[i]}
              />
            </View>
            <Text style={styles.reportLabel} numberOfLines={2}>{report.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing['5xl'] },
  subtitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.xl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  reportCard: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  iconWrap: {
    width: 48, height: 48, borderRadius: radius.md,
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md,
  },
  reportLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text, textAlign: 'center' },
});
