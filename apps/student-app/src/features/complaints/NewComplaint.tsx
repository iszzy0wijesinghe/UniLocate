import React from 'react';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import type { ComplaintsStackScreenProps } from '../../navigation/ComplaintsStack';
import CategoryPicker from './components/CategoryPicker';
import EmergencyBanner from './components/EmergencyBanner';
import EvidenceUploader from './components/EvidenceUploader';
import StatusBadge from './components/StatusBadge';
import { complaintsTheme } from './components/theme';
import {
  classifySeverity,
  complaintCategories,
  getCategoryLabel,
} from './complaints.api';
import { useCreateComplaintMutation } from './hooks/useComplaints';
import type { AttachmentDraft, CreateComplaintInput } from './types/complaints';
import { createComplaintSchema } from './validations/complaintSchemas';

type CreateComplaintFormValues = Omit<CreateComplaintInput, 'attachments'>;

function parseIncidentValue(value?: string) {
  if (!value) {
    return new Date();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function formatIncidentValue(value?: string) {
  if (!value) {
    return 'Select date and time';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Select date and time';
  }

  const year = parsed.getFullYear();
  const month = `${parsed.getMonth() + 1}`.padStart(2, '0');
  const day = `${parsed.getDate()}`.padStart(2, '0');
  const hours = `${parsed.getHours()}`.padStart(2, '0');
  const minutes = `${parsed.getMinutes()}`.padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function getClipboard() {
  try {
    return require('expo-clipboard') as { setStringAsync(value: string): Promise<void> };
  } catch {
    return null;
  }
}

export default function NewComplaint({
  navigation,
}: ComplaintsStackScreenProps<'NewComplaint'>) {
  const [attachments, setAttachments] = React.useState<AttachmentDraft[]>([]);
  const [receipt, setReceipt] = React.useState<{
    anonId: string;
    secret: string;
    complaintId: string;
    severity: string;
    emergencyResources: string[];
  } | null>(null);
  const [keepIdentityHidden, setKeepIdentityHidden] = React.useState(true);
  const [incidentPickerMode, setIncidentPickerMode] = React.useState<'date' | 'time' | null>(null);
  const [incidentPickerValue, setIncidentPickerValue] = React.useState(new Date());
  const createMutation = useCreateComplaintMutation();

  const form = useForm<CreateComplaintFormValues>({
    resolver: zodResolver(createComplaintSchema),
    defaultValues: {
      title: '',
      category: 'harassment',
      description: '',
      locationText: '',
      incidentAt: '',
      peopleInvolved: '',
      consent: false,
    },
  });

  const values = form.watch();
  const severityPreview = classifySeverity(`${values.title} ${values.description}`);

  const openIncidentPicker = React.useCallback((currentValue?: string) => {
    setIncidentPickerValue(parseIncidentValue(currentValue));
    setIncidentPickerMode('date');
  }, []);

  const handleIncidentPickerChange = React.useCallback(
    (
      onChange: (value: string) => void,
      event: DateTimePickerEvent,
      selectedDate?: Date,
    ) => {
      if (event.type === 'dismissed') {
        setIncidentPickerMode(null);
        return;
      }

      const nextValue = selectedDate ?? incidentPickerValue;
      setIncidentPickerValue(nextValue);

      if (incidentPickerMode === 'date') {
        setIncidentPickerMode('time');
        return;
      }

      onChange(nextValue.toISOString());
      setIncidentPickerMode(null);
    },
    [incidentPickerMode, incidentPickerValue],
  );

  const handleCopy = async (value: string, label: string) => {
    const clipboard = getClipboard();
    if (!clipboard) {
      Alert.alert('Clipboard unavailable', `${label} could not be copied on this build.`);
      return;
    }
    await clipboard.setStringAsync(value);
    Alert.alert(`${label} copied`, 'Store it somewhere safe outside the app.');
  };

  const handleShare = async () => {
    if (!receipt) {
      return;
    }

    try {
      await Share.share({
        message: `Anonymous complaint receipt\nAnonymous ID: ${receipt.anonId}\nSecret: ${receipt.secret}\nThis secret cannot be recovered if lost.`,
      });
    } catch {
      Alert.alert('Share unavailable', 'Please save the Anonymous ID and secret manually.');
    }
  };

  const handleSubmit = form.handleSubmit(async (payload) => {
    const result = await createMutation.mutateAsync({
      ...payload,
      attachments,
    });

    setReceipt({
      anonId: result.anonId,
      secret: result.secret,
      complaintId: result.complaint.id,
      severity: result.complaint.severity,
      emergencyResources: result.emergencyResources,
    });
  });

  if (receipt) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.contentContainer}>
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>Store these safely</Text>
          <Text style={styles.heroTitle}>Your anonymous complaint was submitted.</Text>
          <Text style={styles.heroSubtitle}>
            This secret is shown once. The app cannot recover it after you leave this screen.
          </Text>
        </View>

        {receipt.severity === 'CRITICAL' ? (
          <View style={{ marginTop: 16 }}>
            <EmergencyBanner resources={receipt.emergencyResources} />
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <Text style={styles.label}>Anonymous ID</Text>
          <Text selectable style={styles.codeText}>
            {receipt.anonId}
          </Text>
          <Pressable style={styles.inlineAction} onPress={() => handleCopy(receipt.anonId, 'Anonymous ID')}>
            <Text style={styles.inlineActionText}>Copy ID</Text>
          </Pressable>

          <Text style={[styles.label, styles.spacedLabel]}>Secret</Text>
          <Text selectable style={styles.codeText}>
            {receipt.secret}
          </Text>
          <Pressable style={styles.inlineAction} onPress={() => handleCopy(receipt.secret, 'Secret')}>
            <Text style={styles.inlineActionText}>Copy secret</Text>
          </Pressable>

          <View style={styles.badgeRow}>
            <StatusBadge
              label={receipt.severity}
              tone={receipt.severity === 'CRITICAL' ? 'critical' : 'accent'}
            />
            <StatusBadge label={getCategoryLabel(values.category)} />
          </View>

          <Text style={styles.warningText}>
            This secret cannot be recovered if lost. Save it outside the app before leaving.
          </Text>

          <Pressable style={[styles.button, styles.primaryButton]} onPress={handleShare}>
            <Text style={styles.primaryButtonText}>Share receipt</Text>
          </Pressable>
          <Pressable
            style={[styles.button, styles.secondaryButton]}
            onPress={() =>
              navigation.replace('ComplaintDetails', {
                caseId: receipt.complaintId,
              })
            }
          >
            <Text style={styles.secondaryButtonText}>Open complaint details</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>Anonymous reporting</Text>
          <Text style={styles.heroTitle}>Create a complaint without identifying yourself.</Text>
          <Text style={styles.heroSubtitle}>
            Names, email addresses, and student IDs are not required. Only share what staff need
            to act.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Complaint details</Text>

          <Text style={styles.label}>Category</Text>
          <Controller
            control={form.control}
            name="category"
            render={({ field }) => (
              <CategoryPicker
                options={complaintCategories}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />

          <Text style={[styles.label, styles.spacedLabel]}>Title</Text>
          <Controller
            control={form.control}
            name="title"
            render={({ field }) => (
              <TextInput
                value={field.value}
                onChangeText={field.onChange}
                placeholder="Short summary of what happened"
                placeholderTextColor="#98A2B3"
                style={styles.input}
              />
            )}
          />

          <Text style={[styles.label, styles.spacedLabel]}>Description</Text>
          <Controller
            control={form.control}
            name="description"
            render={({ field }) => (
              <TextInput
                value={field.value}
                onChangeText={field.onChange}
                placeholder="Describe what happened, where it happened, who was involved, and what follow-up is needed."
                placeholderTextColor="#98A2B3"
                style={[styles.input, styles.multilineInput]}
                multiline
                textAlignVertical="top"
              />
            )}
          />

          <View style={styles.badgeRow}>
            <StatusBadge
              label={`Severity preview: ${severityPreview}`}
              tone={severityPreview === 'CRITICAL' ? 'critical' : 'neutral'}
            />
          </View>

          {severityPreview === 'CRITICAL' ? (
            <View style={{ marginTop: 12 }}>
              <EmergencyBanner />
            </View>
          ) : null}

          <Text style={[styles.label, styles.spacedLabel]}>Optional location</Text>
          <Controller
            control={form.control}
            name="locationText"
            render={({ field }) => (
              <TextInput
                value={field.value}
                onChangeText={field.onChange}
                placeholder="Building, hostel, lecture hall, or nearby area"
                placeholderTextColor="#98A2B3"
                style={styles.input}
              />
            )}
          />

          <Text style={[styles.label, styles.spacedLabel]}>Optional incident time</Text>
          <Controller
            control={form.control}
            name="incidentAt"
            render={({ field }) => (
              <>
                <View style={styles.inlineFieldRow}>
                  <Pressable
                    style={[styles.input, styles.pickerInput]}
                    onPress={() => openIncidentPicker(field.value)}
                  >
                    <Text
                      style={field.value ? styles.pickerValueText : styles.pickerPlaceholderText}
                    >
                      {formatIncidentValue(field.value)}
                    </Text>
                  </Pressable>
                  {field.value ? (
                    <Pressable
                      style={styles.clearInlineAction}
                      onPress={() => field.onChange('')}
                    >
                      <Text style={styles.clearInlineActionText}>Clear</Text>
                    </Pressable>
                  ) : null}
                </View>
                {incidentPickerMode ? (
                  <DateTimePicker
                    value={incidentPickerValue}
                    mode={incidentPickerMode}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, selectedDate) =>
                      handleIncidentPickerChange(field.onChange, event, selectedDate)
                    }
                  />
                ) : null}
              </>
            )}
          />

          <Text style={[styles.label, styles.spacedLabel]}>People involved</Text>
          <Controller
            control={form.control}
            name="peopleInvolved"
            render={({ field }) => (
              <TextInput
                value={field.value}
                onChangeText={field.onChange}
                placeholder="Optional names, groups, or roles"
                placeholderTextColor="#98A2B3"
                style={styles.input}
              />
            )}
          />

          <EvidenceUploader attachments={attachments} onChange={setAttachments} />

          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Keep my identity hidden</Text>
              <Text style={styles.helpText}>
                Anonymous complaints never ask for your student identity. Leave this on unless you
                later choose to disclose contact details voluntarily.
              </Text>
            </View>
            <Switch
              value={keepIdentityHidden}
              onValueChange={setKeepIdentityHidden}
              trackColor={{ false: '#D0D5DD', true: '#FCC9AE' }}
              thumbColor={keepIdentityHidden ? complaintsTheme.colors.accent : '#FFFFFF'}
            />
          </View>

          <Controller
            control={form.control}
            name="consent"
            render={({ field }) => (
              <Pressable style={styles.consentRow} onPress={() => field.onChange(!field.value)}>
                <View style={[styles.checkbox, field.value && styles.checkboxActive]} />
                <Text style={styles.helpText}>
                  I confirm this report is accurate to the best of my knowledge, and I understand
                  emergency support should be contacted first if there is immediate danger.
                </Text>
              </Pressable>
            )}
          />

          {form.formState.errors.title?.message ? (
            <Text style={styles.errorText}>{form.formState.errors.title.message}</Text>
          ) : null}
          {form.formState.errors.description?.message ? (
            <Text style={styles.errorText}>{form.formState.errors.description.message}</Text>
          ) : null}
          {form.formState.errors.consent?.message ? (
            <Text style={styles.errorText}>{form.formState.errors.consent.message}</Text>
          ) : null}
          {createMutation.isError ? (
            <Text style={styles.errorText}>
              {(createMutation.error as Error).message || 'Could not submit complaint.'}
            </Text>
          ) : null}

          <View style={styles.actionRow}>
            <Pressable
              style={[styles.button, styles.secondaryButton]}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.primaryButton]}
              onPress={handleSubmit}
              disabled={createMutation.isPending}
            >
              <Text style={styles.primaryButtonText}>
                {createMutation.isPending ? 'Submitting...' : 'Submit complaint'}
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
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  heroCard: {
    backgroundColor: complaintsTheme.colors.primary,
    borderRadius: complaintsTheme.radius.lg,
    padding: 20,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: '#CCE2E8',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
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
  sectionCard: {
    marginTop: 16,
    backgroundColor: complaintsTheme.colors.card,
    borderRadius: complaintsTheme.radius.lg,
    borderWidth: 1,
    borderColor: complaintsTheme.colors.line,
    padding: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: complaintsTheme.colors.text,
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
    borderWidth: 1,
    borderColor: complaintsTheme.colors.line,
    borderRadius: complaintsTheme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: complaintsTheme.colors.text,
    backgroundColor: '#FFFFFF',
  },
  multilineInput: {
    minHeight: 132,
  },
  inlineFieldRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pickerInput: {
    flex: 1,
    justifyContent: 'center',
  },
  pickerValueText: {
    fontSize: 14,
    color: complaintsTheme.colors.text,
  },
  pickerPlaceholderText: {
    fontSize: 14,
    color: '#98A2B3',
  },
  clearInlineAction: {
    borderWidth: 1,
    borderColor: complaintsTheme.colors.line,
    backgroundColor: '#FFFFFF',
    borderRadius: complaintsTheme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  clearInlineActionText: {
    color: complaintsTheme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  toggleRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  helpText: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: complaintsTheme.colors.muted,
  },
  consentRow: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  checkbox: {
    marginTop: 4,
    width: 18,
    height: 18,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: complaintsTheme.colors.line,
    backgroundColor: '#FFFFFF',
  },
  checkboxActive: {
    backgroundColor: complaintsTheme.colors.accent,
    borderColor: complaintsTheme.colors.accent,
  },
  errorText: {
    marginTop: 12,
    color: complaintsTheme.colors.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: complaintsTheme.radius.pill,
    paddingVertical: 13,
  },
  primaryButton: {
    backgroundColor: complaintsTheme.colors.accent,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: complaintsTheme.colors.primary,
    backgroundColor: '#FFFFFF',
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
  codeText: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '700',
    color: complaintsTheme.colors.text,
  },
  inlineAction: {
    marginTop: 10,
    alignSelf: 'flex-start',
    borderRadius: complaintsTheme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: complaintsTheme.colors.chip,
  },
  inlineActionText: {
    color: complaintsTheme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  warningText: {
    marginTop: 16,
    fontSize: 13,
    lineHeight: 19,
    color: complaintsTheme.colors.muted,
  },
});
