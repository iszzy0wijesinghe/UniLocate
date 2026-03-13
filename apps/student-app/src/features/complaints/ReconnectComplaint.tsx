import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { ComplaintsStackScreenProps } from '../../navigation/ComplaintsStack';
import { complaintsTheme } from './components/theme';
import { useReconnectComplaintMutation } from './hooks/useComplaints';

export default function ReconnectComplaint({
  navigation,
}: ComplaintsStackScreenProps<'ReconnectComplaint'>) {
  const reconnectMutation = useReconnectComplaintMutation();
  const [anonId, setAnonId] = React.useState('');
  const [secret, setSecret] = React.useState('');

  const handleSubmit = async () => {
    const result = await reconnectMutation.mutateAsync({
      anonId: anonId.trim(),
      secret: secret.trim(),
    });

    navigation.replace('ComplaintDetails', { caseId: result.complaint.id });
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>Reconnect privately</Text>
          <Text style={styles.heroTitle}>Use your Anonymous ID and secret to restore access.</Text>
          <Text style={styles.heroSubtitle}>
            The secret cannot be recovered. A new case session is created after verification.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Anonymous ID</Text>
          <TextInput
            value={anonId}
            onChangeText={setAnonId}
            placeholder="ANON-45821"
            placeholderTextColor="#98A2B3"
            style={styles.input}
            autoCapitalize="characters"
          />

          <Text style={[styles.label, styles.spacedLabel]}>Secret</Text>
          <TextInput
            value={secret}
            onChangeText={setSecret}
            placeholder="Paste your secret"
            placeholderTextColor="#98A2B3"
            style={styles.input}
            secureTextEntry
          />

          {reconnectMutation.isError ? (
            <Text style={styles.errorText}>
              {(reconnectMutation.error as Error).message || 'Reconnect failed'}
            </Text>
          ) : null}

          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.button, styles.secondaryButton]}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.primaryButton]}
              onPress={handleSubmit}
              disabled={reconnectMutation.isPending}
            >
              <Text style={styles.primaryButtonText}>
                {reconnectMutation.isPending ? 'Verifying...' : 'Reconnect'}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: complaintsTheme.colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  heroCard: {
    backgroundColor: complaintsTheme.colors.primary,
    borderRadius: complaintsTheme.radius.lg,
    padding: 20,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: '#CCE2E8',
  },
  heroTitle: {
    marginTop: 8,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: '#DCEEF2',
  },
  card: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: complaintsTheme.radius.lg,
    borderWidth: 1,
    borderColor: complaintsTheme.colors.line,
    padding: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: complaintsTheme.colors.primary,
  },
  spacedLabel: {
    marginTop: 16,
  },
  input: {
    marginTop: 8,
    borderRadius: complaintsTheme.radius.md,
    borderWidth: 1,
    borderColor: complaintsTheme.colors.line,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    color: complaintsTheme.colors.text,
    fontSize: 14,
  },
  errorText: {
    marginTop: 14,
    fontSize: 13,
    color: complaintsTheme.colors.accent,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  button: {
    flex: 1,
    borderRadius: complaintsTheme.radius.pill,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: complaintsTheme.colors.accent,
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: complaintsTheme.colors.primary,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButtonText: {
    color: complaintsTheme.colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});
