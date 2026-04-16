/** @format */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { RouteProp, useRoute } from "@react-navigation/native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import type { LostFoundStackParamList } from "../../navigation/LostFoundStack";
import {
  getLostFoundChats,
  sendLostFoundChatMessage,
  getPostDetails,
} from "./lostFound.api";
import { getStoredChatMessages, saveStoredChatMessages } from "./chat.storage";
import { useUserProfileStore } from "../../store/useUserProfileStore";

type ChatRoute = RouteProp<LostFoundStackParamList, "Chat">;

type MessageType = "system" | "incoming" | "outgoing";

interface Message {
  id: string;
  type: MessageType;
  text: string;
  time: string;
}

function formatMessageTime(value: string) {
  const date = new Date(value);
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function makeSystemMessage(id: string, text: string): Message {
  return {
    id,
    type: "system",
    text,
    time: formatMessageTime(new Date().toISOString()),
  };
}

function makeIncomingMessage(
  id: string,
  text: string,
  createdAt?: string,
): Message {
  return {
    id,
    type: "incoming",
    text,
    time: formatMessageTime(createdAt ?? new Date().toISOString()),
  };
}

function makeOutgoingMessage(
  id: string,
  text: string,
  createdAt?: string,
): Message {
  return {
    id,
    type: "outgoing",
    text,
    time: formatMessageTime(createdAt ?? new Date().toISOString()),
  };
}

export default function Chat() {
  const route = useRoute<ChatRoute>();
  const tabBarHeight = useBottomTabBarHeight();
  const flatListRef = useRef<FlatList<Message>>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const username = useUserProfileStore((state) => state.username);
  const currentUserId = useUserProfileStore((state: any) => state.userId);

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [isCurrentUserOwner, setIsCurrentUserOwner] = useState(false);

  const postId = route.params.postId;
  const intro = route.params.initialMessage?.trim();

  const postLabel = useMemo(() => {
    return postId ? `Post #${postId}` : "Lost item";
  }, [postId]);

  useEffect(() => {
    const t = setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 80);

    return () => clearTimeout(t);
  }, [messages]);

  const loadChats = async (showLoader = false) => {
    try {
      if (showLoader) {
        setLoading(true);
      }

      const post = await getPostDetails(postId);
      const dbChats = await getLostFoundChats(postId);

      const isOwner =
        String(post.ownerUserId ?? "") === String(currentUserId ?? "") ||
        String(post.ownerUsername ?? "")
          .trim()
          .toLowerCase() ===
          String(username ?? "")
            .trim()
            .toLowerCase();

      setIsCurrentUserOwner(isOwner);

      let mapped: Message[] = [
        makeSystemMessage(
          "system-static",
          "Secure chat started. Please avoid sharing personal phone numbers or private contact details.",
        ),
      ];

      if (dbChats.length > 0) {
        mapped = [
          mapped[0],
          ...dbChats.map((chat) => {
            if (chat.senderType === "system") {
              return makeSystemMessage(chat.id, chat.message);
            }

            const isMine = isOwner
              ? chat.senderType === "owner"
              : chat.senderType === "finder";

            return isMine
              ? makeOutgoingMessage(chat.id, chat.message, chat.createdAt)
              : makeIncomingMessage(chat.id, chat.message, chat.createdAt);
          }),
        ];
      } else if (intro) {
        mapped = [
          makeSystemMessage(
            "system-intro",
            "A finder submitted details for this lost-item post.",
          ),
          makeIncomingMessage("intro-message-local", intro),
        ];
      }

      setMessages((prev) => {
        const prevSignature = JSON.stringify(prev);
        const nextSignature = JSON.stringify(mapped);
        return prevSignature === nextSignature ? prev : mapped;
      });

      await saveStoredChatMessages(
        postId,
        mapped
          .filter((m) => m.type !== "system")
          .map((m) => ({
            id: m.id,
            postId,
            senderType:
              m.type === "outgoing"
                ? isOwner
                  ? "owner"
                  : "finder"
                : isOwner
                  ? "finder"
                  : "owner",
            senderLabel:
              m.type === "outgoing"
                ? username || "You"
                : isOwner
                  ? "Finder"
                  : "Owner",
            message: m.text,
            createdAt: new Date().toISOString(),
          })),
      );
    } catch {
      const localChats = await getStoredChatMessages(postId);

      let fallback: Message[] = [
        makeSystemMessage(
          "system-static",
          "Secure chat started. Please avoid sharing personal phone numbers or private contact details.",
        ),
      ];

      if (localChats.length > 0) {
        fallback = [
          fallback[0],
          ...localChats.map((chat) => {
            const isMine = isCurrentUserOwner
              ? chat.senderType === "owner"
              : chat.senderType === "finder";

            return isMine
              ? makeOutgoingMessage(chat.id, chat.message, chat.createdAt)
              : makeIncomingMessage(chat.id, chat.message, chat.createdAt);
          }),
        ];
      } else if (intro) {
        fallback = [
          makeSystemMessage(
            "system-intro",
            "A finder submitted details for this lost-item post.",
          ),
          makeIncomingMessage("intro-message-local", intro),
        ];
      }

      setMessages(fallback);
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadChats(true);

    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    pollingRef.current = setInterval(() => {
      loadChats(false);
    }, 3000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [postId, intro, username, currentUserId]);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;

    const trimmed = input.trim();

    try {
      setSending(true);

      const created = await sendLostFoundChatMessage(postId, {
        senderType: isCurrentUserOwner ? "owner" : "finder",
        senderLabel: username?.trim() || "You",
        message: trimmed,
      });

      const newOutgoing = makeOutgoingMessage(
        created.id,
        created.message,
        created.createdAt,
      );

      const nextMessages = [...messages, newOutgoing];
      setMessages(nextMessages);
      setInput("");

      await loadChats(false);

      await saveStoredChatMessages(
        postId,
        nextMessages
          .filter((m) => m.type !== "system")
          .map((m) => ({
            id: m.id,
            postId,
            senderType:
              m.type === "outgoing"
                ? isCurrentUserOwner
                  ? "owner"
                  : "finder"
                : isCurrentUserOwner
                  ? "finder"
                  : "owner",
            senderLabel:
              m.type === "outgoing"
                ? username || "You"
                : isCurrentUserOwner
                  ? "Finder"
                  : "Owner",
            message: m.text,
            createdAt: new Date().toISOString(),
          })),
      );
    } catch (error: any) {
      Alert.alert("Send failed", error?.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    if (item.type === "system") {
      return (
        <View style={styles.systemWrap}>
          <View style={styles.systemBadge}>
            <Ionicons
              name="shield-checkmark-outline"
              size={14}
              color="#053668"
            />
            <Text style={styles.systemText}>{item.text}</Text>
          </View>
        </View>
      );
    }

    const isOutgoing = item.type === "outgoing";

    return (
      <View style={isOutgoing ? styles.rowSelf : styles.rowOther}>
        <View
          style={[
            styles.messageBubble,
            isOutgoing ? styles.messageSelf : styles.messageOther,
          ]}>
          <Text
            style={[
              styles.messageRole,
              isOutgoing ? styles.messageRoleSelf : styles.messageRoleOther,
            ]}>
            {isOutgoing ? "You" : isCurrentUserOwner ? "Finder" : "Owner"}
          </Text>

          <Text
            style={[styles.messageText, isOutgoing && styles.messageTextSelf]}>
            {item.text}
          </Text>

          <Text
            style={[styles.messageTime, isOutgoing && styles.messageTimeSelf]}>
            {item.time}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.topBrandWrap}>
          <Image
            source={require("../../assets/images/UniLocateLogo.png")}
            style={styles.topBrandLogo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.chatHero}>
          <View style={styles.chatHeroTop}>
            <View style={styles.heroAvatar}>
              <Ionicons name="chatbubble-ellipses" size={20} color="#FFFFFF" />
            </View>

            <View style={styles.chatHeroTextWrap}>
              <Text style={styles.chatHeroTitle}>Secure Lost & Found Chat</Text>
              <Text style={styles.chatHeroSubtitle}>
                Private owner-finder conversation
              </Text>
            </View>
          </View>

          <View style={styles.postCard}>
            <View style={styles.postCardLeft}>
              <Text style={styles.postCardLabel}>Related post</Text>
              <Text style={styles.postCardTitle}>{postLabel}</Text>
            </View>

            <View style={styles.secureChip}>
              <Ionicons name="lock-closed-outline" size={12} color="#053668" />
              <Text style={styles.secureChipText}>Secure</Text>
            </View>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color="#053668" />
            <Text style={styles.loadingText}>Loading chat...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            style={styles.list}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={renderMessage}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: true })
            }
          />
        )}

        <View
          style={[
            styles.inputAreaWrap,
            {
              paddingBottom: Math.max(tabBarHeight + 24, 34),
            },
          ]}>
          <View style={styles.inputShell}>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="Type your message..."
                placeholderTextColor="#98A2B3"
                value={input}
                onChangeText={setInput}
                multiline
                maxLength={500}
              />

              <TouchableOpacity
                style={[
                  styles.sendButton,
                  sending && styles.sendButtonDisabled,
                ]}
                onPress={sendMessage}
                disabled={sending}>
                {sending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="send" size={18} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.inputHint}>
              Keep the conversation inside the app for safety.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F3F6FA",
  },

  container: {
    flex: 1,
    backgroundColor: "#F3F6FA",
  },

  topBrandWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 4,
    paddingBottom: 6,
  },

  topBrandLogo: {
    width: 108,
    height: 42,
  },

  chatHero: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
  },

  chatHeroTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  heroAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#053668",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  chatHeroTextWrap: {
    flex: 1,
  },

  chatHeroTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#053668",
  },

  chatHeroSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#667085",
  },

  postCard: {
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E4E7EC",
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  postCardLeft: {
    flex: 1,
    paddingRight: 10,
  },

  postCardLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#98A2B3",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  postCardTitle: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },

  secureChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EDF3F8",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  secureChipText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#053668",
  },

  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  loadingText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#667085",
  },

  list: {
    flex: 1,
    paddingHorizontal: 12,
  },

  listContent: {
    paddingTop: 6,
    paddingBottom: 10,
  },

  systemWrap: {
    alignItems: "center",
    marginVertical: 8,
  },

  systemBadge: {
    maxWidth: "92%",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EAF4FF",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  systemText: {
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 17,
    color: "#053668",
    fontWeight: "600",
  },

  rowSelf: {
    alignItems: "flex-end",
    marginVertical: 4,
  },

  rowOther: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginVertical: 4,
  },

  avatarMini: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FF7100",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    marginBottom: 6,
  },

  avatarMiniText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },

  messageBubble: {
    maxWidth: "80%",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 9,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },

  messageSelf: {
    backgroundColor: "#053668",
    borderBottomRightRadius: 8,
  },

  messageOther: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderBottomLeftRadius: 8,
  },

  messageRole: {
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 5,
  },

  messageRoleSelf: {
    color: "#D6E6F6",
  },

  messageRoleOther: {
    color: "#FF7100",
  },

  messageText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#111827",
  },

  messageTextSelf: {
    color: "#FFFFFF",
  },

  messageTime: {
    alignSelf: "flex-end",
    marginTop: 6,
    fontSize: 11,
    color: "#667085",
  },

  messageTimeSelf: {
    color: "#D6E6F6",
  },

  inputAreaWrap: {
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: "#F3F6FA",
  },

  inputShell: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E4E7EC",
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },

  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    paddingTop: 11,
    paddingBottom: 11,
    fontSize: 14,
    color: "#111827",
  },

  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#053668",
    alignItems: "center",
    justifyContent: "center",
  },

  sendButtonDisabled: {
    opacity: 0.7,
  },

  inputHint: {
    marginTop: 8,
    fontSize: 11.5,
    color: "#98A2B3",
    textAlign: "center",
  },
});


