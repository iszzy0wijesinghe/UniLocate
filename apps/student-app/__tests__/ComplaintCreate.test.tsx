/** @format */

import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import CreateComplaint from "../src/features/complaints/NewComplaint";

jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");

  return {
    Ionicons: ({ name }: any) => <Text>{name}</Text>,
    MaterialCommunityIcons: ({ name }: any) => <Text>{name}</Text>,
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

jest.mock("../src/features/complaints/hooks/useComplaints", () => ({
  useCreateComplaintMutation: () => ({
    mutateAsync: jest.fn().mockResolvedValue({
      id: "case-1",
    }),
    isPending: false,
    error: null,
  }),
}));

describe("Anonymous complaint create", () => {
  const navigation: any = {
    goBack: jest.fn(),
    navigate: jest.fn(),
    replace: jest.fn(),
  };

  const route: any = {
    params: {},
  };

  it("renders complaint create form", () => {
    const { getAllByText } = render(
      <CreateComplaint navigation={navigation} route={route} />,
    );

    expect(getAllByText(/Anonymous/i).length).toBeGreaterThan(0);
  });

  it("allows user to type complaint details", () => {
    const { getByPlaceholderText } = render(
      <CreateComplaint navigation={navigation} route={route} />,
    );

    fireEvent.changeText(
      getByPlaceholderText(/describe/i),
      "This is a test anonymous complaint.",
    );

    expect(getByPlaceholderText(/describe/i).props.value).toBe(
      "This is a test anonymous complaint.",
    );
  });
});
