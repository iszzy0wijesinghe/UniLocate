import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { complaintsTheme } from './theme';

type Props = {
  resources?: string[];
};

export default function EmergencyBanner({ resources = [] }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Immediate danger support</Text>
      <Text style={styles.body}>
        If you are in immediate danger or feel at risk of self-harm, contact emergency support
        first. Your complaint is still routed for urgent counselor review.
      </Text>
      {resources.map((resource) => (
        <Text key={resource} style={styles.resource}>
          - {resource}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: complaintsTheme.colors.warningSoft,
    borderRadius: complaintsTheme.radius.md,
    borderWidth: 1,
    borderColor: '#F7C8AA',
    padding: 16,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: complaintsTheme.colors.accent,
  },
  body: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: complaintsTheme.colors.primary,
  },
  resource: {
    marginTop: 8,
    color: complaintsTheme.colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
});
