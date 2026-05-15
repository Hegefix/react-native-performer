import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import type { RenderReason } from '../core/types';

type HistoryEntry = {
  commitId: number;
  timestamp: number;
  reason: RenderReason;
  isUnnecessary: boolean;
};

type InspectorTabProps = {
  componentNames: string[];
  getHistory: (name: string) => HistoryEntry[];
};

function formatReason(reason: RenderReason): string {
  switch (reason.type) {
    case 'mount': return 'mount';
    case 'props-changed': return `props: ${reason.keys.join(', ')}`;
    case 'state-changed': return 'state changed';
    case 'parent-rerender': return 'parent rerender (unnecessary)';
    case 'context-changed': return `context: ${reason.provider}`;
    case 'force-update': return 'force update';
  }
}

export function InspectorTab({ componentNames, getHistory }: InspectorTabProps) {
  const [query, setQuery] = useState('');
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);

  const filteredNames = query.length > 0
    ? componentNames.filter(n => n.toLowerCase().includes(query.toLowerCase()))
    : componentNames;

  if (selectedComponent) {
    const history = getHistory(selectedComponent);
    return (
      <View style={styles.container}>
        <View style={styles.searchRow}>
          <Text
            style={styles.backButton}
            onPress={() => setSelectedComponent(null)}
          >
            {'< Back'}
          </Text>
          <Text style={styles.selectedName}>{selectedComponent}</Text>
        </View>
        <FlatList
          data={history}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => (
            <View style={styles.historyRow}>
              <Text style={styles.commitId}>#{item.commitId}</Text>
              <Text
                style={[
                  styles.reasonText,
                  item.isUnnecessary && styles.unnecessaryText,
                ]}
              >
                {formatReason(item.reason)}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>No renders recorded</Text>
          }
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search component..."
        placeholderTextColor="rgba(255, 255, 255, 0.3)"
        value={query}
        onChangeText={setQuery}
      />
      <FlatList
        data={filteredNames}
        keyExtractor={item => item}
        renderItem={({ item }) => (
          <Text
            style={styles.componentItem}
            onPress={() => setSelectedComponent(item)}
          >
            {item}
          </Text>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {query ? 'No matches' : 'No components tracked'}
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
  backButton: { color: '#3b82f6', fontSize: 14, fontWeight: '500' },
  selectedName: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  searchInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#ffffff',
    fontSize: 14,
    marginBottom: 12,
  },
  componentItem: {
    color: '#ffffff',
    fontSize: 14,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  historyRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    gap: 8,
  },
  commitId: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 12,
    width: 40,
    fontVariant: ['tabular-nums'],
  },
  reasonText: { color: 'rgba(255, 255, 255, 0.7)', fontSize: 12, flex: 1 },
  unnecessaryText: { color: '#ef4444' },
  empty: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 40,
  },
});