// /** @format */

// import React, { useEffect, useMemo, useRef, useState } from "react";
// import {
//   View,
//   Text,
//   StyleSheet,
//   FlatList,
//   TextInput,
//   TouchableOpacity,
//   KeyboardAvoidingView,
//   Platform,
//   Image,
//   ActivityIndicator,
//   Alert,
// } from "react-native";
// import { RouteProp, useRoute } from "@react-navigation/native";
// import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
// import { SafeAreaView } from "react-native-safe-area-context";
// import { Ionicons } from "@expo/vector-icons";

// import type { LostFoundStackParamList } from "../../navigation/LostFoundStack";
// import {
//   getLostFoundChats,
//   sendLostFoundChatMessage,
//   getPostDetails,
// } from "./lostFound.api";
// import { getStoredChatMessages, saveStoredChatMessages } from "./chat.storage";
// import { useUserProfileStore } from "../../store/useUserProfileStore";

// type ChatRoute = RouteProp<LostFoundStackParamList, "Chat">;

// type MessageType = "system" | "incoming" | "outgoing";

// interface Message {
//   id: string;
//   type: MessageType;
//   text: string;
//   time: string;
// }

// function formatMessageTime(value: string) {
//   const date = new Date(value);
//   return date.toLocaleTimeString([], {
//     hour: "2-digit",
//     minute: "2-digit",
//   });
// }

