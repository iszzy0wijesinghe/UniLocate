import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import type { AttachmentDraft } from '../types/complaints';
import { complaintsTheme } from './theme';

type Props = {
  attachments: AttachmentDraft[];
  onChange: (attachments: AttachmentDraft[]) => void;
};

async function pickAttachment(): Promise<AttachmentDraft | null> {
  try {
    const picker = require('expo-document-picker') as {
      getDocumentAsync: (options: Record<string, unknown>) => Promise<any>;
    };
    const result = await picker.getDocumentAsync({
      copyToCacheDirectory: false,
      multiple: false,
      type: ['image/*', 'video/*', 'audio/*', 'application/pdf'],
    });

    if (result.canceled || !result.assets?.[0]) {
      return null;
    }

    const asset = result.assets[0];
    return {
      id: `${Date.now()}-${asset.name}`,
      originalName: asset.name,
      mimeType: asset.mimeType ?? 'application/octet-stream',
      sizeBytes: asset.size ?? 0,
      uri: asset.uri,
    };
  } catch {
    Alert.alert(
      'Attachment picker unavailable',
      'Install Expo Document Picker to attach evidence from the device.',
    );
    return null;
  }
}

export default function EvidenceUploader({ attachments, onChange }: Props) {
  const handleAdd = async () => {
    const next = await pickAttachment();
    if (next) {
      onChange([...attachments, next]);
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Evidence uploads</Text>
        <Pressable style={styles.addButton} onPress={handleAdd}>
          <Text style={styles.addButtonText}>Add file</Text>
        </Pressable>
      </View>
      <Text style={styles.helpText}>
        Accepted: JPG, PNG, MP4, MP3, M4A, WAV, PDF, DOCX. Files over 50MB are rejected.
      </Text>
      {attachments.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No files added yet.</Text>
        </View>
      ) : (
        attachments.map((attachment) => (
          <View key={attachment.id} style={styles.attachmentRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fileName}>{attachment.originalName}</Text>
              <Text style={styles.fileMeta}>
                {attachment.mimeType} - {(attachment.sizeBytes / 1024 / 1024).toFixed(2)} MB
              </Text>
            </View>
            <Pressable
              onPress={() =>
                onChange(attachments.filter((current) => current.id !== attachment.id))
              }
            >
              <Text style={styles.removeText}>Remove</Text>
            </Pressable>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: complaintsTheme.colors.primary,
  },
  addButton: {
    borderRadius: complaintsTheme.radius.pill,
    borderWidth: 1,
    borderColor: complaintsTheme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  addButtonText: {
    color: complaintsTheme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  helpText: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
    color: complaintsTheme.colors.muted,
  },
  emptyCard: {
    marginTop: 10,
    borderRadius: complaintsTheme.radius.md,
    borderWidth: 1,
    borderColor: complaintsTheme.colors.line,
    padding: 14,
    backgroundColor: '#FFFFFF',
  },
  emptyText: {
    color: complaintsTheme.colors.muted,
    fontSize: 13,
  },
  attachmentRow: {
    marginTop: 10,
    borderRadius: complaintsTheme.radius.md,
    borderWidth: 1,
    borderColor: complaintsTheme.colors.line,
    padding: 14,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fileName: {
    fontSize: 13,
    fontWeight: '700',
    color: complaintsTheme.colors.text,
  },
  fileMeta: {
    marginTop: 4,
    fontSize: 12,
    color: complaintsTheme.colors.muted,
  },
  removeText: {
    color: complaintsTheme.colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
});
