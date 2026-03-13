import React from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { ComplaintsStackScreenProps } from '../../navigation/ComplaintsStack';
import EmergencyBanner from './components/EmergencyBanner';
import EmptyState from './components/EmptyState';
import IdentityDisclosureSheet from './components/IdentityDisclosureSheet';
import StatusBadge from './components/StatusBadge';
import { complaintsTheme } from './components/theme';
import {
  formatComplaintDate,
  getCategoryLabel,
  getSeverityTone,
  getStatusTone,
} from './complaints.api';
import {
  useComplaintDetail,
  useIdentityDisclosureMutation,
  useRequestCounselingMutation,
} from './hooks/useComplaints';

export default function ComplaintDetails({
  route,
  navigation,
}: ComplaintsStackScreenProps<'ComplaintDetails'>) {
  const { caseId } = route.params;
  const detailQuery = useComplaintDetail(caseId);
  const disclosureMutation = useIdentityDisclosureMutation(caseId);
  const counselingMutation = useRequestCounselingMutation(caseId);
  const complaint = detailQuery.data;
  const latestStaffResponse =
    complaint?.messages
      ?.slice()
      .reverse()
      .find((message) => message.senderType !== 'STUDENT') ?? null;

  if (detailQuery.isLoading) {
    return (
      <View style={styles.screen}>
        <View style={styles.loadingCard}>
          <Text style={styles.loadingText}>Loading complaint details...</Text>
        </View>
      </View>
    );
  }

  if (!complaint) {
    return (
      <View style={styles.screen}>
        <EmptyState
          title="Complaint unavailable"
          description="This complaint could not be loaded on the device. Reconnect if the session expired."
          actionLabel="Reconnect case"
          onAction={() => navigation.navigate('ReconnectComplaint')}
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={detailQuery.isRefetching}
          onRefresh={() => detailQuery.refetch()}
          tintColor={complaintsTheme.colors.accent}
        />
      }
    >
      <View style={styles.heroCard}>
        <Text style={styles.heroEyebrow}>{complaint.anonId}</Text>
        <Text style={styles.heroTitle}>{complaint.title}</Text>
        <Text style={styles.heroSubtitle}>
          {getCategoryLabel(complaint.category)} complaint - updated{' '}
          {formatComplaintDate(complaint.updatedAt)}
        </Text>
        <View style={styles.badgeRow}>
          <StatusBadge
            label={complaint.status.replaceAll('_', ' ')}
            tone={getStatusTone(complaint.status)}
          />
          <StatusBadge
            label={complaint.severity}
            tone={getSeverityTone(complaint.severity)}
          />
        </View>
      </View>

      {complaint.severity === 'CRITICAL' ? (
        <View style={{ marginTop: 16 }}>
          <EmergencyBanner />
        </View>
      ) : null}

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.bodyText}>{complaint.description}</Text>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Status and timeline</Text>
        <View style={styles.timeline}>
          {complaint.timeline.map((update) => (
            <View key={update.id} style={styles.timelineItem}>
              <View style={styles.timelineDot} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>{update.title}</Text>
                <Text style={styles.timelineDescription}>{update.description}</Text>
                <Text style={styles.timelineMeta}>{formatComplaintDate(update.createdAt)}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Latest staff response</Text>
        {latestStaffResponse ? (
          <>
            <Text style={styles.responseSender}>{latestStaffResponse.senderLabel}</Text>
            <Text style={styles.bodyText}>{latestStaffResponse.body}</Text>
            <Text style={styles.responseMeta}>
              Sent {formatComplaintDate(latestStaffResponse.createdAt)}
            </Text>
          </>
        ) : (
          <Text style={styles.bodyText}>
            Staff have not replied yet. Open the anonymous chat to share more information.
          </Text>
        )}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Related details</Text>
        <Text style={styles.detailRow}>
          <Text style={styles.detailLabel}>Location:</Text> {complaint.locationText || 'Not provided'}
        </Text>
        <Text style={styles.detailRow}>
          <Text style={styles.detailLabel}>Incident time:</Text>{' '}
          {complaint.incidentAt ? formatComplaintDate(complaint.incidentAt) : 'Not provided'}
        </Text>
        <Text style={styles.detailRow}>
          <Text style={styles.detailLabel}>People involved:</Text>{' '}
          {complaint.peopleInvolved || 'Not provided'}
        </Text>
        <Text style={styles.detailRow}>
          <Text style={styles.detailLabel}>Evidence:</Text>{' '}
          {complaint.attachments.length > 0
            ? complaint.attachments.map((attachment) => attachment.originalName).join(', ')
            : 'No evidence uploaded yet'}
        </Text>
      </View>

      <View style={styles.actionCard}>
        <Pressable
          style={[styles.button, styles.primaryButton]}
          onPress={() => navigation.navigate('ComplaintChat', { caseId })}
        >
          <Text style={styles.primaryButtonText}>Open anonymous chat</Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.secondaryButton]}
          onPress={() => counselingMutation.mutate()}
          disabled={counselingMutation.isPending}
        >
          <Text style={styles.secondaryButtonText}>
            {counselingMutation.isPending ? 'Routing...' : 'Request counseling'}
          </Text>
        </Pressable>
      </View>

      <IdentityDisclosureSheet onSubmit={(payload) => disclosureMutation.mutateAsync(payload)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: complaintsTheme.colors.background,
    padding: 16,
  },
  contentContainer: {
    paddingBottom: 28,
  },
  loadingCard: {
    marginTop: 12,
    backgroundColor: complaintsTheme.colors.card,
    borderRadius: complaintsTheme.radius.lg,
    borderWidth: 1,
    borderColor: complaintsTheme.colors.line,
    padding: 20,
  },
  loadingText: {
    color: complaintsTheme.colors.muted,
    fontSize: 14,
  },
  heroCard: {
    backgroundColor: complaintsTheme.colors.card,
    borderRadius: complaintsTheme.radius.lg,
    borderWidth: 1,
    borderColor: complaintsTheme.colors.line,
    padding: 20,
  },
  heroEyebrow: {
    color: complaintsTheme.colors.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  heroTitle: {
    marginTop: 8,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    color: complaintsTheme.colors.text,
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: complaintsTheme.colors.muted,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  sectionCard: {
    marginTop: 16,
    backgroundColor: complaintsTheme.colors.card,
    borderRadius: complaintsTheme.radius.lg,
    borderWidth: 1,
    borderColor: complaintsTheme.colors.line,
    padding: 18,
  },
  actionCard: {
    marginTop: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: complaintsTheme.colors.text,
  },
  bodyText: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    color: complaintsTheme.colors.text,
  },
  timeline: {
    marginTop: 12,
    gap: 14,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 12,
  },
  timelineDot: {
    marginTop: 5,
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: complaintsTheme.colors.accent,
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: complaintsTheme.colors.text,
  },
  timelineDescription: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: complaintsTheme.colors.muted,
  },
  timelineMeta: {
    marginTop: 6,
    fontSize: 11,
    color: complaintsTheme.colors.muted,
  },
  responseSender: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '700',
    color: complaintsTheme.colors.accent,
  },
  responseMeta: {
    marginTop: 8,
    fontSize: 11,
    color: complaintsTheme.colors.muted,
  },
  detailRow: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
    color: complaintsTheme.colors.text,
  },
  detailLabel: {
    fontWeight: '700',
    color: complaintsTheme.colors.primary,
  },
  button: {
    borderRadius: complaintsTheme.radius.pill,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: complaintsTheme.colors.accent,
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: complaintsTheme.colors.primary,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButtonText: {
    color: complaintsTheme.colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});