// function makeSystemMessage(id: string, text: string): Message {
//   return {
//     id,
//     type: "system",
//     text,
//     time: formatMessageTime(new Date().toISOString()),
//   };
// }

// function makeIncomingMessage(
//   id: string,
//   text: string,
//   createdAt?: string,
// ): Message {
//   return {
//     id,
//     type: "incoming",
//     text,
//     time: formatMessageTime(createdAt ?? new Date().toISOString()),
//   };
// }

// function makeOutgoingMessage(
//   id: string,
//   text: string,
//   createdAt?: string,
// ): Message {
//   return {
//     id,
//     type: "outgoing",
//     text,
//     time: formatMessageTime(createdAt ?? new Date().toISOString()),
//   };
// }

// export default function Chat() {
//   const route = useRoute<ChatRoute>();
//   const tabBarHeight = useBottomTabBarHeight();
//   const flatListRef = useRef<FlatList<Message>>(null);
//   const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

//   const username = useUserProfileStore((state) => state.username);
//   const currentUserId = useUserProfileStore((state: any) => state.userId);

//   const [input, setInput] = useState("");
//   const [messages, setMessages] = useState<Message[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [sending, setSending] = useState(false);

//   const [isCurrentUserOwner, setIsCurrentUserOwner] = useState(false);

