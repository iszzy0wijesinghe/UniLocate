/** @format */

import React from "react";
import { render } from "@testing-library/react-native";
import AskAI from "../src/features/eduhub/screens/AskAI";

jest.mock("@react-navigation/bottom-tabs", () => ({
  useBottomTabBarHeight: () => 60,
}));

jest.mock("../src/features/eduhub/services/eduhub.api", () => ({
  askEduHubAI: jest.fn(),
}));

describe("AskAI screen", () => {
  const navigation: any = {
    goBack: jest.fn(),
  };

  const route: any = {};

  it("renders header and welcome text", () => {
    const { getByText } = render(
      <AskAI navigation={navigation} route={route} />,
    );

    expect(getByText("Ask AI")).toBeTruthy();
    expect(getByText("Ask anything from your notes")).toBeTruthy();
    expect(getByText("Hi, I’m your EduHub study assistant. Ask me to explain a concept, summarize a topic, create MCQs, or prepare 5-mark answers.")).toBeTruthy();
  });
});