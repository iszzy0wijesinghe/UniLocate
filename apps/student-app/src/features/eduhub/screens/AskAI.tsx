/** @format */

import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Keyboard,
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
import { askEduHubAI } from "../services/eduhub.api";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

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
  const tabBarHeight = useBottomTabBarHeight();
  const listRef = useRef<FlatList<Message>>(null);

  const composerTranslateY = useRef(new Animated.Value(0)).current;
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Hi, I’m your EduHub study assistant. Ask me to explain a concept, summarize a topic, create MCQs, or prepare 5-mark answers.",
    },
  ]);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (event) => {
      const height = event.endCoordinates?.height ?? 0;

      setKeyboardVisible(true);
      setKeyboardHeight(height);

      Animated.timing(composerTranslateY, {
        toValue: -(height - 12),
        duration: 220,
        useNativeDriver: true,
      }).start();

      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 120);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
      setKeyboardHeight(0);

      Animated.timing(composerTranslateY, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [composerTranslateY]);

  const canSend = useMemo(
    () => draft.trim().length > 0 && !loading,
    [draft, loading],
  );

  const scrollToBottom = () => {
    setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 80);
  };

  const handleSend = async () => {
    const trimmed = draft.trim();
    if (!trimmed || loading) return;

    const userMessage: Message = {
      id: `${Date.now()}-user`,
      role: "user",
      text: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setDraft("");
    setLoading(true);
    scrollToBottom();

    try {
      const result = await askEduHubAI({
        message: trimmed,
        messages: [...messages, userMessage].map((item) => ({
          role: item.role,
          text: item.text,
        })),
      });

      const assistantMessage: Message = {
        id: `${Date.now()}-assistant`,
        role: "assistant",
        text:
          result.answer?.trim() ||
          "I could not generate a response right now. Please try again.",
      };

      setMessages((prev) => [...prev, assistantMessage]);
      scrollToBottom();
    } catch (error: any) {
      console.error("[eduhub] ai request failed:", error);

      const assistantMessage: Message = {
        id: `${Date.now()}-assistant-error`,
        role: "assistant",
        text:
          error?.message ||
          "AI is not available right now. Please check your backend and try again.",
      };

      setMessages((prev) => [...prev, assistantMessage]);
      scrollToBottom();
    } finally {
      setLoading(false);
    }
  };

  const handlePromptPress = (prompt: string) => {
    const seeded =
      prompt === "Explain simply"
        ? "Explain database normalization simply with an example."
        : prompt === "Summarize topic"
          ? "Summarize software design patterns in a student-friendly way."
          : prompt === "Generate MCQs"
            ? "Generate 5 MCQs about data structures with answers."
            : "Give me 5-mark questions and answers from operating systems.";

    setDraft(seeded);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <LinearGradient
        colors={["#F7FBFF", "#EEF5FC", "#F7FBFF"]}
        style={styles.background}
      />

      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}>
        <View
          style={[
            styles.contentWrap,
            {
              paddingHorizontal: isTablet ? 28 : 16,
            },
          ]}>
          <View style={styles.headerRow}>
            <Pressable
              style={styles.backBtn}
              onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={20} color="#053668" />
            </Pressable>

            <Text style={styles.headerTitle}>Ask AI</Text>

            <View style={styles.headerSpacer} />
          </View>

          <LinearGradient
            colors={["#053668", "#07427F"]}
            style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroIconWrap}>
                <Ionicons name="sparkles-outline" size={24} color="#053668" />
              </View>

              <View style={styles.heroTextWrap}>
                <Text style={styles.heroEyebrow}>EduHub Assistant</Text>
                <Text style={styles.heroTitle}>
                  Ask anything from your notes
                </Text>
                <Text style={styles.heroSubtitle}>
                  Get explanations, summaries, revision help, and question ideas
                  in a student-friendly way.
                </Text>
              </View>
            </View>
          </LinearGradient>

          {/* <View style={styles.promptsWrap}>
            {starterPrompts.map((prompt) => (
              <Pressable
                key={prompt}
                style={styles.promptChip}
                onPress={() => handlePromptPress(prompt)}
                disabled={loading}>
                <Text style={styles.promptChipText}>{prompt}</Text>
              </Pressable>
            ))}
          </View> */}

          <FlatList
            ref={listRef}
            style={[
              styles.list,
              {
                marginBottom: keyboardVisible
                  ? 0
                  : Math.max(tabBarHeight + 100, 140),
              },
            ]}
            data={messages}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.listContent,
              {
                paddingBottom: keyboardVisible
                  ? keyboardHeight + 120
                  : Math.max(tabBarHeight + 110, 130),
              },
            ]}
            renderItem={({ item }) => {
              const isUser = item.role === "user";

              return (
                <View
                  style={[
                    styles.messageRow,
                    isUser ? styles.messageRowUser : styles.messageRowAssistant,
                  ]}>
                  <View
                    style={[
                      styles.messageBubble,
                      isUser
                        ? styles.messageBubbleUser
                        : styles.messageBubbleAssistant,
                    ]}>
                    <Text
                      style={[
                        styles.messageRole,
                        isUser
                          ? styles.messageRoleUser
                          : styles.messageRoleAssistant,
                      ]}>
                      {isUser ? "You" : "EduHub AI"}
                    </Text>

                    <Text
                      style={[
                        styles.messageText,
                        isUser && styles.messageTextUser,
                      ]}>
                      {item.text}
                    </Text>
                  </View>
                </View>
              );
            }}
            onContentSizeChange={scrollToBottom}
            ListFooterComponent={
              loading ? (
                <View style={styles.typingWrap}>
                  <View style={styles.typingBubble}>
                    <ActivityIndicator size="small" color="#053668" />
                    <Text style={styles.typingText}>
                      EduHub AI is thinking...
                    </Text>
                  </View>
                </View>
              ) : null
            }
          />

          <Animated.View
            style={[
              styles.composerWrap,
              keyboardVisible && styles.composerWrapKeyboardOpen,
              {
                left: isTablet ? 28 : 16,
                right: isTablet ? 28 : 16,
                bottom: keyboardVisible ? 45 : Math.max(tabBarHeight + 25, 16),
                transform: [{ translateY: composerTranslateY }],
              },
            ]}>
            <View style={styles.inputRow}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Ask your study question..."
                placeholderTextColor="#98A2B3"
                style={styles.input}
                multiline
                textAlignVertical="top"
                editable={!loading}
                onFocus={scrollToBottom}
              />

              <Pressable
                style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
                onPress={handleSend}
                disabled={!canSend}>
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="send" size={18} color="#FFFFFF" />
                )}
              </Pressable>
            </View>

            <Text style={styles.footerHint}>
              *AI can make mistakes. Always double-check with your class
              materials and textbooks.
            </Text>
          </Animated.View>
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
    paddingBottom: 16,
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
    position: "absolute",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 14,
    lineHeight: 20,
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
  typingWrap: {
    alignItems: "flex-start",
    marginBottom: 10,
  },

  typingBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 20,
    borderBottomLeftRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    maxWidth: "82%",
  },

  typingText: {
    fontSize: 13,
    color: "#667085",
    fontWeight: "600",
  },
  composerWrapKeyboardOpen: {
    borderColor: "#D6E4F0",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
  },
});