//   const postId = route.params.postId;
//   const intro = route.params.initialMessage?.trim();

//   const postLabel = useMemo(() => {
//     return postId ? `Post #${postId}` : "Lost item";
//   }, [postId]);

//   useEffect(() => {
//     const t = setTimeout(() => {
//       flatListRef.current?.scrollToEnd({ animated: true });
//     }, 80);

//     return () => clearTimeout(t);
//   }, [messages]);

//   useEffect(() => {
//     let mounted = true;

//     const loadChats = async () => {
//       try {
//         setLoading(true);

//         const post = await getPostDetails(postId);
//         const dbChats = await getLostFoundChats(postId);

//         const isOwner =
//           String(post.ownerUserId ?? "") === String(currentUserId ?? "") ||
//           String(post.ownerUsername ?? "")
//             .trim()
//             .toLowerCase() ===
//             String(username ?? "")
//               .trim()
//               .toLowerCase();

//         if (mounted) {
//           setIsCurrentUserOwner(isOwner);
//         }

//         let mapped: Message[] = [
//           makeSystemMessage(
//             "system-static",
//             "Secure chat started. Please avoid sharing personal phone numbers or private contact details.",
//           ),
//         ];
//         if (dbChats.length > 0) {
//           mapped = [
//             mapped[0],
//             ...dbChats.map((chat) => {
//               if (chat.senderType === "system") {
//                 return makeSystemMessage(chat.id, chat.message);
//               }

