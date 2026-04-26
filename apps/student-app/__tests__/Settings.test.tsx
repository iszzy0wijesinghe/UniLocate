/** @format */

import React from "react";
import { render } from "@testing-library/react-native";
import Settings from "../src/features/settings/SettingsHome";

jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");

  return {
    Ionicons: ({ name }: any) => <Text>{name}</Text>,
    MaterialCommunityIcons: ({ name }: any) => <Text>{name}</Text>,
  };
});

jest.mock("expo-linear-gradient", () => {
  const React = require("react");
  const { View } = require("react-native");

  return {
    LinearGradient: ({ children, style }: any) => (
      <View style={style}>{children}</View>
    ),
  };
});

jest.mock("@react-navigation/bottom-tabs", () => ({
  useBottomTabBarHeight: () => 60,
}));

jest.mock("../src/store/useUserProfileStore", () => ({
  useUserProfileStore: (selector: any) =>
    selector({
      userId: "user-1",
      username: "isindu",
      email: "isindu@test.com",
      fullName: "Isindu Wijesinghe",
      clearProfile: jest.fn(),
    }),
}));

describe("Settings screen", () => {
  const navigation: any = {
    goBack: jest.fn(),
    navigate: jest.fn(),
    replace: jest.fn(),
  };

  it("renders settings screen", () => {
    const { getAllByText } = render(
      <Settings navigation={navigation} route={{} as any} />,
    );

    expect(getAllByText(/Settings/i).length).toBeGreaterThan(0);
  });
});
