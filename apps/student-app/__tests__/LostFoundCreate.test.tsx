/** @format */

import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

jest.mock("@react-navigation/native", () => ({
  useRoute: () => ({
    params: {
      mode: "lost",
    },
  }),
  useNavigation: () => ({
    goBack: jest.fn(),
    navigate: jest.fn(),
    replace: jest.fn(),
  }),
}));

jest.mock("@react-navigation/bottom-tabs", () => ({
  useBottomTabBarHeight: () => 60,
}));

jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest
    .fn()
    .mockResolvedValue({ status: "granted" }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({
    coords: {
      latitude: 6.9147,
      longitude: 79.9729,
      accuracy: 10,
    },
  }),
  watchPositionAsync: jest.fn().mockResolvedValue({
    remove: jest.fn(),
  }),
  Accuracy: {
    High: 1,
    Balanced: 2,
  },
}));

jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");

  return {
    Ionicons: ({ name }: any) => <Text>{name}</Text>,
    MaterialCommunityIcons: ({ name }: any) => <Text>{name}</Text>,
  };
});

jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({
    status: "granted",
  }),
  MediaTypeOptions: {
    Images: "Images",
  },
}));

jest.mock("../src/store/useUserProfileStore", () => ({
  useUserProfileStore: (selector: any) =>
    selector({
      userId: "user-1",
      username: "isindu",
    }),
}));

jest.mock("../src/features/lost-found/lostFound.api", () => ({
  createLostFoundPost: jest.fn().mockResolvedValue({
    id: "post-1",
  }),
}));

jest.mock("../src/features/location-logs/storage", () => ({
  getRecentLocationLogs: jest.fn().mockResolvedValue([]),
}));

import CreatePost from "../src/features/lost-found/ReportItem";

describe("Lost and Found create post", () => {
  it("renders lost and found create form", () => {
    const { getByText } = render(<CreatePost />);

    expect(getByText("Lost item report")).toBeTruthy();
    expect(getByText("Short title *")).toBeTruthy();
    expect(getByText("Category")).toBeTruthy();
  });

  it("allows user to type lost item title", () => {
    const { getByPlaceholderText } = render(<CreatePost />);

    fireEvent.changeText(
      getByPlaceholderText("e.g. Blue university ID card"),
      "Lost iPad",
    );

    expect(
      getByPlaceholderText("e.g. Blue university ID card").props.value,
    ).toBe("Lost iPad");
  });
});