//               const isMine = isOwner
//                 ? chat.senderType === "owner"
//                 : chat.senderType === "finder";

//               return isMine
//                 ? makeOutgoingMessage(chat.id, chat.message, chat.createdAt)
//                 : makeIncomingMessage(chat.id, chat.message, chat.createdAt);
//             }),
//           ];
//         } else if (intro) {
//           mapped = [
//             makeSystemMessage(
//               "system-intro",
//               "A finder submitted details for this lost-item post.",
//             ),
//             makeIncomingMessage("intro-message", intro),
//           ];
//           try {
//             const created = await sendLostFoundChatMessage(postId, {
//               senderType: "finder",
//               senderLabel: "Finder",
//               message: intro,
//             });

//             mapped = [
//               makeSystemMessage(
//                 "system-intro",
//                 "A finder submitted details for this lost-item post.",
//               ),
//               makeIncomingMessage(
//                 created.id,
//                 created.message,
//                 created.createdAt,
//               ),
//             ];
//           } catch {
//             // keep intro locally if first sync fails
//           }
//         }

//         if (!mounted) return;
//         setMessages(mapped);

//         await saveStoredChatMessages(
//           postId,
//           mapped
//             .filter((m) => m.type !== "system")
//             .map((m) => ({
//               id: m.id,
//               postId,
//               senderType:
//                 m.type === "outgoing"
//                   ? isOwner
//                     ? "owner"
//                     : "finder"
//                   : isOwner
//                     ? "finder"
//                     : "owner",
//               senderLabel:
//                 m.type === "outgoing"
//                   ? username || "You"
//                   : isOwner
//                     ? "Finder"
//                     : "Owner",
//               message: m.text,
//               createdAt: new Date().toISOString(),
//             })),
//         );
//       } catch {
//         const localChats = await getStoredChatMessages(postId);

//         let fallback: Message[] = [
//           makeSystemMessage(
//             "system-static",
//             "Secure chat started. Please avoid sharing personal phone numbers or private contact details.",
//           ),
//         ];

//         if (localChats.length > 0) {
//           fallback = [
//             fallback[0],
//             ...localChats.map((chat) => {
//               const isMine = isCurrentUserOwner
//                 ? chat.senderType === "owner"
//                 : chat.senderType === "finder";

//               return isMine
//                 ? makeOutgoingMessage(chat.id, chat.message, chat.createdAt)
//                 : makeIncomingMessage(chat.id, chat.message, chat.createdAt);
//             }),
//           ];
//         } else if (intro) {
//           fallback = [
//             makeSystemMessage(
//               "system-intro",
//               "A finder submitted details for this lost-item post.",
//             ),
//             makeIncomingMessage("intro-message-local", intro),
//           ];
//         }

//         if (mounted) {
//           setMessages(fallback);
//         }
//       } finally {
//         if (mounted) {
//           setLoading(false);
//         }
//       }
//     };

//     loadChats();

//     return () => {
//       mounted = false;
//     };
//   }, [intro, postId, username]);

//   const sendMessage = async () => {
//     if (!input.trim() || sending) return;

//     const trimmed = input.trim();

//     try {
//       setSending(true);

//       const senderType = isCurrentUserOwner ? "owner" : "finder";

//       const created = await sendLostFoundChatMessage(postId, {
//         senderType: isCurrentUserOwner ? "owner" : "finder",
//         senderLabel: username?.trim() || "You",
//         message: trimmed,
//       });

//       const newOutgoing = makeOutgoingMessage(
//         created.id,
//         created.message,
//         created.createdAt,
//       );

//       const nextMessages = [...messages, newOutgoing];
//       setMessages(nextMessages);
//       setInput("");

