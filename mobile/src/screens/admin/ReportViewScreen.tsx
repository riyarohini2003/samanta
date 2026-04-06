import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { reportApi } from '../../api';
import { ReportResult } from '../../types';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import { colors, fontSize, fontWeight, spacing, radius } from '../../theme';
import { getToday } from '../../utils/formatters';

export default function ReportViewScreen() {
  const route = useRoute<any>();
  const { type, title } = route.params;
  const [report, setReport] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await reportApi.generate({ type, date: getToday() });
      setReport(data);
    } catch {} finally { setLoading(false); }
  }, [type]);

  useEffect(() => { loadData(); }, [loadData]);
  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  if (loading) return <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1 } as any} />;

  if (!report || report.rows.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <EmptyState icon="assessment" title="No data" message="No data available for this report" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
    >
      <Text style={styles.title}>{report.title || title}</Text>

      {/* Summary */}
      {report.summary && (
        <Card style={styles.summaryCard}>
          {Object.entries(report.summary).map(([key, val]) => (
            <View key={key} style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{key.replace(/([A-Z])/g, ' $1').trim()}</Text>
              <Text style={styles.summaryValue}>{String(val)}</Text>
            </View>
          ))}
        </Card>
      )}

      {/* Table */}
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View>
          {/* Header */}
          <View style={styles.tableHeader}>
            {report.columns.map((col) => (
              <View key={col.key} style={styles.tableCell}>
                <Text style={styles.tableHeaderText}>{col.label}</Text>
              </View>
            ))}
          </View>
          {/* Rows */}
          {report.rows.map((row, idx) => (
            <View key={idx} style={[styles.tableRow, idx % 2 === 0 && styles.tableRowEven]}>
              {report.columns.map((col) => (
                <View key={col.key} style={styles.tableCell}>
                  <Text style={styles.tableCellText} numberOfLines={2}>
                    {String(row[col.key] ?? '\u2014')}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  title: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.lg },
  summaryCard: { marginBottom: spacing.lg },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  summaryLabel: { fontSize: fontSize.sm, color: colors.textSecondary, textTransform: 'capitalize' },
  summaryValue: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text },
  tableHeader: { flexDirection: 'row', backgroundColor: colors.primary, borderRadius: radius.sm },
  tableHeaderText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.white },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  tableRowEven: { backgroundColor: colors.borderLight },
  tableCell: { width: 120, paddingHorizontal: spacing.sm, paddingVertical: spacing.md },
  tableCellText: { fontSize: fontSize.xs, color: colors.text },
});
