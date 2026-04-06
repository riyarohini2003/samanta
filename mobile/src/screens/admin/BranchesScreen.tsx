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
import { useNavigation } from '@react-navigation/native';
import { branchApi } from '../../api';
import { Branch } from '../../types';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import SearchBar from '../../components/SearchBar';
import EmptyState from '../../components/EmptyState';
import { colors, fontSize, fontWeight, spacing } from '../../theme';

export default function BranchesScreen() {
  const navigation = useNavigation<any>();
  const [search, setSearch] = useState('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const result = await branchApi.list({ q: search || undefined });
      setBranches(result.rows);
    } catch {} finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { setLoading(true); loadData(); }, [loadData]);

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const renderItem = ({ item }: { item: Branch }) => (
    <Card
      style={styles.card}
      onPress={() => navigation.navigate('BranchDetail', { id: item.id })}
    >
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <MaterialIcons name="business" size={24} color={colors.primary} />
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.meta}>{item.code} | {item.city}, {item.state}</Text>
          <Text style={styles.contact}>{item.contactNumber}</Text>
        </View>
        <Badge
          label={item.isActive ? 'Active' : 'Inactive'}
          variant={item.isActive ? 'success' : 'danger'}
        />
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search branches..." />
      </View>
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={branches}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          ListEmptyComponent={<EmptyState icon="business" title="No branches" />}
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
  iconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: colors.primaryBg, justifyContent: 'center', alignItems: 'center',
  },
  info: { flex: 1, marginLeft: spacing.md },
  name: { fontSize: fontSize.base, fontWeight: fontWeight.medium, color: colors.text },
  meta: { fontSize: fontSize.xs, color: colors.textTertiary, marginTop: 2 },
  contact: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
});
