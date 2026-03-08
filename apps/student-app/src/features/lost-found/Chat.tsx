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

import type { LostFoundStackParamList } from "../../navigation/LostFoundStack";

type ChatRoute = RouteProp<LostFoundStackParamList, "Chat">;

interface Message {
  id: string;
  fromSelf: boolean;
  text: string;
}

export default function Chat() {
  const route = useRoute<ChatRoute>();
  const [messages, setMessages] = useState<Message[]>(() => {
    const first: Message | null = route.params.initialMessage
      ? {
          id: "1",
          fromSelf: false,
          text: route.params.initialMessage,
        }
      : {
          id: "1",
          fromSelf: false,
          text: "Hi! I might have found something similar. Can you describe any unique marks?",
        };
    return [first];
  });
  const [input, setInput] = useState("");

  const sendMessage = () => {
    if (!input.trim()) return;
    const msg: Message = {
      id: String(messages.length + 1),
      fromSelf: true,
      text: input.trim(),
    };
    setMessages((prev) => [...prev, msg]);
    setInput("");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.helperText}>
        Secure chat for post #{route.params.postId}. Real names and contact
        details are hidden. Use description-based questions to verify ownership.
      </Text>

      <FlatList
        style={styles.list}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => (
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
          </View>
        )}
      />

      <View style={styles.inputRow}>
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
    padding: 12,
    backgroundColor: "#f5f5f9",
  },
  helperText: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 8,
  },
  list: {
    flex: 1,
  },
  messageBubble: {
    maxWidth: "80%",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 4,
  },
  messageSelf: {
    alignSelf: "flex-end",
    backgroundColor: "#2563eb",
  },
  messageOther: {
    alignSelf: "flex-start",
    backgroundColor: "#e5e7eb",
  },
  messageText: {
    fontSize: 14,
    color: "#111827",
  },
  messageTextSelf: {
    color: "white",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 8,
    gap: 8,
  },
  input: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#d1d5db",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "white",
    fontSize: 14,
  },
  sendButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#2563eb",
  },
  sendButtonText: {
    color: "white",
    fontWeight: "600",
  },
});