// /** @format */

// import React, { useMemo, useRef, useState, useEffect } from "react";
// import {
//   ActivityIndicator,
//   Animated,
//   FlatList,
//   Keyboard,
//   KeyboardAvoidingView,
//   Platform,
//   Pressable,
//   StyleSheet,
//   Text,
//   TextInput,
//   View,
//   useWindowDimensions,
// } from "react-native";
// import { SafeAreaView } from "react-native-safe-area-context";
// import { Ionicons } from "@expo/vector-icons";
// import { LinearGradient } from "expo-linear-gradient";
// import type { NativeStackScreenProps } from "@react-navigation/native-stack";
// import type { EduHubStackParamList } from "../../../navigation/EduHubNavigator";
// import { askEduHubAI } from "../services/eduhub.api";
// import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

// type Props = NativeStackScreenProps<EduHubStackParamList, "AskAI">;

// type Message = {
//   id: string;
//   role: "assistant" | "user";
//   text: string;
// };

// const starterPrompts = [
//   "Explain simply",
//   "Summarize topic",
//   "Generate MCQs",
//   "Give 5-mark questions",
// ];

// export default function AskAI({ navigation }: Props) {
//   const { width } = useWindowDimensions();
//   const isTablet = width >= 768;
//   const tabBarHeight = useBottomTabBarHeight();
//   const listRef = useRef<FlatList<Message>>(null);

//   const composerTranslateY = useRef(new Animated.Value(0)).current;
//   const [keyboardVisible, setKeyboardVisible] = useState(false);
//   const [keyboardHeight, setKeyboardHeight] = useState(0);

//   const [draft, setDraft] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [messages, setMessages] = useState<Message[]>([
//     {
//       id: "welcome",
//       role: "assistant",
//       text: "Hi, I’m your EduHub study assistant. Ask me to explain a concept, summarize a topic, create MCQs, or prepare 5-mark answers.",
//     },
//   ]);

