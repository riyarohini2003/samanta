import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { employeeApi } from '../../api';
import { User } from '../../types';
import Card from '../../components/Card';
import Avatar from '../../components/Avatar';
import Badge from '../../components/Badge';
import SearchBar from '../../components/SearchBar';
import EmptyState from '../../components/EmptyState';
import { colors, fontSize, fontWeight, spacing } from '../../theme';

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: colors.danger,
  ADMIN: colors.primary,
  BRANCH_MANAGER: colors.warning,
  EMPLOYEE: colors.info,
};

export default function EmployeesScreen() {
  const navigation = useNavigation<any>();
  const [search, setSearch] = useState('');
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const result = await employeeApi.list({ q: search || undefined });
      setEmployees(result.rows);
    } catch {} finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { setLoading(true); loadData(); }, [loadData]);
  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const renderItem = ({ item }: { item: User }) => (
    <Card style={styles.card} onPress={() => navigation.navigate('EmployeeDetail', { id: item.id })}>
      <View style={styles.row}>
        <Avatar name={item.name} size={44} color={ROLE_COLORS[item.role] || colors.primary} />
        <View style={styles.info}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.meta}>{item.employeeCode || item.loginId} | {item.mobile}</Text>
          {item.branch && <Text style={styles.branch}>{item.branch.name}</Text>}
        </View>
        <View style={styles.right}>
          <Badge
            label={item.role.replace('_', ' ')}
            variant={item.role === 'ADMIN' ? 'primary' : item.role === 'BRANCH_MANAGER' ? 'warning' : 'info'}
          />
          {!item.isActive && <Badge label="Inactive" variant="danger" />}
        </View>
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search employees..." />
      </View>
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={employees}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          ListEmptyComponent={<EmptyState icon="people" title="No employees found" />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchWrap: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  list: { padding: spacing.lg, paddingTop: 0 },
  card: { marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center' },
  info: { flex: 1, marginLeft: spacing.md },
  name: { fontSize: fontSize.base, fontWeight: fontWeight.medium, color: colors.text },
  meta: { fontSize: fontSize.xs, color: colors.textTertiary, marginTop: 2 },
  branch: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 4 },
});