//       await saveStoredChatMessages(
//         postId,
//         nextMessages
//           .filter((m) => m.type !== "system")
//           .map((m) => ({
//             id: m.id,
//             postId,
//             senderType:
//               m.type === "outgoing"
//                 ? isCurrentUserOwner
//                   ? "owner"
//                   : "finder"
//                 : isCurrentUserOwner
//                   ? "finder"
//                   : "owner",
//             senderLabel:
//               m.type === "outgoing"
//                 ? username || "You"
//                 : isCurrentUserOwner
//                   ? "Finder"
//                   : "Owner",
//             message: m.text,
//             createdAt: new Date().toISOString(),
//           })),
//       );
//     } catch (error: any) {
//       Alert.alert("Send failed", error?.message || "Failed to send message");
//     } finally {
//       setSending(false);
//     }
//   };

//   const renderMessage = ({ item }: { item: Message }) => {
//     if (item.type === "system") {
//       return (
//         <View style={styles.systemWrap}>
//           <View style={styles.systemBadge}>
//             <Ionicons
//               name="shield-checkmark-outline"
//               size={14}
//               color="#053668"
//             />
//             <Text style={styles.systemText}>{item.text}</Text>
//           </View>
//         </View>
//       );
//     }

//     const isOutgoing = item.type === "outgoing";

//     return (
//       <View style={isOutgoing ? styles.rowSelf : styles.rowOther}>
//         <View
//           style={[
//             styles.messageBubble,
//             isOutgoing ? styles.messageSelf : styles.messageOther,
//           ]}>
//           <Text
//             style={[
//               styles.messageRole,
//               isOutgoing ? styles.messageRoleSelf : styles.messageRoleOther,
//             ]}>
//             {isOutgoing ? "You" : isCurrentUserOwner ? "Finder" : "Owner"}
//           </Text>

//           <Text
//             style={[styles.messageText, isOutgoing && styles.messageTextSelf]}>
//             {item.text}
//           </Text>

//           <Text
//             style={[styles.messageTime, isOutgoing && styles.messageTimeSelf]}>
//             {item.time}
//           </Text>
//         </View>
//       </View>
//     );
//   };

//   return (
//     <SafeAreaView style={styles.safeArea} edges={["top"]}>
//       <KeyboardAvoidingView
//         style={styles.container}
//         behavior={Platform.OS === "ios" ? "padding" : undefined}>
//         <View style={styles.topBrandWrap}>
//           <Image
//             source={require("../../assets/images/UniLocateLogo.png")}
//             style={styles.topBrandLogo}
//             resizeMode="contain"
//           />
//         </View>

//         <View style={styles.chatHero}>
//           <View style={styles.chatHeroTop}>
//             <View style={styles.heroAvatar}>
//               <Ionicons name="chatbubble-ellipses" size={20} color="#FFFFFF" />
//             </View>

//             <View style={styles.chatHeroTextWrap}>
//               <Text style={styles.chatHeroTitle}>Secure Lost & Found Chat</Text>
//               <Text style={styles.chatHeroSubtitle}>
//                 Private owner-finder conversation
//               </Text>
//             </View>
//           </View>

//           <View style={styles.postCard}>
//             <View style={styles.postCardLeft}>
//               <Text style={styles.postCardLabel}>Related post</Text>
//               <Text style={styles.postCardTitle}>{postLabel}</Text>
//             </View>

//             <View style={styles.secureChip}>
//               <Ionicons name="lock-closed-outline" size={12} color="#053668" />
//               <Text style={styles.secureChipText}>Secure</Text>
//             </View>
//           </View>
//         </View>

//         {loading ? (
//           <View style={styles.loadingWrap}>
//             <ActivityIndicator size="small" color="#053668" />
//             <Text style={styles.loadingText}>Loading chat...</Text>
//           </View>
//         ) : (
//           <FlatList
//             ref={flatListRef}
//             style={styles.list}
//             data={messages}
//             keyExtractor={(m) => m.id}
//             renderItem={renderMessage}
//             showsVerticalScrollIndicator={false}
//             contentContainerStyle={styles.listContent}
//             onContentSizeChange={() =>
//               flatListRef.current?.scrollToEnd({ animated: true })
//             }
//           />
//         )}