//   useEffect(() => {
//     const showEvent =
//       Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
//     const hideEvent =
//       Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

//     const showSub = Keyboard.addListener(showEvent, (event) => {
//       const height = event.endCoordinates?.height ?? 0;

//       setKeyboardVisible(true);
//       setKeyboardHeight(height);

//       Animated.timing(composerTranslateY, {
//         toValue: -(height - 12),
//         duration: 220,
//         useNativeDriver: true,
//       }).start();

//       setTimeout(() => {
//         listRef.current?.scrollToEnd({ animated: true });
//       }, 120);
//     });

//     const hideSub = Keyboard.addListener(hideEvent, () => {
//       setKeyboardVisible(false);
//       setKeyboardHeight(0);

//       Animated.timing(composerTranslateY, {
//         toValue: 0,
//         duration: 220,
//         useNativeDriver: true,
//       }).start();
//     });

//     return () => {
//       showSub.remove();
//       hideSub.remove();
//     };
//   }, [composerTranslateY]);

//   const canSend = useMemo(
//     () => draft.trim().length > 0 && !loading,
//     [draft, loading],
//   );

//   const scrollToBottom = () => {
//     setTimeout(() => {
//       listRef.current?.scrollToEnd({ animated: true });
//     }, 80);
//   };

//   const handleSend = async () => {
//     const trimmed = draft.trim();
//     if (!trimmed || loading) return;

//     const userMessage: Message = {
//       id: `${Date.now()}-user`,
//       role: "user",
//       text: trimmed,
//     };

//     setMessages((prev) => [...prev, userMessage]);
//     setDraft("");
//     setLoading(true);
//     scrollToBottom();

//     try {
//       const result = await askEduHubAI({
//         message: trimmed,
//         messages: [...messages, userMessage].map((item) => ({
//           role: item.role,
//           text: item.text,
//         })),
//       });

//       const assistantMessage: Message = {
//         id: `${Date.now()}-assistant`,
//         role: "assistant",
//         text:
//           result.answer?.trim() ||
//           "I could not generate a response right now. Please try again.",
//       };

//       setMessages((prev) => [...prev, assistantMessage]);
//       scrollToBottom();
//     } catch (error: any) {
//       console.error("[eduhub] ai request failed:", error);

//       const assistantMessage: Message = {
//         id: `${Date.now()}-assistant-error`,
//         role: "assistant",
//         text:
//           error?.message ||
//           "AI is not available right now. Please check your backend and try again.",
//       };

