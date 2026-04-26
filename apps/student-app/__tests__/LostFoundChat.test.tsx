/** @format */

import React from "react";
import { render, waitFor } from "@testing-library/react-native";
import Chat from "../src/features/lost-found/Chat";

jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");

  return {
    Ionicons: ({ name }: any) => <Text>{name}</Text>,
  };
});

jest.mock("@react-navigation/native", () => ({
  useRoute: () => ({
    params: {
      postId: "post-1",
      initialMessage: "I found this item near the library.",
    },
  }),
}));

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

jest.mock("../src/features/lost-found/lostFound.api", () => ({
  getPostDetails: jest.fn().mockResolvedValue({
    id: "post-1",
    ownerUserId: "owner-1",
    ownerUsername: "owner",
  }),
  getLostFoundChats: jest.fn().mockResolvedValue([
    {
      id: "chat-1",
      senderType: "finder",
      message: "I found this item near the library.",
      createdAt: new Date().toISOString(),
    },
  ]),
  sendLostFoundChatMessage: jest.fn(),
}));

jest.mock("../src/features/lost-found/chat.storage", () => ({
  getStoredChatMessages: jest.fn().mockResolvedValue([]),
  saveStoredChatMessages: jest.fn().mockResolvedValue(undefined),
}));

describe("LostFound Chat screen", () => {
  it("renders secure lost and found chat", async () => {
    const { getByText, getByPlaceholderText } = render(<Chat />);

    expect(getByText("Secure Lost & Found Chat")).toBeTruthy();
    expect(getByText("Private owner-finder conversation")).toBeTruthy();

    await waitFor(() => {
      expect(
        getByText(
          "Secure chat started. Please avoid sharing personal phone numbers or private contact details.",
        ),
      ).toBeTruthy();

      expect(getByPlaceholderText("Type your message...")).toBeTruthy();
    });
  });
});