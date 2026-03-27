import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { RouteProp, useRoute } from "@react-navigation/native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import type { LostFoundStackParamList } from "../../navigation/LostFoundStack";

type ChatRoute = RouteProp<LostFoundStackParamList, "Chat">;

interface Message {
  id: string;
  fromSelf: boolean;
  text: string;
  time: string;
}

export default function Chat() {
  const route = useRoute<ChatRoute>();
  const tabBarHeight = useBottomTabBarHeight();
  const formatNow = () =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const [messages, setMessages] = useState<Message[]>(() => {
    const first: Message | null = route.params.initialMessage
      ? {
          id: "1",
          fromSelf: false,
          text: route.params.initialMessage,
          time: formatNow(),
        }
      : {
          id: "1",
          fromSelf: false,
          text: "Hi! I might have found something similar. Can you describe any unique marks?",
          time: formatNow(),
        };
    return [first];
  });
  const [input, setInput] = useState("");

  const sendMessage = () => {
    if (!input.trim()) return;
    const trimmed = input.trim();
    const msg: Message = {
      id: String(messages.length + 1),
      fromSelf: true,
      text: trimmed,
      time: formatNow(),
    };
    setMessages((prev) => [...prev, msg]);
    setInput("");

    // Basic conversational feedback until real-time backend chat is connected.
    if (trimmed.toLowerCase().includes("thank")) return;
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: String(prev.length + 1),
          fromSelf: false,
          text: "Thanks. I will verify and reply here. Please do not share personal phone numbers.",
          time: formatNow(),
        },
      ]);
    }, 900);
  };

  return (
    <View style={styles.container}>
      <View style={styles.chatHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>LF</Text>
        </View>
        <View style={styles.chatHeaderTextWrap}>
          <Text style={styles.chatHeaderTitle}>Secure Lost &amp; Found Chat</Text>
          <Text style={styles.chatHeaderSubtitle}>Post #{route.params.postId}</Text>
        </View>
      </View>

      <FlatList
        style={styles.list}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ paddingBottom: 12 }}
        renderItem={({ item }) => (
          <View style={item.fromSelf ? styles.rowSelf : styles.rowOther}>
            <View
              style={[
                styles.messageBubble,
                item.fromSelf ? styles.messageSelf : styles.messageOther,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  item.fromSelf && styles.messageTextSelf,
                ]}
              >
                {item.text}
              </Text>
              <Text
                style={[
                  styles.messageTime,
                  item.fromSelf && styles.messageTimeSelf,
                ]}
              >
                {item.time}
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
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendButtonText}>Send</Text>
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
});

