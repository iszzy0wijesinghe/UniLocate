import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { ComplaintsStackScreenProps } from '../../navigation/ComplaintsStack';
import ChatBubble from './components/ChatBubble';
import EmptyState from './components/EmptyState';
import EvidenceUploader from './components/EvidenceUploader';
import { complaintsTheme } from './components/theme';
import { useComplaintMessages, useSendComplaintMessageMutation } from './hooks/useComplaints';
import type { AttachmentDraft } from './types/complaints';

export default function Chat({
  route,
  navigation,
}: ComplaintsStackScreenProps<'ComplaintChat'>) {
  const { caseId } = route.params;
  const messagesQuery = useComplaintMessages(caseId);
  const sendMessageMutation = useSendComplaintMessageMutation(caseId);
  const [draft, setDraft] = useState('');
  const [requestCounseling, setRequestCounseling] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);

  const handleSend = async () => {
    if (!draft.trim()) {
      return;
    }

    await sendMessageMutation.mutateAsync({
      body: draft.trim(),
      requestCounseling,
      attachments,
    });

    setDraft('');
    setRequestCounseling(false);
    setAttachments([]);
  };

  if (messagesQuery.isLoading) {
    return (
      <View style={styles.screen}>
        <View style={styles.loadingCard}>
          <Text style={styles.loadingText}>Loading anonymous chat...</Text>
        </View>
      </View>
    );
  }

  if (!messagesQuery.data) {
    return (
      <View style={styles.screen}>
        <EmptyState
          title="Chat unavailable"
          description="Reconnect the case if the session on this device expired."
          actionLabel="Back to details"
          onAction={() => navigation.goBack()}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Anonymous follow-up chat</Text>
          <Text style={styles.headerSubtitle}>Your identity stays hidden in this thread.</Text>
        </View>
        <Pressable
          style={styles.headerAction}
          onPress={() => navigation.navigate('ComplaintDetails', { caseId })}
        >
          <Text style={styles.headerActionText}>Details</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.thread}
        contentContainerStyle={styles.threadContent}
        refreshControl={
          <RefreshControl
            refreshing={messagesQuery.isRefetching}
            onRefresh={() => messagesQuery.refetch()}
            tintColor={complaintsTheme.colors.accent}
          />
        }
      >
        {messagesQuery.data.map((message) => (
          <ChatBubble key={message.id} message={message} />
        ))}
      </ScrollView>

      <View style={styles.composeCard}>
        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleTitle}>Request counseling follow-up</Text>
            <Text style={styles.toggleHelp}>
              Turn this on if you want the next message routed for counselor attention.
            </Text>
          </View>
          <Switch
            value={requestCounseling}
            onValueChange={setRequestCounseling}
            trackColor={{ false: '#D0D5DD', true: '#FCC9AE' }}
            thumbColor={requestCounseling ? complaintsTheme.colors.accent : '#FFFFFF'}
          />
        </View>

        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Write an anonymous follow-up..."
          placeholderTextColor="#98A2B3"
          style={styles.input}
          multiline
          textAlignVertical="top"
        />

        <EvidenceUploader attachments={attachments} onChange={setAttachments} />

        {sendMessageMutation.isError ? (
          <Text style={styles.errorText}>
            {(sendMessageMutation.error as Error).message || 'Could not send message'}
          </Text>
        ) : null}

        <View style={styles.actionRow}>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('ComplaintDetails', { caseId })}
          >
            <Text style={styles.secondaryButtonText}>Back</Text>
          </Pressable>
          <Pressable
            style={styles.primaryButton}
            onPress={handleSend}
            disabled={sendMessageMutation.isPending}
          >
            <Text style={styles.primaryButtonText}>
              {sendMessageMutation.isPending ? 'Sending...' : 'Send'}
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: complaintsTheme.colors.background,
    padding: 16,
  },
  loadingCard: {
    backgroundColor: complaintsTheme.colors.card,
    borderRadius: complaintsTheme.radius.lg,
    borderWidth: 1,
    borderColor: complaintsTheme.colors.line,
    padding: 20,
  },
  loadingText: {
    fontSize: 14,
    color: complaintsTheme.colors.muted,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: complaintsTheme.colors.text,
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: complaintsTheme.colors.muted,
  },
  headerAction: {
    borderRadius: complaintsTheme.radius.pill,
    borderWidth: 1,
    borderColor: complaintsTheme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  headerActionText: {
    color: complaintsTheme.colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  thread: {
    flex: 1,
  },
  threadContent: {
    paddingBottom: 16,
  },
  composeCard: {
    marginTop: 12,
    backgroundColor: complaintsTheme.colors.card,
    borderRadius: complaintsTheme.radius.lg,
    borderWidth: 1,
    borderColor: complaintsTheme.colors.line,
    padding: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  toggleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: complaintsTheme.colors.primary,
  },
  toggleHelp: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: complaintsTheme.colors.muted,
  },
  input: {
    marginTop: 14,
    minHeight: 108,
    borderRadius: complaintsTheme.radius.md,
    borderWidth: 1,
    borderColor: complaintsTheme.colors.line,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: complaintsTheme.colors.text,
    fontSize: 14,
    backgroundColor: '#FFFFFF',
  },
  errorText: {
    marginTop: 10,
    color: complaintsTheme.colors.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  primaryButton: {
    flex: 1,
    borderRadius: complaintsTheme.radius.pill,
    backgroundColor: complaintsTheme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: complaintsTheme.radius.pill,
    borderWidth: 1,
    borderColor: complaintsTheme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    backgroundColor: '#FFFFFF',
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
