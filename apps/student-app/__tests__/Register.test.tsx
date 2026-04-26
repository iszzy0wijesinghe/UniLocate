/** @format */

import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

// change this path
import Register from "../src/features/auth/RegisterScreen";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return { Ionicons: ({ name }: any) => <Text>{name}</Text> };
});

describe("Register screen", () => {
  const navigation: any = {
    navigate: jest.fn(),
    replace: jest.fn(),
    goBack: jest.fn(),
  };

  it("renders register form", () => {
    const { getByText } = render(
      <Register navigation={navigation} route={{} as any} />,
    );

    expect(getByText(/Register/i)).toBeTruthy();
  });

  it("allows user to enter registration details", () => {
    const { getByPlaceholderText } = render(
      <Register navigation={navigation} route={{} as any} />,
    );

    fireEvent.changeText(getByPlaceholderText("Choose username"), "Isindu");
    fireEvent.changeText(
      getByPlaceholderText("Enter password"),
      "Password@123",
    );
    fireEvent.changeText(
      getByPlaceholderText("Re-enter password"),
      "Password@123",
    );

    expect(getByPlaceholderText("Choose username").props.value).toBe("Isindu");
    expect(getByPlaceholderText("Enter password").props.value).toBe(
      "Password@123",
    );
    expect(getByPlaceholderText("Re-enter password").props.value).toBe(
      "Password@123",
    );
  });
});
