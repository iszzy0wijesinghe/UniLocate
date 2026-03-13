import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ComplaintsStackScreenProps } from '../../navigation/ComplaintsStack';
import CategoryPicker from './components/CategoryPicker';
import ComplaintCard from './components/ComplaintCard';
import EmptyState from './components/EmptyState';
import StatusBadge from './components/StatusBadge';
import { complaintsTheme } from './components/theme';
import { complaintCategories } from './complaints.api';
import { useComplaintCases, useHydrateComplaintSessions } from './hooks/useComplaints';
import type { ComplaintCategory } from './types/complaints';

type CategoryFilter = 'all' | ComplaintCategory;

export default function ComplaintsHome({
  navigation,
}: ComplaintsStackScreenProps<'ComplaintsHome'>) {
  useHydrateComplaintSessions();
  const casesQuery = useComplaintCases();
  const complaints = casesQuery.data ?? [];
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

  const categoryOptions = useMemo(
    () => [
      { label: 'All', value: 'all' as const, helper: `${complaints.length} reports` },
      ...complaintCategories.map((category) => ({
        label: category.label,
        value: category.value,
        helper: `${complaints.filter((item) => item.category === category.value).length} cases`,
      })),
    ],
    [complaints],
  );

  const filteredComplaints = useMemo(() => {
    if (categoryFilter === 'all') {
      return complaints;
    }
    return complaints.filter((complaint) => complaint.category === categoryFilter);
  }, [categoryFilter, complaints]);

  const criticalCount = complaints.filter((item) => item.severity === 'CRITICAL').length;
  const awaitingReplyCount = complaints.filter((item) => item.status === 'NEED_MORE_INFO').length;

  return (
    <SafeAreaView style={styles.screen}>
      <FlatList
        data={filteredComplaints}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={casesQuery.isRefetching}
            onRefresh={() => casesQuery.refetch()}
            tintColor={complaintsTheme.colors.accent}
          />
        }
        ListHeaderComponent={
          <>
            <View style={styles.heroCard}>
              <Text style={styles.heroEyebrow}>Anonymous complaints</Text>
              <Text style={styles.heroTitle}>
                Report harm privately and continue the follow-up without exposing your identity.
              </Text>
              <Text style={styles.heroSubtitle}>
                This device stores only your anonymous case sessions. Keep the secret somewhere safe
                in case you need to reconnect later.
              </Text>

              <View style={styles.heroActionRow}>
                <Pressable
                  style={[styles.actionButton, styles.primaryAction]}
                  onPress={() => navigation.navigate('NewComplaint')}
                >
                  <Text style={styles.primaryActionText}>File new complaint</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionButton, styles.secondaryAction]}
                  onPress={() => navigation.navigate('ReconnectComplaint')}
                >
                  <Text style={styles.secondaryActionText}>Reconnect</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.noticeCard}>
              <Text style={styles.noticeTitle}>Safety first</Text>
              <Text style={styles.noticeText}>
                Critical complaints mentioning self-harm, suicide, or violence are highlighted for
                urgent counselor review and emergency resource guidance.
              </Text>
            </View>

            <View style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>{complaints.length}</Text>
                <Text style={styles.metricLabel}>Stored on this device</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>{awaitingReplyCount}</Text>
                <Text style={styles.metricLabel}>Need more info</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>{criticalCount}</Text>
                <Text style={styles.metricLabel}>Critical follow-ups</Text>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Browse by category</Text>
              <StatusBadge label="Anonymous only" tone="accent" />
            </View>
            <CategoryPicker
              options={categoryOptions}
              value={categoryFilter}
              onChange={setCategoryFilter}
            />

            <View style={[styles.sectionHeader, styles.complaintsHeader]}>
              <Text style={styles.sectionTitle}>Your stored complaint sessions</Text>
              <Text style={styles.sectionMeta}>{filteredComplaints.length} visible</Text>
            </View>
          </>
        }
        ListEmptyComponent={
          casesQuery.isLoading ? (
            <View style={styles.loadingCard}>
              <Text style={styles.loadingText}>Loading complaint sessions...</Text>
            </View>
          ) : (
            <EmptyState
              title="No complaint sessions on this device"
              description="Create a new complaint or reconnect with your Anonymous ID and secret to bring a case back into this dashboard."
              actionLabel="Create complaint"
              onAction={() => navigation.navigate('NewComplaint')}
            />
          )
        }
        renderItem={({ item }) => (
          <ComplaintCard
            complaint={item}
            onPress={() => navigation.navigate('ComplaintDetails', { caseId: item.id })}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: complaintsTheme.colors.background,
  },
  listContent: {
    padding: 16,
    paddingBottom: 28,
    flexGrow: 1,
  },
  heroCard: {
    backgroundColor: complaintsTheme.colors.primary,
    borderRadius: complaintsTheme.radius.lg,
    padding: 22,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    color: '#CCE2E8',
    letterSpacing: 0.8,
  },
  heroTitle: {
    marginTop: 10,
    fontSize: 25,
    lineHeight: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroSubtitle: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    color: '#DCEEF2',
  },
  heroActionRow: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    borderRadius: complaintsTheme.radius.pill,
    paddingHorizontal: 18,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryAction: {
    backgroundColor: complaintsTheme.colors.accent,
  },
  secondaryAction: {
    backgroundColor: '#FFFFFF',
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryActionText: {
    color: complaintsTheme.colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  noticeCard: {
    marginTop: 16,
    backgroundColor: complaintsTheme.colors.warningSoft,
    borderRadius: complaintsTheme.radius.md,
    borderWidth: 1,
    borderColor: '#F7C8AA',
    padding: 16,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: complaintsTheme.colors.accent,
  },
  noticeText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: complaintsTheme.colors.primary,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: complaintsTheme.colors.card,
    borderRadius: complaintsTheme.radius.md,
    borderWidth: 1,
    borderColor: complaintsTheme.colors.line,
    padding: 14,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: complaintsTheme.colors.text,
  },
  metricLabel: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: complaintsTheme.colors.muted,
  },
  sectionHeader: {
    marginTop: 22,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: complaintsTheme.colors.text,
  },
  complaintsHeader: {
    marginBottom: 14,
  },
  sectionMeta: {
    fontSize: 12,
    color: complaintsTheme.colors.muted,
  },
  loadingCard: {
    backgroundColor: complaintsTheme.colors.card,
    borderRadius: complaintsTheme.radius.lg,
    borderWidth: 1,
    borderColor: complaintsTheme.colors.line,
    padding: 18,
  },
  loadingText: {
    fontSize: 14,
    color: complaintsTheme.colors.muted,
  },
});