//         <View
//           style={[
//             styles.inputAreaWrap,
//             {
//               paddingBottom: Math.max(tabBarHeight + 8, 18),
//             },
//           ]}>
//           <View style={styles.inputShell}>
//             <View style={styles.inputRow}>
//               <TextInput
//                 style={styles.input}
//                 placeholder="Type your message..."
//                 placeholderTextColor="#98A2B3"
//                 value={input}
//                 onChangeText={setInput}
//                 multiline
//                 maxLength={500}
//               />

//               <TouchableOpacity
//                 style={[
//                   styles.sendButton,
//                   sending && styles.sendButtonDisabled,
//                 ]}
//                 onPress={sendMessage}
//                 disabled={sending}>
//                 {sending ? (
//                   <ActivityIndicator size="small" color="#FFFFFF" />
//                 ) : (
//                   <Ionicons name="send" size={18} color="#FFFFFF" />
//                 )}
//               </TouchableOpacity>
//             </View>

//             <Text style={styles.inputHint}>
//               Keep the conversation inside the app for safety.
//             </Text>
//           </View>
//         </View>
//       </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   safeArea: {
//     flex: 1,
//     backgroundColor: "#F3F6FA",
//   },

//   container: {
//     flex: 1,
//     backgroundColor: "#F3F6FA",
//   },

//   topBrandWrap: {
//     alignItems: "center",
//     justifyContent: "center",
//     paddingTop: 4,
//     paddingBottom: 6,
//   },

//   topBrandLogo: {
//     width: 108,
//     height: 42,
//   },

//   chatHero: {
//     paddingHorizontal: 16,
//     paddingTop: 4,
//     paddingBottom: 10,
//   },

//   chatHeroTop: {
//     flexDirection: "row",
//     alignItems: "center",
//   },

//   heroAvatar: {
//     width: 46,
//     height: 46,
//     borderRadius: 23,
//     backgroundColor: "#053668",
//     alignItems: "center",
//     justifyContent: "center",
//     marginRight: 12,
//   },

//   chatHeroTextWrap: {
//     flex: 1,
//   },

//   chatHeroTitle: {
//     fontSize: 20,
//     fontWeight: "800",
//     color: "#053668",
//   },

//   chatHeroSubtitle: {
//     marginTop: 4,
//     fontSize: 13,
//     color: "#667085",
//   },

//   postCard: {
//     marginTop: 12,
//     backgroundColor: "#FFFFFF",
//     borderRadius: 18,
//     borderWidth: 1,
//     borderColor: "#E4E7EC",
//     paddingHorizontal: 14,
//     paddingVertical: 12,
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//   },

//   postCardLeft: {
//     flex: 1,
//     paddingRight: 10,
//   },

//   postCardLabel: {
//     fontSize: 11,
//     fontWeight: "800",
//     color: "#98A2B3",
//     textTransform: "uppercase",
//     letterSpacing: 0.6,
//   },

//   postCardTitle: {
//     marginTop: 4,
//     fontSize: 14,
//     fontWeight: "700",
//     color: "#111827",
//   },

//   secureChip: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 4,
//     backgroundColor: "#EDF3F8",
//     borderRadius: 999,
//     paddingHorizontal: 10,
//     paddingVertical: 6,
//   },

//   secureChipText: {
//     fontSize: 11,
//     fontWeight: "800",
//     color: "#053668",
//   },

//   loadingWrap: {
//     flex: 1,
//     alignItems: "center",
//     justifyContent: "center",
//     gap: 10,
//   },

//   loadingText: {
//     fontSize: 13,
//     fontWeight: "600",
//     color: "#667085",
//   },

//   list: {
//     flex: 1,
//     paddingHorizontal: 12,
//   },

//   listContent: {
//     paddingTop: 6,
//     paddingBottom: 10,
//   },

//   systemWrap: {
//     alignItems: "center",
//     marginVertical: 8,
//   },

