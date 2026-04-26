/** @format */

import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

// change this path
import Settings from "../src/features/settings/EditUsername";

const mockSetUsername = jest.fn();

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
      username: "oldname",
      email: "isindu@test.com",
      fullName: "Isindu Wijesinghe",
      setUsername: mockSetUsername,
      clearProfile: jest.fn(),
    }),
}));

describe("Change username", () => {
  const navigation: any = {
    goBack: jest.fn(),
    navigate: jest.fn(),
    replace: jest.fn(),
  };

  it("renders settings screen for username change", () => {
    const { getByText } = render(
      <Settings navigation={navigation} route={{} as any} />,
    );

    expect(getByText("Edit Account")).toBeTruthy();
    expect(getByText(/oldname/i)).toBeTruthy();
    expect(getByText("Save Changes")).toBeTruthy();
  });
});
