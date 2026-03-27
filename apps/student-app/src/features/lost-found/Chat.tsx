import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
} from "react-native";
import { RouteProp, useRoute } from "@react-navigation/native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import type { LostFoundStackParamList } from "../../navigation/LostFoundStack";
import {
  getPostChat,
  markChatNotificationsRead,
  sendPostChatMessage,
  type ChatRole,
  type LostFoundChatMessage,
} from "./lostFound.api";
import { scheduleOwnerNotification } from "../../notifications";

type ChatRoute = RouteProp<LostFoundStackParamList, "Chat">;

export default function Chat() {
  const route = useRoute<ChatRoute>();
  const tabBarHeight = useBottomTabBarHeight();
  const viewerRole: ChatRole = route.params.viewerRole ?? "owner";
  const [messages, setMessages] = useState<LostFoundChatMessage[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const unreadRef = useRef(0);
  const [input, setInput] = useState("");

  const loadChat = useCallback(async () => {
    try {
      const data = await getPostChat(route.params.postId, viewerRole);
      setChatId(data.chatId);
      setMessages(data.messages);
      setErrorText(null);

      if (viewerRole === "owner" && data.unreadCount > unreadRef.current) {
        await scheduleOwnerNotification(route.params.postTitle ?? "your item");
      }
      unreadRef.current = data.unreadCount;

      await markChatNotificationsRead(data.chatId, viewerRole);
    } catch (e) {
      setErrorText((e as Error).message || "Could not load chat");
    } finally {
      setLoading(false);
    }
  }, [route.params.postId, route.params.postTitle, viewerRole]);

  useEffect(() => {
    loadChat();
  }, [loadChat]);

  useEffect(() => {
    const id = setInterval(() => {
      loadChat();
    }, 4000);
    return () => clearInterval(id);
  }, [loadChat]);

  const sendMessage = async () => {
    if (!input.trim() || !chatId) return;
    try {
      setSending(true);
      const sent = await sendPostChatMessage(chatId, viewerRole, input.trim());
      setMessages((prev) => [...prev, sent]);
      setInput("");
    } catch (e) {
      setErrorText((e as Error).message || "Could not send message");
    } finally {
      setSending(false);
    }
  };

  const formatTime = useCallback((iso: string) => {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }, []);

  const chatSubtitle = useMemo(() => {
    const roleLabel = viewerRole === "finder" ? "Finder view" : "Owner view";
    return `Post #${route.params.postId} · ${roleLabel}`;
  }, [route.params.postId, viewerRole]);

  const extractImageUrls = useCallback((body: string) => {
    const matches = body.match(/(?:https?:\/\/|file:\/\/|content:\/\/)\S+/g) ?? [];
    return matches.filter((url) => /\.(png|jpe?g|gif|webp)$/i.test(url) || url.includes("/uploads/") || url.startsWith("file://") || url.startsWith("content://"));
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.chatHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>LF</Text>
        </View>
        <View style={styles.chatHeaderTextWrap}>
          <Text style={styles.chatHeaderTitle}>Secure Lost &amp; Found Chat</Text>
          <Text style={styles.chatHeaderSubtitle}>{chatSubtitle}</Text>
        </View>
      </View>
      {loading && <Text style={styles.loadingText}>Loading messages...</Text>}

      {errorText ? <Text style={styles.loadingText}>Chat offline mode: {errorText}</Text> : null}
      <FlatList
        style={styles.list}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ paddingBottom: 12 }}
        renderItem={({ item }) => (
          <View style={item.senderRole === viewerRole ? styles.rowSelf : styles.rowOther}>
            <View
              style={[
                styles.messageBubble,
                item.senderRole === viewerRole ? styles.messageSelf : styles.messageOther,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  item.senderRole === viewerRole && styles.messageTextSelf,
                ]}
              >
                {item.body}
              </Text>
              {extractImageUrls(item.body).length > 0 ? (
                <View style={styles.imagePreviewRow}>
                  {extractImageUrls(item.body).map((uri) => (
                    <Image key={uri} source={{ uri }} style={styles.imagePreview} />
                  ))}
                </View>
              ) : null}
              <Text
                style={[
                  styles.messageTime,
                  item.senderRole === viewerRole && styles.messageTimeSelf,
                ]}
              >
                {formatTime(item.createdAt)}
              </Text>
            </View>
          </View>
        )}
      />

      <View style={[styles.inputRow, { paddingBottom: tabBarHeight + 8 }]}>
        <TextInput
          style={styles.input}
          placeholder="Type a message…"
          value={input}
          onChangeText={setInput}
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage} disabled={sending}>
          <Text style={styles.sendButtonText}>{sending ? "Sending..." : "Send"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ECE5DD",
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#053668",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FF7100",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "white",
    fontWeight: "800",
    fontSize: 12,
  },
  chatHeaderTextWrap: {
    marginLeft: 10,
  },
  chatHeaderTitle: {
    color: "white",
    fontWeight: "700",
    fontSize: 14,
  },
  chatHeaderSubtitle: {
    marginTop: 2,
    color: "#D0D5DD",
    fontSize: 12,
  },
  loadingText: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    color: "#667085",
    fontSize: 12,
  },
  list: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  rowSelf: {
    alignItems: "flex-end",
  },
  rowOther: {
    alignItems: "flex-start",
  },
  messageBubble: {
    maxWidth: "80%",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginVertical: 4,
  },
  messageSelf: {
    backgroundColor: "#DCF8C6",
  },
  messageOther: {
    backgroundColor: "#FFFFFF",
  },
  messageText: {
    fontSize: 14,
    color: "#111827",
  },
  messageTextSelf: {
    color: "#0D1F1A",
  },
  messageTime: {
    alignSelf: "flex-end",
    marginTop: 3,
    color: "#667085",
    fontSize: 11,
  },
  messageTimeSelf: {
    color: "#475467",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 10,
    paddingHorizontal: 10,
    gap: 8,
    backgroundColor: "#F3F4F6",
  },
  input: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#D0D5DD",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "white",
    fontSize: 14,
  },
  sendButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: "#053668",
  },
  sendButtonText: {
    color: "white",
    fontWeight: "700",
  },
  imagePreviewRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  imagePreview: {
    width: 90,
    height: 90,
    borderRadius: 8,
    backgroundColor: "#e5e7eb",
  },
});

