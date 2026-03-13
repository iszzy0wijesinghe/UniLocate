import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  formatComplaintDate,
  getCategoryLabel,
  getSeverityTone,
  getStatusTone,
} from '../complaints.api';
import type { ComplaintSummary } from '../types/complaints';
import StatusBadge from './StatusBadge';
import { complaintsTheme } from './theme';

type Props = {
  complaint: ComplaintSummary;
  onPress: () => void;
};

export default function ComplaintCard({ complaint, onPress }: Props) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.row}>
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{complaint.title}</Text>
            <StatusBadge
              label={complaint.status.replaceAll("_", " ")}
              tone={getStatusTone(complaint.status)}
            />
          </View>
          <Text style={styles.meta}>
            {getCategoryLabel(complaint.category)} - {formatComplaintDate(complaint.updatedAt)}
          </Text>
          <Text style={styles.description} numberOfLines={2}>
            {complaint.description}
          </Text>
          <View style={styles.footerRow}>
            <StatusBadge
              label={complaint.severity}
              tone={getSeverityTone(complaint.severity)}
            />
            <Text style={styles.anonId}>{complaint.anonId}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: complaintsTheme.colors.card,
    borderRadius: complaintsTheme.radius.md,
    borderWidth: 1,
    borderColor: complaintsTheme.colors.line,
    padding: 16,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
  },
  content: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: complaintsTheme.colors.text,
  },
  meta: {
    marginTop: 6,
    fontSize: 12,
    color: complaintsTheme.colors.muted,
  },
  description: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 19,
    color: complaintsTheme.colors.text,
  },
  footerRow: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  anonId: {
    fontSize: 11,
    fontWeight: "700",
    color: complaintsTheme.colors.primary,
    letterSpacing: 0.4,
  },
});
