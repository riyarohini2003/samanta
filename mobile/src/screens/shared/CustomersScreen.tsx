import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { customerApi } from '../../api';
import { Customer } from '../../types';
import Card from '../../components/Card';
import Avatar from '../../components/Avatar';
import SearchBar from '../../components/SearchBar';
import EmptyState from '../../components/EmptyState';
import { colors, fontSize, fontWeight, spacing } from '../../theme';
import { formatDate } from '../../utils/formatters';

export default function CustomersScreen() {
  const navigation = useNavigation<any>();
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const result = await customerApi.list({ q: search || undefined });
      setCustomers(result.rows);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { setLoading(true); loadData(); }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const renderItem = ({ item }: { item: Customer }) => (
    <Card
      style={styles.card}
      onPress={() => navigation.navigate('CustomerDetail', { id: item.id })}
    >
      <View style={styles.row}>
        <Avatar name={item.fullName} photoUrl={item.photoUrl} size={44} />
        <View style={styles.info}>
          <Text style={styles.name}>{item.fullName}</Text>
          <Text style={styles.meta}>{item.customerCode} | {item.mobile}</Text>
          {item.branch && (
            <Text style={styles.branch}>{item.branch.name}</Text>
          )}
        </View>
        <MaterialIcons name="chevron-right" size={24} color={colors.textTertiary} />
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, code, mobile..."
        />
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('CreateCustomer')}
        >
          <MaterialIcons name="person-add" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="people"
              title="No customers found"
              message={search ? 'Try a different search term' : 'Add your first customer to get started'}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: { padding: spacing.lg, paddingTop: 0 },
  card: { marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center' },
  info: { flex: 1, marginLeft: spacing.md },
  name: { fontSize: fontSize.base, fontWeight: fontWeight.medium, color: colors.text },
  meta: { fontSize: fontSize.xs, color: colors.textTertiary, marginTop: 2 },
  branch: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
});
