/** @format */

import React from "react";
import { render, waitFor } from "@testing-library/react-native";
import FlashcardsHome from "../src/features/eduhub/screens/FlashcardsHome";

jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");

  return {
    Ionicons: ({ name }: any) => <Text>{name}</Text>,
    MaterialCommunityIcons: ({ name }: any) => <Text>{name}</Text>,
  };
});

jest.mock("@react-native-picker/picker", () => {
  const React = require("react");
  const { View, Text } = require("react-native");

  return {
    Picker: ({ children }: any) => <View>{children}</View>,
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

jest.mock("../src/store/useUserProfileStore", () => ({
  useUserProfileStore: (selector: any) =>
    selector({
      userId: "user-1",
      username: "isindu",
    }),
}));

jest.mock("../src/features/eduhub/services/examMode.api", () => ({
  getEduHubExamEntries: jest.fn().mockResolvedValue([
    {
      id: "exam-1",
      moduleCode: "IT1010",
      moduleName: "Software Engineering",
    },
  ]),
}));

jest.mock("../src/features/eduhub/services/flashcardsApi", () => ({
  generateEduHubFlashcards: jest.fn(),
}));

jest.mock("../src/features/eduhub/storage/flashcardsStorage", () => ({
  saveFlashcardSetCards: jest.fn(),
  saveFlashcardSetToStorage: jest.fn(),
}));

describe("FlashcardsHome screen", () => {
  const navigation: any = {
    goBack: jest.fn(),
    navigate: jest.fn(),
    replace: jest.fn(),
  };

  const route: any = {
    params: {},
  };

  it("renders flashcards home screen", async () => {
    const { getByText } = render(
      <FlashcardsHome navigation={navigation} route={route} />,
    );

    expect(getByText("Flashcards AI")).toBeTruthy();
    expect(getByText("Generate smart flashcards")).toBeTruthy();

    await waitFor(() => {
      expect(getByText("IT1010")).toBeTruthy();
      expect(getByText("Software Engineering")).toBeTruthy();
    });
  });
});