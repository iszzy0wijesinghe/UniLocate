/** @format */

import React from "react";
import { render, waitFor } from "@testing-library/react-native";
import NotesHome from "../src/features/eduhub/screens/NotesHome";

jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");

  return {
    Ionicons: ({ name }: any) => <Text>{name}</Text>,
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
    }),
}));

jest.mock("../src/features/eduhub/services/eduhub.api", () => ({
  getEduHubNotes: jest.fn().mockResolvedValue([
    {
      id: "note-1",
      title: "Database Normalization",
      module: "IT2010 Database Systems",
      noteType: "Text",
      uploadedByUsername: "isindu",
      updatedAt: new Date().toISOString(),
    },
  ]),
}));

describe("NotesHome screen", () => {
  const navigation: any = {
    goBack: jest.fn(),
    navigate: jest.fn(),
  };

  it("renders notes library and loaded notes", async () => {
    const { getByText } = render(<NotesHome navigation={navigation} route={{} as any} />);

    expect(getByText("Notes Library")).toBeTruthy();
    expect(getByText("Shared study library")).toBeTruthy();

    await waitFor(() => {
      expect(getByText("Database Normalization")).toBeTruthy();
      expect(getByText("IT2010 Database Systems")).toBeTruthy();
    });
  });
});