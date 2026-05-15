import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DraggablePill } from './DraggablePill';
import { HUDDataStore } from './dataStore';
import { OffendersTab } from './OffendersTab';
import { TimelineTab } from './TimelineTab';
import { InspectorTab } from './InspectorTab';
import { onRerender } from '../core/eventBus';
import type { HUDOptions } from '../core/types';
import type { ComponentStats, CommitSummary } from './types';

type HUDContainerProps = {
  options: Required<HUDOptions>;
};

export function HUDContainer({ options }: HUDContainerProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState(options.defaultTab);
  const [totalRerenders, setTotalRerenders] = useState(0);
  const [unnecessaryPercentage, setUnnecessaryPercentage] = useState(0);
  const [offenders, setOffenders] = useState<ComponentStats[]>([]);
  const [timeline, setTimeline] = useState<CommitSummary[]>([]);
  const [showUnnecessaryOnly, setShowUnnecessaryOnly] = useState(false);

  const storeRef = useRef(new HUDDataStore({ maxCommits: options.maxCommits }));
  const bufferRef = useRef<Parameters<typeof storeRef.current.record>[0][]>([]);

  useEffect(() => {
    if (!options.enabled) return;

    const unsubscribe = onRerender((event) => {
      bufferRef.current.push(event);
    });

    const interval = setInterval(() => {
      const buffer = bufferRef.current;
      if (buffer.length === 0) return;
      bufferRef.current = [];

      for (const event of buffer) {
        storeRef.current.record(event);
      }

      const summary = storeRef.current.getSummary();
      setTotalRerenders(summary.totalRerenders);
      setUnnecessaryPercentage(summary.unnecessaryPercentage);
      setOffenders(storeRef.current.getTopOffenders(50));
      setTimeline(storeRef.current.getTimeline());
    }, options.updateInterval);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [options.enabled, options.updateInterval, options.maxCommits]);

  const handlePillPress = useCallback(() => {
    setExpanded(prev => !prev);
  }, []);

  if (!options.enabled) return null;

  if (!expanded) {
    return (
      <DraggablePill
        totalRerenders={totalRerenders}
        unnecessaryPercentage={unnecessaryPercentage}
        onPress={handlePillPress}
      />
    );
  }

  const tabs = ['offenders', 'timeline', 'inspector'] as const;

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Performer</Text>
        <TouchableOpacity onPress={handlePillPress}>
          <Text style={styles.closeButton}>-</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabBar}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.tabContent}>
        {activeTab === 'offenders' && (
          <OffendersTab
            offenders={offenders}
            showUnnecessaryOnly={showUnnecessaryOnly}
            onToggleFilter={() => setShowUnnecessaryOnly(prev => !prev)}
            onSelectComponent={() => {}}
          />
        )}
        {activeTab === 'timeline' && (
          <TimelineTab
            timeline={timeline}
            onSelectCommit={() => {}}
          />
        )}
        {activeTab === 'inspector' && (
          <InspectorTab
            componentNames={offenders.map(o => o.name)}
            getHistory={(name) => storeRef.current.getComponentHistory(name)}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    zIndex: 999999,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  closeButton: { color: '#ffffff', fontSize: 20, fontWeight: '600', paddingHorizontal: 8 },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#3b82f6' },
  tabText: { color: 'rgba(255, 255, 255, 0.5)', fontSize: 13, fontWeight: '500' },
  activeTabText: { color: '#ffffff' },
  tabContent: { flex: 1, padding: 16 },
});
