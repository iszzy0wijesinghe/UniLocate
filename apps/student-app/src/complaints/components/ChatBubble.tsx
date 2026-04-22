import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { formatComplaintDate } from '../complaints.api';
import type { ComplaintMessage } from '../types/complaints';
import { complaintsTheme } from './theme';

type Props = {
  message: ComplaintMessage;
};

export default function ChatBubble({ message }: Props) {
  const mine = message.senderType === 'STUDENT';

  return (
    <View style={[styles.wrapper, mine ? styles.mineWrapper : styles.theirsWrapper]}>
      <View style={[styles.bubble, mine ? styles.mineBubble : styles.theirsBubble]}>
        <Text style={[styles.sender, mine ? styles.mineText : styles.theirsText]}>
          {message.senderLabel}
        </Text>
        <Text style={[styles.body, mine ? styles.mineText : styles.theirsText]}>
          {message.body}
        </Text>
        <Text style={[styles.meta, mine ? styles.mineMeta : styles.theirsMeta]}>
          {formatComplaintDate(message.createdAt)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 12,
    flexDirection: "row",
  },
  mineWrapper: {
    justifyContent: "flex-end",
  },
  theirsWrapper: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "84%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  mineBubble: {
    backgroundColor: complaintsTheme.colors.accent,
  },
  theirsBubble: {
    backgroundColor: complaintsTheme.colors.card,
    borderWidth: 1,
    borderColor: complaintsTheme.colors.line,
  },
  sender: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
  meta: {
    marginTop: 8,
    fontSize: 11,
  },
  mineText: {
    color: "#FFFFFF",
  },
  theirsText: {
    color: complaintsTheme.colors.text,
  },
  mineMeta: {
    color: "#FFE6D7",
  },
  theirsMeta: {
    color: complaintsTheme.colors.muted,
  },
});
