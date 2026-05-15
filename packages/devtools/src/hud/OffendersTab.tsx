import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { ComponentStats } from './types';

type OffendersTabProps = {
  offenders: ComponentStats[];
  showUnnecessaryOnly: boolean;
  onToggleFilter: () => void;
  onSelectComponent: (name: string) => void;
};

export function OffendersTab({
  offenders,
  showUnnecessaryOnly,
  onToggleFilter,
  onSelectComponent,
}: OffendersTabProps) {
  const filtered = showUnnecessaryOnly
    ? offenders.filter(o => o.unnecessaryCount > 0)
    : offenders;

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        <TouchableOpacity onPress={onToggleFilter} style={styles.filterButton}>
          <Text style={styles.filterText}>
            {showUnnecessaryOnly ? 'Unnecessary only' : 'All rerenders'}
          </Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={item => item.name}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => onSelectComponent(item.name)}
          >
            <Text style={styles.rank}>#{index + 1}</Text>
            <View style={styles.rowContent}>
              <Text style={styles.componentName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.stats}>
                {item.renderCount} renders ({item.unnecessaryCount} unnecessary)
              </Text>
            </View>
            <Text style={styles.reason}>{item.lastReason.type}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No rerenders recorded</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterRow: { flexDirection: 'row', marginBottom: 8 },
  filterButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterText: { color: '#3b82f6', fontSize: 12, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  rank: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 12,
    width: 30,
    fontVariant: ['tabular-nums'],
  },
  rowContent: { flex: 1 },
  componentName: { color: '#ffffff', fontSize: 14, fontWeight: '500' },
  stats: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 11,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  reason: { color: 'rgba(255, 255, 255, 0.4)', fontSize: 11, marginLeft: 8 },
  empty: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 40,
  },
});
