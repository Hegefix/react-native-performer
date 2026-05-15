import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { CommitSummary } from './types';

type TimelineTabProps = {
  timeline: CommitSummary[];
  onSelectCommit: (commitId: number) => void;
};

const MAX_BAR_HEIGHT = 60;

export function TimelineTab({ timeline, onSelectCommit }: TimelineTabProps) {
  const maxRendered = Math.max(1, ...timeline.map(c => c.totalRendered));

  return (
    <View style={styles.container}>
      <FlatList
        data={timeline}
        horizontal
        keyExtractor={item => String(item.commitId)}
        renderItem={({ item }) => {
          const barHeight = Math.max(4, (item.totalRendered / maxRendered) * MAX_BAR_HEIGHT);
          const unnecessaryRatio = item.totalRendered === 0
            ? 0
            : item.unnecessaryCount / item.totalRendered;
          const barColor = unnecessaryRatio > 0.3
            ? '#ef4444'
            : unnecessaryRatio > 0.1
            ? '#eab308'
            : '#3b82f6';

          return (
            <TouchableOpacity
              style={styles.barContainer}
              onPress={() => onSelectCommit(item.commitId)}
            >
              <View
                style={[styles.bar, { height: barHeight, backgroundColor: barColor }]}
              />
              <Text style={styles.barLabel}>{item.totalRendered}</Text>
            </TouchableOpacity>
          );
        }}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.empty}>No commits yet</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { alignItems: 'flex-end', paddingVertical: 16 },
  barContainer: {
    alignItems: 'center',
    marginHorizontal: 2,
    justifyContent: 'flex-end',
    minHeight: MAX_BAR_HEIGHT + 20,
  },
  bar: { width: 8, borderRadius: 2 },
  barLabel: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 8,
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  empty: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 40,
    width: '100%',
  },
});
