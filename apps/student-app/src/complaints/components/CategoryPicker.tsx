import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { complaintsTheme } from "./theme";

type Option<T extends string> = {
  label: string;
  value: T;
  helper?: string;
};

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

export default function CategoryPicker<T extends string>({
  options,
  value,
  onChange,
}: Props<T>) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.row}>
        {options.map((option) => {
          const active = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              style={[styles.pill, active ? styles.activePill : styles.inactivePill]}
            >
              <Text style={[styles.label, active ? styles.activeLabel : styles.inactiveLabel]}>
                {option.label}
              </Text>
              {option.helper ? (
                <Text
                  style={[
                    styles.helper,
                    active ? styles.activeHelper : styles.inactiveHelper,
                  ]}
                >
                  {option.helper}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 2,
  },
  pill: {
    minWidth: 112,
    borderRadius: complaintsTheme.radius.md,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  activePill: {
    backgroundColor: complaintsTheme.colors.primary,
    borderColor: complaintsTheme.colors.primary,
  },
  inactivePill: {
    backgroundColor: complaintsTheme.colors.card,
    borderColor: complaintsTheme.colors.line,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
  },
  helper: {
    marginTop: 4,
    fontSize: 11,
  },
  activeLabel: {
    color: "#FFFFFF",
  },
  inactiveLabel: {
    color: complaintsTheme.colors.primary,
  },
  activeHelper: {
    color: "#DCEEF2",
  },
  inactiveHelper: {
    color: complaintsTheme.colors.muted,
  },
});
