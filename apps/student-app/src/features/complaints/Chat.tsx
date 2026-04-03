/** @format */

import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import type { ComplaintsStackScreenProps } from "../../navigation/ComplaintsStack";
import ChatBubble from "./components/ChatBubble";
import EmptyState from "./components/EmptyState";
import EvidenceUploader from "./components/EvidenceUploader";
import { complaintsTheme } from "./components/theme";
import {
  useComplaintMessages,
  useSendComplaintMessageMutation,
  useUploadComplaintAttachmentMutation,
} from "./hooks/useComplaints";
import type { AttachmentDraft } from "./types/complaints";

export default function Chat({
  route,
  navigation,
}: ComplaintsStackScreenProps<"ComplaintChat">) {
  const { caseId } = route.params;
  const tabBarHeight = useBottomTabBarHeight();

  const messagesQuery = useComplaintMessages(caseId);
  const sendMessageMutation = useSendComplaintMessageMutation(caseId);
  const uploadAttachmentMutation = useUploadComplaintAttachmentMutation(caseId);

  const [draft, setDraft] = useState("");
  const [requestCounseling, setRequestCounseling] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);
  const [showExtras, setShowExtras] = useState(false);

  const listRef = useRef<FlatList<any>>(null);

  useEffect(() => {
    if (!messagesQuery.data?.length) return;

    const t = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 80);

    return () => clearTimeout(t);
  }, [messagesQuery.data]);

  const handleSend = async () => {
    if (!draft.trim() && attachments.length === 0) return;

    try {
      const uploadedAttachmentIds: string[] = [];

      for (const attachment of attachments) {
        const uploaded = await uploadAttachmentMutation.mutateAsync(attachment);
        uploadedAttachmentIds.push(uploaded.id);
      }

      await sendMessageMutation.mutateAsync({
        body: draft.trim(),
        requestCounseling,
        attachmentIds: uploadedAttachmentIds,
      });

      setDraft("");
      setRequestCounseling(false);
      setAttachments([]);
      setShowExtras(false);
    } catch (error) {
      console.error("Complaint chat send failed:", error);
    }
  };

  if (messagesQuery.isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <View style={styles.screen}>
          <View style={styles.loadingCard}>
            <Text style={styles.loadingText}>Loading anonymous chat...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!messagesQuery.data) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <View style={styles.screen}>
          <EmptyState
            title="Chat unavailable"
            description="Reconnect the case if the session on this device expired."
            actionLabel="Back to details"
            onAction={() => navigation.goBack()}
          />
        </View>
      </SafeAreaView>
    );
  }

  const isBusy =
    sendMessageMutation.isPending || uploadAttachmentMutation.isPending;

  const combinedError =
    (sendMessageMutation.error as Error | null) ||
    (uploadAttachmentMutation.error as Error | null);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle}>Anonymous support chat</Text>
            <Text style={styles.headerSubtitle}>
              Your identity stays hidden in this conversation.
            </Text>
          </View>

          <Pressable
            style={styles.headerAction}
            onPress={() => navigation.navigate("ComplaintDetails", { caseId })}
          >
            <Text style={styles.headerActionText}>Details</Text>
          </Pressable>
        </View>

        <View style={styles.threadShell}>
          <FlatList
            ref={listRef}
            style={styles.thread}
            data={messagesQuery.data}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <ChatBubble message={item} />}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.threadContent}
            refreshControl={
              <RefreshControl
                refreshing={messagesQuery.isRefetching}
                onRefresh={() => messagesQuery.refetch()}
                tintColor={complaintsTheme.colors.accent}
              />
            }
            onContentSizeChange={() =>
              listRef.current?.scrollToEnd({ animated: true })
            }
            ListHeaderComponent={
              <View style={styles.systemCard}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={15}
                  color={complaintsTheme.colors.primary}
                />
                <Text style={styles.systemText}>
                  Only the conversation content is shown here. Your personal
                  identity is not displayed in this thread.
                </Text>
              </View>
            }
          />
        </View>

        <View
          style={[
            styles.composerWrap,
            { marginBottom: Math.max(tabBarHeight + 6, 18) },
          ]}
        >
          <View style={styles.quickActionsRow}>
            <Pressable
              style={[
                styles.quickChip,
                requestCounseling && styles.quickChipActive,
              ]}
              onPress={() => setRequestCounseling((prev) => !prev)}
            >
              <Ionicons
                name="medical-outline"
                size={14}
                color={
                  requestCounseling ? "#FFFFFF" : complaintsTheme.colors.primary
                }
              />
              <Text
                style={[
                  styles.quickChipText,
                  requestCounseling && styles.quickChipTextActive,
                ]}
              >
                Counselor follow-up
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.quickChip,
                showExtras && styles.quickChipMutedActive,
              ]}
              onPress={() => setShowExtras((prev) => !prev)}
            >
              <Ionicons
                name={showExtras ? "close-outline" : "attach-outline"}
                size={15}
                color={complaintsTheme.colors.primary}
              />
              <Text style={styles.quickChipText}>Attachments</Text>
            </Pressable>
          </View>

          {showExtras ? (
            <View style={styles.extraPanel}>
              <View style={styles.extraHeader}>
                <Text style={styles.extraTitle}>Add evidence</Text>
                <Switch
                  value={requestCounseling}
                  onValueChange={setRequestCounseling}
                  trackColor={{ false: "#D0D5DD", true: "#FCC9AE" }}
                  thumbColor={
                    requestCounseling
                      ? complaintsTheme.colors.accent
                      : "#FFFFFF"
                  }
                />
              </View>

              <Text style={styles.extraHelp}>
                Turn on counselor follow-up if the next message needs support
                team attention.
              </Text>

              <EvidenceUploader
                attachments={attachments}
                onChange={setAttachments}
              />
            </View>
          ) : null}

          <View style={styles.composerRow}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Write an anonymous follow-up..."
              placeholderTextColor="#98A2B3"
              style={styles.input}
              multiline
              textAlignVertical="center"
            />

            <Pressable
              style={[styles.sendButton, isBusy && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={isBusy}
            >
              {isBusy ? (
                <Text style={styles.sendButtonText}>...</Text>
              ) : (
                <Ionicons name="send" size={18} color="#FFFFFF" />
              )}
            </Pressable>
          </View>

          {combinedError ? (
            <Text style={styles.errorText}>
              {combinedError.message || "Could not send message"}
            </Text>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: complaintsTheme.colors.background,
  },
  screen: {
    flex: 1,
    backgroundColor: complaintsTheme.colors.background,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
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
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: complaintsTheme.colors.text,
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: complaintsTheme.colors.muted,
  },
  headerAction: {
    borderRadius: complaintsTheme.radius.pill,
    borderWidth: 1,
    borderColor: complaintsTheme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
  },
  headerActionText: {
    color: complaintsTheme.colors.primary,
    fontWeight: "700",
    fontSize: 13,
  },
  threadShell: {
    flex: 1,
  },
  thread: {
    flex: 1,
  },
  threadContent: {
    paddingBottom: 14,
  },
  systemCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#EEF4FF",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  systemText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: complaintsTheme.colors.primary,
    fontWeight: "600",
  },
  composerWrap: {
    marginTop: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: complaintsTheme.colors.line,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
  },
  quickActionsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
    flexWrap: "wrap",
  },
  quickChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: complaintsTheme.colors.line,
  },
  quickChipActive: {
    backgroundColor: complaintsTheme.colors.accent,
    borderColor: complaintsTheme.colors.accent,
  },
  quickChipMutedActive: {
    backgroundColor: "#EEF4FF",
    borderColor: "#C7D7FE",
  },
  quickChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: complaintsTheme.colors.primary,
  },
  quickChipTextActive: {
    color: "#FFFFFF",
  },
  extraPanel: {
    marginBottom: 10,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: complaintsTheme.colors.line,
    padding: 12,
  },
  extraHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  extraTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: complaintsTheme.colors.primary,
  },
  extraHelp: {
    marginTop: 6,
    marginBottom: 10,
    fontSize: 12,
    lineHeight: 18,
    color: complaintsTheme.colors.muted,
  },
  composerRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 110,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: complaintsTheme.colors.line,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    color: complaintsTheme.colors.text,
    fontSize: 14,
    backgroundColor: "#F8FAFC",
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: complaintsTheme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.7,
  },
  sendButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  errorText: {
    marginTop: 10,
    color: complaintsTheme.colors.accent,
    fontSize: 13,
    fontWeight: "600",
  },
});