//   systemBadge: {
//     maxWidth: "92%",
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 6,
//     backgroundColor: "#EAF4FF",
//     borderRadius: 999,
//     paddingHorizontal: 12,
//     paddingVertical: 8,
//   },

//   systemText: {
//     flexShrink: 1,
//     fontSize: 12,
//     lineHeight: 17,
//     color: "#053668",
//     fontWeight: "600",
//   },

//   rowSelf: {
//     alignItems: "flex-end",
//     marginVertical: 4,
//   },

//   rowOther: {
//     flexDirection: "row",
//     alignItems: "flex-end",
//     marginVertical: 4,
//   },

//   avatarMini: {
//     width: 28,
//     height: 28,
//     borderRadius: 14,
//     backgroundColor: "#FF7100",
//     alignItems: "center",
//     justifyContent: "center",
//     marginRight: 8,
//     marginBottom: 6,
//   },

//   avatarMiniText: {
//     color: "#FFFFFF",
//     fontSize: 11,
//     fontWeight: "800",
//   },

//   messageBubble: {
//     maxWidth: "80%",
//     borderRadius: 20,
//     paddingHorizontal: 14,
//     paddingTop: 10,
//     paddingBottom: 9,
//     shadowColor: "#000",
//     shadowOpacity: 0.05,
//     shadowRadius: 6,
//     shadowOffset: { width: 0, height: 2 },
//     elevation: 1,
//   },

//   messageSelf: {
//     backgroundColor: "#053668",
//     borderBottomRightRadius: 8,
//   },

//   messageOther: {
//     backgroundColor: "#FFFFFF",
//     borderWidth: 1,
//     borderColor: "#E5E7EB",
//     borderBottomLeftRadius: 8,
//   },

//   messageRole: {
//     fontSize: 11,
//     fontWeight: "800",
//     marginBottom: 5,
//   },

//   messageRoleSelf: {
//     color: "#D6E6F6",
//   },

//   messageRoleOther: {
//     color: "#FF7100",
//   },

//   messageText: {
//     fontSize: 14,
//     lineHeight: 20,
//     color: "#111827",
//   },

//   messageTextSelf: {
//     color: "#FFFFFF",
//   },

//   messageTime: {
//     alignSelf: "flex-end",
//     marginTop: 6,
//     fontSize: 11,
//     color: "#667085",
//   },

//   messageTimeSelf: {
//     color: "#D6E6F6",
//   },

//   inputAreaWrap: {
//     paddingHorizontal: 12,
//     paddingTop: 8,
//     backgroundColor: "#F3F6FA",
//   },

//   inputShell: {
//     backgroundColor: "#FFFFFF",
//     borderRadius: 22,
//     borderWidth: 1,
//     borderColor: "#E4E7EC",
//     paddingHorizontal: 10,
//     paddingTop: 10,
//     paddingBottom: 8,
//     shadowColor: "#000",
//     shadowOpacity: 0.05,
//     shadowRadius: 8,
//     shadowOffset: { width: 0, height: 2 },
//     elevation: 3,
//   },

//   inputRow: {
//     flexDirection: "row",
//     alignItems: "flex-end",
//     gap: 8,
//   },

//   input: {
//     flex: 1,
//     minHeight: 44,
//     maxHeight: 100,
//     borderRadius: 18,
//     backgroundColor: "#F8FAFC",
//     borderWidth: 1,
//     borderColor: "#E5E7EB",
//     paddingHorizontal: 14,
//     paddingTop: 11,
//     paddingBottom: 11,
//     fontSize: 14,
//     color: "#111827",
//   },

//   sendButton: {
//     width: 46,
//     height: 46,
//     borderRadius: 23,
//     backgroundColor: "#053668",
//     alignItems: "center",
//     justifyContent: "center",
//   },

//   sendButtonDisabled: {
//     opacity: 0.7,
//   },

//   inputHint: {
//     marginTop: 8,
//     fontSize: 11.5,
//     color: "#98A2B3",
//     textAlign: "center",
//   },
// });