//       setMessages((prev) => [...prev, assistantMessage]);
//       scrollToBottom();
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handlePromptPress = (prompt: string) => {
//     const seeded =
//       prompt === "Explain simply"
//         ? "Explain database normalization simply with an example."
//         : prompt === "Summarize topic"
//           ? "Summarize software design patterns in a student-friendly way."
//           : prompt === "Generate MCQs"
//             ? "Generate 5 MCQs about data structures with answers."
//             : "Give me 5-mark questions and answers from operating systems.";

//     setDraft(seeded);
//   };

//   return (
//     <SafeAreaView style={styles.safeArea} edges={["top"]}>
//       <LinearGradient
//         colors={["#F7FBFF", "#EEF5FC", "#F7FBFF"]}
//         style={styles.background}
//       />

//       <KeyboardAvoidingView
//         style={styles.screen}
//         behavior={Platform.OS === "ios" ? "padding" : undefined}
//         keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}>
//         <View
//           style={[
//             styles.contentWrap,
//             {
//               paddingHorizontal: isTablet ? 28 : 16,
//             },
//           ]}>
//           <View style={styles.headerRow}>
//             <Pressable
//               style={styles.backBtn}
//               onPress={() => navigation.goBack()}>
//               <Ionicons name="arrow-back" size={20} color="#053668" />
//             </Pressable>

//             <Text style={styles.headerTitle}>Ask AI</Text>

//             <View style={styles.headerSpacer} />
//           </View>

//           <LinearGradient
//             colors={["#053668", "#07427F"]}
//             style={styles.heroCard}>
//             <View style={styles.heroTopRow}>
//               <View style={styles.heroIconWrap}>
//                 <Ionicons name="sparkles-outline" size={24} color="#053668" />
//               </View>

//               <View style={styles.heroTextWrap}>
//                 <Text style={styles.heroEyebrow}>EduHub Assistant</Text>
//                 <Text style={styles.heroTitle}>
//                   Ask anything from your notes
//                 </Text>
//                 <Text style={styles.heroSubtitle}>
//                   Get explanations, summaries, revision help, and question ideas
//                   in a student-friendly way.
//                 </Text>
//               </View>
//             </View>
//           </LinearGradient>

//           {/* <View style={styles.promptsWrap}>
//             {starterPrompts.map((prompt) => (
//               <Pressable
//                 key={prompt}
//                 style={styles.promptChip}
//                 onPress={() => handlePromptPress(prompt)}
//                 disabled={loading}>
//                 <Text style={styles.promptChipText}>{prompt}</Text>
//               </Pressable>
//             ))}
//           </View> */}

//           <FlatList
//             ref={listRef}
//             style={styles.list}
//             data={messages}
//             keyExtractor={(item) => item.id}
//             showsVerticalScrollIndicator={false}
//             contentContainerStyle={[
//               styles.listContent,
//               {
//                 paddingBottom: keyboardVisible
//                   ? keyboardHeight + 120
//                   : Math.max(tabBarHeight + 110, 130),
//               },
//             ]}
//             renderItem={({ item }) => {
//               const isUser = item.role === "user";

//               return (
//                 <View
//                   style={[
//                     styles.messageRow,
//                     isUser ? styles.messageRowUser : styles.messageRowAssistant,
//                   ]}>
//                   <View
//                     style={[
//                       styles.messageBubble,
//                       isUser
//                         ? styles.messageBubbleUser
//                         : styles.messageBubbleAssistant,
//                     ]}>
//                     <Text
//                       style={[
//                         styles.messageRole,
//                         isUser
//                           ? styles.messageRoleUser
//                           : styles.messageRoleAssistant,
//                       ]}>
//                       {isUser ? "You" : "EduHub AI"}
//                     </Text>

//                     <Text
//                       style={[
//                         styles.messageText,
//                         isUser && styles.messageTextUser,
//                       ]}>
//                       {item.text}
//                     </Text>
//                   </View>
//                 </View>
//               );
//             }}
//             onContentSizeChange={scrollToBottom}
//             ListFooterComponent={
//               loading ? (
//                 <View style={styles.typingWrap}>
//                   <View style={styles.typingBubble}>
//                     <ActivityIndicator size="small" color="#053668" />
//                     <Text style={styles.typingText}>
//                       EduHub AI is thinking...
//                     </Text>
//                   </View>
//                 </View>
//               ) : null
//             }
//           />

//           <Animated.View
//             style={[
//               styles.composerWrap,
//               keyboardVisible && styles.composerWrapKeyboardOpen,
//               {
//                 left: isTablet ? 28 : 16,
//                 right: isTablet ? 28 : 16,
//                 bottom: keyboardVisible ? 45 : Math.max(tabBarHeight + 25, 16),
//                 transform: [{ translateY: composerTranslateY }],
//               },
//             ]}>
//             <View style={styles.inputRow}>
//               <TextInput
//                 value={draft}
//                 onChangeText={setDraft}
//                 placeholder="Ask your study question..."
//                 placeholderTextColor="#98A2B3"
//                 style={styles.input}
//                 multiline
//                 textAlignVertical="top"
//                 editable={!loading}
//                 onFocus={scrollToBottom}
//               />

//               <Pressable
//                 style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
//                 onPress={handleSend}
//                 disabled={!canSend}>
//                 {loading ? (
//                   <ActivityIndicator size="small" color="#FFFFFF" />
//                 ) : (
//                   <Ionicons name="send" size={18} color="#FFFFFF" />
//                 )}
//               </Pressable>
//             </View>

//             <Text style={styles.footerHint}>
//               *AI can make mistakes. Always double-check with your class
//               materials and textbooks.
//             </Text>
//           </Animated.View>
//         </View>
//       </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   safeArea: {
//     flex: 1,
//     backgroundColor: "#F7FBFF",
//   },
//   background: {
//     ...StyleSheet.absoluteFillObject,
//   },
//   screen: {
//     flex: 1,
//   },
//   contentWrap: {
//     flex: 1,
//     paddingTop: 8,
//   },
//   headerRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//     marginBottom: 16,
//   },
//   backBtn: {
//     width: 42,
//     height: 42,
//     borderRadius: 21,
//     backgroundColor: "#FFFFFF",
//     borderWidth: 1,
//     borderColor: "#E5E7EB",
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   headerTitle: {
//     fontSize: 18,
//     fontWeight: "800",
//     color: "#111827",
//   },
//   headerSpacer: {
//     width: 42,
//   },

//   heroCard: {
//     borderRadius: 24,
//     padding: 18,
//   },
//   heroTopRow: {
//     flexDirection: "row",
//     alignItems: "flex-start",
//   },
//   heroIconWrap: {
//     width: 54,
//     height: 54,
//     borderRadius: 27,
//     backgroundColor: "#FFFFFF",
//     alignItems: "center",
//     justifyContent: "center",
//     marginRight: 12,
//   },
//   heroTextWrap: {
//     flex: 1,
//   },
//   heroEyebrow: {
//     fontSize: 11,
//     fontWeight: "800",
//     textTransform: "uppercase",
//     color: "#CCE2E8",
//     letterSpacing: 0.8,
//   },
//   heroTitle: {
//     marginTop: 6,
//     fontSize: 22,
//     lineHeight: 28,
//     fontWeight: "900",
//     color: "#FFFFFF",
//   },
//   heroSubtitle: {
//     marginTop: 6,
//     fontSize: 13.5,
//     lineHeight: 20,
//     color: "#DCEEF2",
//   },

//   promptsWrap: {
//     flexDirection: "row",
//     flexWrap: "wrap",
//     gap: 8,
//     marginTop: 16,
//     marginBottom: 14,
//   },
//   promptChip: {
//     backgroundColor: "#FFFFFF",
//     borderRadius: 999,
//     borderWidth: 1,
//     borderColor: "#E5E7EB",
//     paddingHorizontal: 12,
//     paddingVertical: 8,
//   },
//   promptChipText: {
//     fontSize: 12,
//     fontWeight: "700",
//     color: "#053668",
//   },

//   list: {
//     flex: 1,
//   },
//   listContent: {
//     paddingBottom: 16,
//   },

//   messageRow: {
//     marginBottom: 10,
//   },
//   messageRowUser: {
//     alignItems: "flex-end",
//   },
//   messageRowAssistant: {
//     alignItems: "flex-start",
//   },

//   messageBubble: {
//     maxWidth: "82%",
//     borderRadius: 20,
//     paddingHorizontal: 14,
//     paddingTop: 10,
//     paddingBottom: 10,
//   },
//   messageBubbleUser: {
//     backgroundColor: "#053668",
//     borderBottomRightRadius: 8,
//   },
//   messageBubbleAssistant: {
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
//   messageRoleUser: {
//     color: "#DCEEF2",
//   },
//   messageRoleAssistant: {
//     color: "#FF7100",
//   },

//   messageText: {
//     fontSize: 14,
//     lineHeight: 20,
//     color: "#111827",
//   },
//   messageTextUser: {
//     color: "#FFFFFF",
//   },

//   composerWrap: {
//     position: "absolute",
//     backgroundColor: "#FFFFFF",
//     borderRadius: 24,
//     borderWidth: 1,
//     borderColor: "#E5E7EB",
//     paddingHorizontal: 10,
//     paddingTop: 10,
//     paddingBottom: 10,
//     shadowColor: "#000",
//     shadowOpacity: 0.08,
//     shadowRadius: 12,
//     shadowOffset: { width: 0, height: 3 },
//     elevation: 6,
//   },

//   inputRow: {
//     flexDirection: "row",
//     alignItems: "flex-end",
//     gap: 8,
//   },
//   input: {
//     flex: 1,
//     minHeight: 48,
//     maxHeight: 120,
//     borderRadius: 18,
//     backgroundColor: "#F8FAFC",
//     borderWidth: 1,
//     borderColor: "#E5E7EB",
//     paddingHorizontal: 14,
//     paddingTop: 12,
//     paddingBottom: 12,
//     fontSize: 14,
//     lineHeight: 20,
//     color: "#111827",
//   },
//   sendBtn: {
//     width: 46,
//     height: 46,
//     borderRadius: 23,
//     backgroundColor: "#053668",
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   sendBtnDisabled: {
//     opacity: 0.45,
//   },
//   footerHint: {
//     marginTop: 8,
//     fontSize: 11.5,
//     color: "#98A2B3",
//     textAlign: "center",
//   },
//   typingWrap: {
//     alignItems: "flex-start",
//     marginBottom: 10,
//   },

//   typingBubble: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 10,
//     backgroundColor: "#FFFFFF",
//     borderWidth: 1,
//     borderColor: "#E5E7EB",
//     borderRadius: 20,
//     borderBottomLeftRadius: 8,
//     paddingHorizontal: 14,
//     paddingVertical: 12,
//     maxWidth: "82%",
//   },

//   typingText: {
//     fontSize: 13,
//     color: "#667085",
//     fontWeight: "600",
//   },
//   composerWrapKeyboardOpen: {
//     borderColor: "#D6E4F0",
//     shadowOpacity: 0.12,
//     shadowRadius: 16,
//     elevation: 10,
//   },
// });
