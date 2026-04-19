import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { IdentityDisclosureInput } from '../types/complaints';
import { complaintsTheme } from './theme';

type Props = {
  onSubmit: (payload: IdentityDisclosureInput) => Promise<unknown>;
};

export default function IdentityDisclosureSheet({ onSubmit }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState<IdentityDisclosureInput>({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit(form);
      setForm({});
      setExpanded(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Optional identity disclosure</Text>
          <Text style={styles.subtitle}>
            Only share details here if you want staff to contact you privately.
          </Text>
        </View>
        <Pressable style={styles.toggleButton} onPress={() => setExpanded((value) => !value)}>
          <Text style={styles.toggleButtonText}>{expanded ? 'Hide' : 'Open'}</Text>
        </Pressable>
      </View>

      {expanded ? (
        <View style={styles.form}>
          <TextInput
            value={form.name ?? ''}
            onChangeText={(value) => setForm((current) => ({ ...current, name: value }))}
            placeholder="Name"
            placeholderTextColor="#98A2B3"
            style={styles.input}
          />
          <TextInput
            value={form.phone ?? ''}
            onChangeText={(value) => setForm((current) => ({ ...current, phone: value }))}
            placeholder="Phone"
            placeholderTextColor="#98A2B3"
            style={styles.input}
          />
          <TextInput
            value={form.email ?? ''}
            onChangeText={(value) => setForm((current) => ({ ...current, email: value }))}
            placeholder="Email"
            placeholderTextColor="#98A2B3"
            style={styles.input}
          />
          <TextInput
            value={form.notes ?? ''}
            onChangeText={(value) => setForm((current) => ({ ...current, notes: value }))}
            placeholder="Preferred contact times or private meeting notes"
            placeholderTextColor="#98A2B3"
            style={[styles.input, styles.multiline]}
            multiline
          />

          <Pressable style={styles.submitButton} onPress={handleSubmit} disabled={submitting}>
            <Text style={styles.submitButtonText}>
              {submitting ? 'Submitting...' : 'Submit disclosure'}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    backgroundColor: complaintsTheme.colors.card,
    borderRadius: complaintsTheme.radius.lg,
    borderWidth: 1,
    borderColor: complaintsTheme.colors.line,
    padding: 18,
  },
  headerRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: complaintsTheme.colors.text,
  },
  subtitle: {
    marginTop: 6,
    color: complaintsTheme.colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  toggleButton: {
    borderRadius: complaintsTheme.radius.pill,
    borderWidth: 1,
    borderColor: complaintsTheme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  toggleButtonText: {
    color: complaintsTheme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  form: {
    marginTop: 14,
    gap: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: complaintsTheme.colors.line,
    borderRadius: complaintsTheme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    backgroundColor: '#FFFFFF',
    color: complaintsTheme.colors.text,
  },
  multiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    marginTop: 4,
    borderRadius: complaintsTheme.radius.pill,
    backgroundColor: complaintsTheme.colors.accent,
    paddingVertical: 13,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
