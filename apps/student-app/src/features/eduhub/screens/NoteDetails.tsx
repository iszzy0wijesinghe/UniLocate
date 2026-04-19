/** @format */

import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { WebView } from "react-native-webview";
import * as WebBrowser from "expo-web-browser";

import type { EduHubStackParamList } from "../../../navigation/EduHubNavigator";
import { getEduHubFileUrl, getEduHubNoteById } from "../services/eduhub.api";
import type { EduHubNote } from "../types/eduhub";

type Props = NativeStackScreenProps<EduHubStackParamList, "NoteDetails">;

function formatFullDate(value: string) {
  return new Date(value).toLocaleString();
}

function buildPdfViewerHtml(fileUrl: string) {
  const escapedUrl = JSON.stringify(fileUrl);

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=yes"
        />
        <style>
          html, body {
            margin: 0;
            padding: 0;
            background: #F8FAFC;
            width: 100%;
            height: 100%;
            overflow: auto;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          }

          #app {
            min-height: 100%;
            background: #F8FAFC;
            padding: 12px;
            box-sizing: border-box;
          }

          #status {
            font-size: 14px;
            color: #667085;
            text-align: center;
            padding: 16px 0;
            white-space: pre-wrap;
            word-break: break-word;
          }

          .page {
            margin: 0 auto 12px auto;
            background: white;
            box-shadow: 0 2px 10px rgba(0,0,0,0.08);
            border-radius: 12px;
            overflow: hidden;
            width: fit-content;
            max-width: 100%;
          }

          canvas {
            display: block;
            max-width: 100%;
            height: auto;
          }
        </style>
      </head>
      <body>
        <div id="app">
          <div id="status">Loading document preview...</div>
          <div id="pages"></div>
        </div>

        <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.js"></script>
        <script>
          const pdfUrl = ${escapedUrl};
          const statusEl = document.getElementById("status");
          const pagesEl = document.getElementById("pages");

          function updateStatus(message) {
            statusEl.textContent = message;
          }

          updateStatus("Loading PDF.js...\\n" + pdfUrl);

          if (!window.pdfjsLib) {
            updateStatus("PDF.js library failed to load.");
          } else {
            pdfjsLib.GlobalWorkerOptions.workerSrc =
              "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.js";

            async function renderPdf() {
              try {
                updateStatus("Fetching document...\\n" + pdfUrl);

                const loadingTask = pdfjsLib.getDocument({
                  url: pdfUrl,
                  withCredentials: false,
                });

                const pdf = await loadingTask.promise;

                updateStatus("Rendering " + pdf.numPages + " page(s)...");

                for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                  const page = await pdf.getPage(pageNum);

                  const viewport = page.getViewport({ scale: 1.35 });
                  const canvas = document.createElement("canvas");
                  const context = canvas.getContext("2d");

                  canvas.width = viewport.width;
                  canvas.height = viewport.height;

                  const wrapper = document.createElement("div");
                  wrapper.className = "page";
                  wrapper.appendChild(canvas);
                  pagesEl.appendChild(wrapper);

                  await page.render({
                    canvasContext: context,
                    viewport,
                  }).promise;
                }

                statusEl.style.display = "none";
              } catch (error) {
                console.error("PDF render failed", error);
                updateStatus(
                  "Preview could not be loaded.\\n\\n" +
                  (error && error.message ? error.message : String(error))
                );
              }
            }

            renderPdf();
          }
        </script>
      </body>
    </html>
  `;
}

export default function NoteDetails({ navigation, route }: Props) {
  const { width } = useWindowDimensions();
  const tabBarHeight = useBottomTabBarHeight();
  const isTablet = width >= 768;
  const { noteId } = route.params;

  const [note, setNote] = useState<EduHubNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfFailed, setPdfFailed] = useState(false);

  const loadNote = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getEduHubNoteById(noteId);
      setNote(data);
    } catch (err: any) {
      console.error("[eduhub] failed to load note details:", err);
      setError(err?.message || "Could not load note.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId]);

  useEffect(() => {
    setPdfLoading(true);
    setPdfFailed(false);
  }, [note?.id]);

  const fileUrl = useMemo(
    () => getEduHubFileUrl(note?.fileUrl),
    [note?.fileUrl],
  );

  const pdfHtml = useMemo(() => {
    if (!fileUrl || note?.noteType !== "PDF") return "";
    return buildPdfViewerHtml(fileUrl);
  }, [fileUrl, note?.noteType]);

  const handleOpenFile = async () => {
    if (!fileUrl) return;

    try {
      await WebBrowser.openBrowserAsync(fileUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        showTitle: true,
      });
    } catch (err) {
      console.error("[eduhub] failed to open file:", err);

      try {
        const supported = await Linking.canOpenURL(fileUrl);
        if (supported) {
          await Linking.openURL(fileUrl);
        }
      } catch (linkErr) {
        console.error("[eduhub] fallback open failed:", linkErr);
      }
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <LinearGradient
        colors={["#F7FBFF", "#EEF5FC", "#F7FBFF"]}
        style={styles.background}
      />

      <View
        style={[
          styles.screen,
          {
            paddingBottom: tabBarHeight + 10,
          },
        ]}>
        <ScrollView
          contentContainerStyle={[
            styles.container,
            {
              paddingHorizontal: isTablet ? 28 : 16,
            },
          ]}
          showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <Pressable
              style={styles.backBtn}
              onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={20} color="#053668" />
            </Pressable>

            <Text style={styles.headerTitle}>Note Details</Text>

            <View style={styles.headerSpacer} />
          </View>

          {loading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator size="small" color="#053668" />
              <Text style={styles.loadingText}>Loading note...</Text>
            </View>
          ) : error || !note ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>Could not load note</Text>
              <Text style={styles.errorText}>{error || "Note not found."}</Text>

              <Pressable style={styles.retryBtn} onPress={loadNote}>
                <Text style={styles.retryBtnText}>Try again</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <LinearGradient
                colors={["#053668", "#07427F"]}
                style={styles.heroCard}>
                <View style={styles.heroTopRow}>
                  <View style={styles.heroIcon}>
                    <Ionicons
                      name={
                        note.noteType === "Text"
                          ? "document-text-outline"
                          : note.noteType === "PDF"
                            ? "document-outline"
                            : "image-outline"
                      }
                      size={26}
                      color="#053668"
                    />
                  </View>

                  <View style={styles.heroTextWrap}>
                    <View style={styles.typeBadge}>
                      <Text style={styles.typeBadgeText}>{note.noteType}</Text>
                    </View>

                    <Text style={styles.heroTitle}>{note.title}</Text>
                    <Text style={styles.heroSubtitle}>{note.module}</Text>
                  </View>
                </View>
              </LinearGradient>

              {note.noteType === "Text" && note.contentText ? (
                <View style={styles.articleCard}>
                  <Text style={styles.articleHeading}>{note.title}</Text>
                  <Text style={styles.articleModule}>{note.module}</Text>

                  <View style={styles.articleDivider} />

                  <Text style={styles.articleBody}>{note.contentText}</Text>

                  <View style={styles.articleFooter}>
                    <Text style={styles.articleFooterLabel}>Uploaded by</Text>
                    <Text style={styles.articleFooterValue}>
                      {note.uploadedByUsername}
                    </Text>

                    <Text style={styles.articleFooterLabel}>Created</Text>
                    <Text style={styles.articleFooterValue}>
                      {formatFullDate(note.createdAt)}
                    </Text>

                    <Text style={styles.articleFooterLabel}>Last updated</Text>
                    <Text style={styles.articleFooterValue}>
                      {formatFullDate(note.updatedAt)}
                    </Text>
                  </View>
                </View>
              ) : null}

              {note.noteType === "Image" && fileUrl ? (
                <View style={styles.viewerCard}>
                  <View style={styles.viewerHeader}>
                    <Text style={styles.viewerTitle}>Image Preview</Text>
                  </View>

                  <Image
                    source={{ uri: fileUrl }}
                    resizeMode="contain"
                    style={styles.previewImage}
                  />

                  <View style={styles.viewerFooter}>
                    <Text style={styles.viewerFooterLabel}>Uploaded by</Text>
                    <Text style={styles.viewerFooterValue}>
                      {note.uploadedByUsername}
                    </Text>

                    <Text style={styles.viewerFooterLabel}>Published</Text>
                    <Text style={styles.viewerFooterValue}>
                      {formatFullDate(note.createdAt)}
                    </Text>

                    <Text style={styles.viewerFooterLabel}>Updated</Text>
                    <Text style={styles.viewerFooterValue}>
                      {formatFullDate(note.updatedAt)}
                    </Text>
                  </View>
                </View>
              ) : null}

              {note.noteType === "PDF" ? (
                <View style={styles.viewerCard}>
                  <View style={styles.viewerHeader}>
                    <Text style={styles.viewerTitle}>Document Preview</Text>
                  </View>

                  <View style={styles.pdfPreviewCard}>
                    <View style={styles.pdfPreviewIconWrap}>
                      <Ionicons
                        name="document-text-outline"
                        size={34}
                        color="#C2410C"
                      />
                    </View>

                    <Text style={styles.pdfPreviewTitle}>{note.title}</Text>

                    <Text style={styles.pdfPreviewSubtitle}>
                      PDF preview inside this screen is limited in Expo Go. Open
                      the document in the app browser for the best available
                      experience.
                    </Text>

                    {fileUrl ? (
                      <Pressable
                        style={styles.openFileBtn}
                        onPress={handleOpenFile}>
                        <Ionicons
                          name="open-outline"
                          size={16}
                          color="#FFFFFF"
                        />
                        <Text style={styles.openFileBtnText}>
                          Open Document
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>

                  <View style={styles.viewerFooter}>
                    <Text style={styles.viewerFooterLabel}>Uploaded by</Text>
                    <Text style={styles.viewerFooterValue}>
                      {note.uploadedByUsername}
                    </Text>

                    <Text style={styles.viewerFooterLabel}>Published</Text>
                    <Text style={styles.viewerFooterValue}>
                      {formatFullDate(note.createdAt)}
                    </Text>

                    <Text style={styles.viewerFooterLabel}>Updated</Text>
                    <Text style={styles.viewerFooterValue}>
                      {formatFullDate(note.updatedAt)}
                    </Text>
                  </View>
                </View>
              ) : null}
            </>
          )}
        </ScrollView>
      </View>
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
  container: {
    paddingTop: 8,
    paddingBottom: 40,
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

  loadingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 20,
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: "#667085",
    fontWeight: "600",
  },

  errorCard: {
    backgroundColor: "#FFF7ED",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FED7AA",
    padding: 18,
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#9A3412",
  },
  errorText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: "#9A3412",
  },
  retryBtn: {
    alignSelf: "flex-start",
    marginTop: 12,
    backgroundColor: "#053668",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  retryBtnText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "800",
  },

  heroCard: {
    borderRadius: 24,
    padding: 18,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  heroTextWrap: {
    flex: 1,
  },
  typeBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#E2EDF7",
    textTransform: "uppercase",
  },
  heroTitle: {
    marginTop: 10,
    fontSize: 22,
    lineHeight: 30,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  heroSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#DCEEF2",
  },

  articleCard: {
    marginTop: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 22,
  },
  articleHeading: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "900",
    color: "#111827",
  },
  articleModule: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "700",
    color: "#053668",
    letterSpacing: 0.3,
  },
  articleDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginTop: 18,
    marginBottom: 18,
  },
  articleBody: {
    fontSize: 15.5,
    lineHeight: 28,
    color: "#243041",
  },
  articleFooter: {
    marginTop: 28,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  articleFooterLabel: {
    marginTop: 10,
    fontSize: 11.5,
    fontWeight: "800",
    color: "#98A2B3",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  articleFooterValue: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    color: "#111827",
    fontWeight: "600",
  },

  viewerCard: {
    marginTop: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  viewerHeader: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
  },
  viewerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },

  previewImage: {
    width: "100%",
    height: 420,
    backgroundColor: "#F8FAFC",
  },

  pdfShell: {
    height: 560,
    backgroundColor: "#F8FAFC",
    position: "relative",
  },
  pdfWebView: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  pdfOverlayLoading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(248,250,252,0.94)",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  pdfOverlayText: {
    fontSize: 13,
    color: "#667085",
    fontWeight: "600",
  },

  pdfPreviewCard: {
    marginHorizontal: 18,
    marginBottom: 4,
    borderRadius: 20,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    padding: 20,
    alignItems: "center",
  },
  pdfPreviewIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  pdfPreviewTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900",
    color: "#9A3412",
    textAlign: "center",
  },
  pdfPreviewSubtitle: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 20,
    color: "#9A3412",
    textAlign: "center",
  },

  openFileBtn: {
    marginTop: 16,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#053668",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  openFileBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  viewerFooter: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  viewerFooterLabel: {
    marginTop: 10,
    fontSize: 11.5,
    fontWeight: "800",
    color: "#98A2B3",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  viewerFooterValue: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    color: "#111827",
    fontWeight: "600",
  },
});
