import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import {
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";

export default function CustomTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;

          const label =
            descriptors[route.key].options.tabBarLabel ??
            descriptors[route.key].options.title ??
            route.name;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const color = isFocused ? "#FF7100" : "#FFFFFF";

          const icon = (() => {
            switch (route.name) {
              case "Home":
                return (
                  <MaterialCommunityIcons
                    name="home-city-outline"
                    size={24}
                    color={color}
                  />
                );

              case "LostFound":
                return (
                  <MaterialCommunityIcons
                    name="bag-personal-outline"
                    size={24}
                    color={color}
                  />
                );

              case "Complaints":
                return (
                  <MaterialIcons
                    name="record-voice-over"
                    size={24}
                    color={color}
                  />
                );

              case "Settings":
                return (
                  <Ionicons
                    name="settings-outline"
                    size={24}
                    color={color}
                  />
                );

              default:
                return (
                  <Ionicons
                    name="ellipse-outline"
                    size={22}
                    color={color}
                  />
                );
            }
          })();

          return (
            <Pressable key={route.key} onPress={onPress} style={styles.tab}>
              <View style={styles.iconWrap}>{icon}</View>
              <Text style={[styles.label, isFocused && styles.labelActive]}>
                {typeof label === "string" ? label : route.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 18,
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#053668",
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 10,
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 68,
  },
  iconWrap: {
    height: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    marginTop: 4,
    fontSize: 11,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  labelActive: {
    color: "#FF7100",
  },
});