/** @format */

import React from "react";
import { render } from "@testing-library/react-native";
import ComplaintChat from "../src/features/complaints/Chat";

jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");

  return {
    Ionicons: ({ name }: any) => <Text>{name}</Text>,
  };
});

jest.mock("@react-navigation/bottom-tabs", () => ({
  useBottomTabBarHeight: () => 60,
}));

jest.mock("../src/features/complaints/components/ChatBubble", () => {
  const React = require("react");
  const { Text } = require("react-native");

  return function MockChatBubble({ message }: any) {
    return <Text>{message.body || message.message || "Mock message"}</Text>;
  };
});

jest.mock("../src/features/complaints/components/EmptyState", () => {
  const React = require("react");
  const { Text } = require("react-native");

  return function MockEmptyState({ title }: any) {
    return <Text>{title}</Text>;
  };
});

jest.mock("../src/features/complaints/components/EvidenceUploader", () => {
  const React = require("react");
  const { Text } = require("react-native");

  return function MockEvidenceUploader() {
    return <Text>Evidence uploader</Text>;
  };
});

jest.mock("../src/features/complaints/hooks/useComplaints", () => ({
  useComplaintMessages: () => ({
    isLoading: false,
    isRefetching: false,
    data: [
      {
        id: "msg-1",
        body: "This is an anonymous complaint message.",
        senderType: "student",
        createdAt: new Date().toISOString(),
      },
    ],
    refetch: jest.fn(),
  }),
  useSendComplaintMessageMutation: () => ({
    mutateAsync: jest.fn(),
    isPending: false,
    error: null,
  }),
  useUploadComplaintAttachmentMutation: () => ({
    mutateAsync: jest.fn(),
    isPending: false,
    error: null,
  }),
}));

describe("ComplaintChat screen", () => {
  const navigation: any = {
    goBack: jest.fn(),
    navigate: jest.fn(),
  };

  const route: any = {
    params: {
      caseId: "case-1",
    },
  };

  it("renders anonymous support chat", () => {
    const { getByText, getByPlaceholderText } = render(
      <ComplaintChat navigation={navigation} route={route} />,
    );

    expect(getByText("Anonymous support chat")).toBeTruthy();
    expect(
      getByText("Your identity stays hidden in this conversation."),
    ).toBeTruthy();
    expect(getByText("Counselor follow-up")).toBeTruthy();
    expect(getByText("Attachments")).toBeTruthy();
    expect(getByPlaceholderText("Write an anonymous follow-up...")).toBeTruthy();
  });
});