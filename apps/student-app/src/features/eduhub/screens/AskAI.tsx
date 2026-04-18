/** @format */

import React, { useMemo, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { EduHubStackParamList } from "../../../navigation/EduHubNavigator";

type Props = NativeStackScreenProps<EduHubStackParamList, "AskAI">;

type Message = {
  id: string;
  role: "assistant" | "user";
  text: string;
};

const starterPrompts = [
  "Explain simply",
  "Summarize topic",
  "Generate MCQs",
  "Give 5-mark questions",
];

export default function AskAI({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const listRef = useRef<FlatList<Message>>(null);

  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Hi, I’m your EduHub study assistant. Ask me to explain a concept, summarize a topic, or generate exam questions.",
    },
  ]);

  const canSend = useMemo(() => draft.trim().length > 0, [draft]);

  const addAssistantReply = (userText: string) => {
    const lower = userText.toLowerCase();

    let reply =
      "I can help explain this topic, summarize it, or turn it into revision questions.";

    if (lower.includes("explain")) {
      reply =
        "Here is a simpler explanation: break the topic into definition, purpose, process, and example. This makes revision much easier.";
    } else if (lower.includes("summary") || lower.includes("summarize")) {
      reply =
        "Summary: identify the main concept, list the key points, and note one practical example for each point.";
    } else if (lower.includes("mcq")) {
      reply =
        "I can generate MCQs from your notes. For now, think in terms of definitions, differences, and application-based questions.";
    } else if (lower.includes("5-mark") || lower.includes("question")) {
      reply =
        "Possible 5-mark approach: define the concept, explain 3 core points, then finish with a short example or advantage.";
    }

    const assistantMessage: Message = {
      id: `${Date.now()}-assistant`,
      role: "assistant",
      text: reply,
    };

    setMessages((prev) => [...prev, assistantMessage]);

    setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 80);
  };

  const handleSend = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;

    const userMessage: Message = {
      id: `${Date.now()}-user`,
      role: "user",
      text: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setDraft("");

    setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 80);

    setTimeout(() => {
      addAssistantReply(trimmed);
    }, 350);
  };

  const handlePromptPress = (prompt: string) => {
    const seeded =
      prompt === "Explain simply"
        ? "Explain database normalization simply."
        : prompt === "Summarize topic"
          ? "Summarize software design patterns."
          : prompt === "Generate MCQs"
            ? "Generate MCQs from data structures."
            : "Give me 5-mark questions from operating systems.";

    setDraft(seeded);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <LinearGradient
        colors={["#F7FBFF", "#EEF5FC", "#F7FBFF"]}
        style={styles.background}
      />

      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          style={[
            styles.contentWrap,
            { paddingHorizontal: isTablet ? 28 : 16 },
          ]}
        >
          <View style={styles.headerRow}>
            <Pressable
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={20} color="#053668" />
            </Pressable>

            <Text style={styles.headerTitle}>Ask AI</Text>

            <View style={styles.headerSpacer} />
          </View>

          <LinearGradient
            colors={["#053668", "#07427F"]}
            style={styles.heroCard}
          >
            <View style={styles.heroTopRow}>
              <View style={styles.heroIconWrap}>
                <Ionicons name="sparkles-outline" size={24} color="#053668" />
              </View>

              <View style={styles.heroTextWrap}>
                <Text style={styles.heroEyebrow}>EduHub Assistant</Text>
                <Text style={styles.heroTitle}>Ask anything from your notes</Text>
                <Text style={styles.heroSubtitle}>
                  Get explanations, summaries, revision help, and question ideas
                  in a student-friendly way.
                </Text>
              </View>
            </View>
          </LinearGradient>

          <View style={styles.promptsWrap}>
            {starterPrompts.map((prompt) => (
              <Pressable
                key={prompt}
                style={styles.promptChip}
                onPress={() => handlePromptPress(prompt)}
              >
                <Text style={styles.promptChipText}>{prompt}</Text>
              </Pressable>
            ))}
          </View>

          <FlatList
            ref={listRef}
            style={styles.list}
            data={messages}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const isUser = item.role === "user";

              return (
                <View
                  style={[
                    styles.messageRow,
                    isUser ? styles.messageRowUser : styles.messageRowAssistant,
                  ]}
                >
                  <View
                    style={[
                      styles.messageBubble,
                      isUser
                        ? styles.messageBubbleUser
                        : styles.messageBubbleAssistant,
                    ]}
                  >
                    <Text
                      style={[
                        styles.messageRole,
                        isUser
                          ? styles.messageRoleUser
                          : styles.messageRoleAssistant,
                      ]}
                    >
                      {isUser ? "You" : "EduHub AI"}
                    </Text>

                    <Text
                      style={[
                        styles.messageText,
                        isUser && styles.messageTextUser,
                      ]}
                    >
                      {item.text}
                    </Text>
                  </View>
                </View>
              );
            }}
            onContentSizeChange={() =>
              listRef.current?.scrollToEnd({ animated: true })
            }
          />

          <View style={styles.composerWrap}>
            <View style={styles.inputRow}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Ask your study question..."
                placeholderTextColor="#98A2B3"
                style={styles.input}
                multiline
                textAlignVertical="center"
              />

              <Pressable
                style={[
                  styles.sendBtn,
                  !canSend && styles.sendBtnDisabled,
                ]}
                onPress={handleSend}
                disabled={!canSend}
              >
                <Ionicons name="send" size={18} color="#FFFFFF" />
              </Pressable>
            </View>

            <Text style={styles.footerHint}>
              *Ai can make mistakes. Always double-check with your class materials and textbooks.
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
    backgroundColor: "#F7FBFF",
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  screen: {
    flex: 1,
  },
  contentWrap: {
    flex: 1,
    paddingTop: 8,
    paddingBottom: 16,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  headerSpacer: {
    width: 42,
  },

  heroCard: {
    borderRadius: 24,
    padding: 18,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  heroIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  heroTextWrap: {
    flex: 1,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    color: "#CCE2E8",
    letterSpacing: 0.8,
  },
  heroTitle: {
    marginTop: 6,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  heroSubtitle: {
    marginTop: 6,
    fontSize: 13.5,
    lineHeight: 20,
    color: "#DCEEF2",
  },

  promptsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 16,
    marginBottom: 14,
  },
  promptChip: {
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  promptChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#053668",
  },

  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 12,
  },

  messageRow: {
    marginBottom: 10,
  },
  messageRowUser: {
    alignItems: "flex-end",
  },
  messageRowAssistant: {
    alignItems: "flex-start",
  },

  messageBubble: {
    maxWidth: "82%",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
  },
  messageBubbleUser: {
    backgroundColor: "#053668",
    borderBottomRightRadius: 8,
  },
  messageBubbleAssistant: {
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
  messageRoleUser: {
    color: "#DCEEF2",
  },
  messageRoleAssistant: {
    color: "#FF7100",
  },

  messageText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#111827",
  },
  messageTextUser: {
    color: "#FFFFFF",
  },

  composerWrap: {
    marginTop: 10,
    marginBottom: 60,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 10,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 110,
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
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#053668",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    opacity: 0.45,
  },
  footerHint: {
    marginTop: 8,
    fontSize: 11.5,
    color: "#98A2B3",
    textAlign: "center",
  },
});