import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Card from '../../components/Card';
import { colors, fontSize, fontWeight, spacing, radius } from '../../theme';
import { APP_NAME } from '../../utils/constants';

interface SettingSection {
  title: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  items: { label: string; value: string }[];
}

const SECTIONS: SettingSection[] = [
  {
    title: 'Organization',
    icon: 'business',
    items: [
      { label: 'App Name', value: APP_NAME },
      { label: 'Currency', value: 'INR' },
    ],
  },
  {
    title: 'Loan Policy',
    icon: 'policy',
    items: [
      { label: 'Daily Interest', value: 'Configured in web admin' },
      { label: 'Weekly Interest', value: 'Configured in web admin' },
      { label: 'Monthly Interest', value: 'Configured in web admin' },
      { label: 'Processing Fee', value: 'Configured in web admin' },
    ],
  },
  {
    title: 'Security',
    icon: 'security',
    items: [
      { label: 'Min Password Length', value: '6' },
      { label: 'Session Timeout', value: '15 min (access) / 30 days (refresh)' },
    ],
  },
];

export default function SettingsScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.note}>
        Full settings management is available in the web admin panel. This view shows current configuration.
      </Text>

      {SECTIONS.map((section) => (
        <Card key={section.title} style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name={section.icon} size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
          {section.items.map((item) => (
            <View key={item.label} style={styles.row}>
              <Text style={styles.label}>{item.label}</Text>
              <Text style={styles.value}>{item.value}</Text>
            </View>
          ))}
        </Card>
      ))}

      <Text style={styles.version}>Samanta LMS Mobile v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing['5xl'] },
  note: {
    fontSize: fontSize.sm, color: colors.textSecondary, backgroundColor: colors.infoLight,
    padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.lg, lineHeight: 20,
  },
  section: { marginBottom: spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  sectionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  label: { fontSize: fontSize.sm, color: colors.textSecondary },
  value: { fontSize: fontSize.sm, color: colors.text, fontWeight: fontWeight.medium, maxWidth: '60%', textAlign: 'right' },
  version: { textAlign: 'center', color: colors.textTertiary, fontSize: fontSize.xs, marginTop: spacing.xl },
});
