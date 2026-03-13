import React from "react";
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { complaintsTheme } from "./theme";

type BadgeTone = "neutral" | "accent" | "critical" | "soft";

type Props = {
  label: string;
  tone?: BadgeTone;
};

export default function StatusBadge({ label, tone = "neutral" }: Props) {
  return (
    <View style={[styles.badge, toneStyles[tone].container]}>
      <Text style={[styles.label, toneStyles[tone].label]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: complaintsTheme.radius.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: "flex-start",
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
});

const toneStyles: Record<
  BadgeTone,
  { container: StyleProp<ViewStyle>; label: StyleProp<TextStyle> }
> = {
  neutral: {
    container: {
      backgroundColor: complaintsTheme.colors.chip,
      borderColor: complaintsTheme.colors.line,
    },
    label: {
      color: complaintsTheme.colors.primary,
    },
  },
  accent: {
    container: {
      backgroundColor: complaintsTheme.colors.warningSoft,
      borderColor: "#F7C8AA",
    },
    label: {
      color: complaintsTheme.colors.accent,
    },
  },
  critical: {
    container: {
      backgroundColor: complaintsTheme.colors.primary,
      borderColor: complaintsTheme.colors.primary,
    },
    label: {
      color: "#FFFFFF",
    },
  },
  soft: {
    container: {
      backgroundColor: complaintsTheme.colors.successSoft,
      borderColor: "#C6DFCE",
    },
    label: {
      color: complaintsTheme.colors.primary,
    },
  },
};
