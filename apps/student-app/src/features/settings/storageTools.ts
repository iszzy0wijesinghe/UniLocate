/** @format */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { Platform } from "react-native";
import CryptoJS from "crypto-js";

const EXPORT_SECRET = "UNILOCATE_STORAGE_EXPORT_V1";
const EXPORT_FILE_NAME = "unilocate-storage-backup.uloc";
const EXPORT_DIRECTORY_URI_KEY = "unilocate-export-directory-uri";

const APP_KEY_PREFIXES = [
  "unilocate",
  "location-logs",
  "lost-found",
  "complaint",
];

function isAppKey(key: string) {
  const lower = key.toLowerCase();
  return APP_KEY_PREFIXES.some((prefix) =>
    lower.includes(prefix.toLowerCase()),
  );
}

function encryptPayload(payload: unknown) {
  return CryptoJS.AES.encrypt(
    JSON.stringify(payload),
    EXPORT_SECRET,
  ).toString();
}

function decryptPayload(cipherText: string) {
  const bytes = CryptoJS.AES.decrypt(cipherText, EXPORT_SECRET);
  const decoded = bytes.toString(CryptoJS.enc.Utf8);

  if (!decoded) {
    throw new Error("Invalid or unreadable backup file.");
  }

  return JSON.parse(decoded);
}

function normalizeImportedValue(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

async function getSavedExportDirectoryUri() {
  return AsyncStorage.getItem(EXPORT_DIRECTORY_URI_KEY);
}

async function saveExportDirectoryUri(uri: string) {
  await AsyncStorage.setItem(EXPORT_DIRECTORY_URI_KEY, uri);
}

async function requestExportDirectoryUri() {
  if (Platform.OS !== "android") {
    return null;
  }

  const permission =
    await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

  if (!permission.granted || !permission.directoryUri) {
    return null;
  }

  await saveExportDirectoryUri(permission.directoryUri);
  return permission.directoryUri;
}

async function getOrRequestExportDirectoryUri() {
  const saved = await getSavedExportDirectoryUri();
  if (saved) return saved;

  return requestExportDirectoryUri();
}

export async function getAppStorageSnapshot() {
  const allKeys = await AsyncStorage.getAllKeys();
  const appKeys = allKeys.filter(isAppKey);

  const entries = await AsyncStorage.multiGet(appKeys);

  let locationLogsCount = 0;
  let chatCacheCount = 0;
  let complaintSessionCount = 0;
  let totalBytes = 0;

  for (const [key, value] of entries) {
    totalBytes += key.length + (value?.length ?? 0);

    if (!value) continue;

    try {
      const parsed = JSON.parse(value);
      const lowerKey = key.toLowerCase();

      if (lowerKey.includes("location")) {
        if (Array.isArray(parsed)) {
          locationLogsCount += parsed.length;
        } else if (parsed && typeof parsed === "object") {
          const grouped = Object.values(parsed);
          for (const item of grouped) {
            if (Array.isArray(item)) {
              locationLogsCount += item.length;
            }
          }
        }
      }

      if (lowerKey.includes("chat")) {
        if (Array.isArray(parsed)) {
          chatCacheCount += parsed.length;
        } else if (parsed && typeof parsed === "object") {
          const grouped = Object.values(parsed);
          for (const item of grouped) {
            if (Array.isArray(item)) {
              chatCacheCount += item.length;
            }
          }
        }
      }

      if (lowerKey.includes("complaint") || lowerKey.includes("session")) {
        if (Array.isArray(parsed)) {
          complaintSessionCount += parsed.length;
        } else if (parsed && typeof parsed === "object") {
          complaintSessionCount += 1;
        }
      }
    } catch {
      // ignore non-JSON values
    }
  }

  return {
    totalBytes,
    totalKeys: appKeys.length,
    locationLogsCount,
    chatCacheCount,
    complaintSessionCount,
    appKeys,
  };
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export async function exportAppData() {
  const allKeys = await AsyncStorage.getAllKeys();
  const appKeys = allKeys.filter(isAppKey);
  const entries = await AsyncStorage.multiGet(appKeys);

  const exportObject = {
    exportedAt: new Date().toISOString(),
    app: "UniLocate",
    version: 1,
    encrypted: true,
    data: Object.fromEntries(entries),
  };

  const encrypted = encryptPayload(exportObject);

  if (Platform.OS === "android") {
    const directoryUri = await getOrRequestExportDirectoryUri();

    if (!directoryUri) {
      throw new Error(
        "No export folder selected. Please choose or create a folder like 'UniLocate Backups'.",
      );
    }

    const fileName = `UniLocate-Backup-${Date.now()}.uloc`;

    const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
      directoryUri,
      fileName,
      "application/octet-stream",
    );

    await FileSystem.writeAsStringAsync(fileUri, encrypted);

    return {
      ok: true,
      fileUri,
      location: "android-storage",
      fileName,
    };
  }

  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) {
    throw new Error("Cache directory is not available on this device.");
  }

  const fileUri = `${cacheDir}${EXPORT_FILE_NAME}`;

  await FileSystem.writeAsStringAsync(fileUri, encrypted);

  const fileInfo = await FileSystem.getInfoAsync(fileUri);
  if (!fileInfo.exists) {
    throw new Error("Backup file could not be created.");
  }

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error("File sharing is not available on this device.");
  }

  await Sharing.shareAsync(fileUri, {
    mimeType: "application/octet-stream",
    dialogTitle: "Export UniLocate storage backup",
    UTI: "public.data",
  });

  return {
    ok: true,
    fileUri,
    location: "share-sheet",
    fileName: EXPORT_FILE_NAME,
  };
}

export async function importAppData() {
  const picked = await DocumentPicker.getDocumentAsync({
    type: "*/*",
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (picked.canceled) {
    return { imported: 0, skipped: true };
  }

  const file = picked.assets?.[0];
  if (!file?.uri) {
    throw new Error("No backup file selected.");
  }

  const encrypted = await FileSystem.readAsStringAsync(file.uri);
  const parsed = decryptPayload(encrypted);

  if (!parsed?.data || typeof parsed.data !== "object") {
    throw new Error("Backup file structure is invalid.");
  }

  const entries = Object.entries(parsed.data).map(([key, value]) => [
    key,
    normalizeImportedValue(value),
  ]) as [string, string][];

  if (entries.length === 0) {
    return { imported: 0, skipped: false };
  }

  await AsyncStorage.multiSet(entries);

  return {
    imported: entries.length,
    skipped: false,
  };
}

export async function clearTemporaryCache() {
  const allKeys = await AsyncStorage.getAllKeys();

  const removableKeys = allKeys.filter((key) => {
    const lowerKey = key.toLowerCase();

    const isChatCache = lowerKey.includes("chat");
    const isLocationLogs = lowerKey.includes("location");
    const isComplaintCache =
      lowerKey.includes("complaint") || lowerKey.includes("session");

    return isChatCache || isLocationLogs || isComplaintCache;
  });

  if (removableKeys.length === 0) {
    return 0;
  }

  await AsyncStorage.multiRemove(removableKeys);
  return removableKeys.length;
}

export async function resetExportFolderSelection() {
  await AsyncStorage.removeItem(EXPORT_DIRECTORY_URI_KEY);
}