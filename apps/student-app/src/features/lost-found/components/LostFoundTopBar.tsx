/** @format */

import React from "react";
import { View, Text, StyleSheet, Image, Platform, StatusBar } from "react-native";

type Props = {
  title: string;
  subtitle?: string;
  compact?: boolean;
};

export default function LostFoundTopBar({
  title,
  subtitle,
  compact = false,
}: Props) {
  const topInset =
    Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) + 10 : 12;

  return (
    <View style={[styles.wrap, { paddingTop: topInset }, compact && styles.wrapCompact]}>
      <View style={styles.logoRow}>
        <Image
          source={require("../../../assets/images/UniLocateLogo.png")}
          resizeMode="contain"
          style={compact ? styles.logoCompact : styles.logo}
        />
      </View>

      <Text style={[styles.title, compact && styles.titleCompact]}>{title}</Text>

      {subtitle ? (
        <Text style={[styles.subtitle, compact && styles.subtitleCompact]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingBottom: 14,
  },
  wrapCompact: {
    paddingBottom: 10,
  },

  logoRow: {
    alignItems: "center",
    marginBottom: 10,
  },

  logo: {
    width: 104,
    height: 42,
  },
  logoCompact: {
    width: 92,
    height: 36,
  },

  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#053668",
    textAlign: "left",
  },
  titleCompact: {
    fontSize: 23,
  },

  subtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 21,
    color: "#667085",
  },
  subtitleCompact: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
  },
});