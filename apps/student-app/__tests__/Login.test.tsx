/** @format */

import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import Login from "../src/features/auth/LoginScreen";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");

  return {
    Ionicons: ({ name }: any) => <Text>{name}</Text>,
  };
});

describe("Login screen", () => {
  const navigation: any = {
    navigate: jest.fn(),
    replace: jest.fn(),
    goBack: jest.fn(),
  };

  it("renders login form", () => {
    const { getAllByText, getByPlaceholderText } = render(
      <Login navigation={navigation} route={{} as any} />,
    );

    expect(getAllByText(/Login/i).length).toBeGreaterThan(0);
    expect(getByPlaceholderText("Enter username")).toBeTruthy();
    expect(getByPlaceholderText("Enter password")).toBeTruthy();
  });

  it("allows user to type username and password", () => {
    const { getByPlaceholderText } = render(
      <Login navigation={navigation} route={{} as any} />,
    );

    fireEvent.changeText(getByPlaceholderText("Enter username"), "isindu");
    fireEvent.changeText(getByPlaceholderText("Enter password"), "Password@123");

    expect(getByPlaceholderText("Enter username").props.value).toBe("isindu");
    expect(getByPlaceholderText("Enter password").props.value).toBe(
      "Password@123",
    );
  });
});