import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import api from '../../api/client';
import { AuditLog } from '../../types';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import { colors, fontSize, fontWeight, spacing, radius } from '../../theme';
import { formatRelative } from '../../utils/formatters';

const ACTION_ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  LOGIN: 'login',
  APPLICATION_SUBMITTED: 'description',
  APPLICATION_APPROVED: 'check-circle',
  APPLICATION_REJECTED: 'cancel',
  LOAN_DISBURSED: 'payments',
  PAYMENT_COLLECTED: 'receipt',
  EMPLOYEE_CREATED: 'person-add',
  CUSTOMER_CREATED: 'person-add',
};

export default function AuditLogsScreen() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const result = await api.get<{ rows: AuditLog[] }>('/audit-logs');
      setLogs(result.rows || (result as unknown as AuditLog[]));
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const renderItem = ({ item }: { item: AuditLog }) => (
    <Card style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: colors.primaryBg }]}>
          <MaterialIcons
            name={ACTION_ICONS[item.action] || 'history'}
            size={20}
            color={colors.primary}
          />
        </View>
        <View style={styles.info}>
          <Text style={styles.action}>{item.action.replace(/_/g, ' ')}</Text>
          <Text style={styles.user}>{item.user?.name || 'System'}</Text>
          {item.entityType && (
            <Text style={styles.entity}>{item.entityType} {item.entityId ? `#${item.entityId.slice(-6)}` : ''}</Text>
          )}
        </View>
        <Text style={styles.time}>{formatRelative(item.createdAt)}</Text>
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          ListEmptyComponent={<EmptyState icon="history" title="No audit logs" />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg },
  card: { marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1, marginLeft: spacing.md },
  action: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text, textTransform: 'capitalize' },
  user: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  entity: { fontSize: fontSize.xs, color: colors.textTertiary, marginTop: 2 },
  time: { fontSize: fontSize.xs, color: colors.textTertiary },
});
