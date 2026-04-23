import React from "react";
import { Text } from "react-native";
import { render, screen } from "@testing-library/react-native";

function Demo() {
  return <Text>UniLocate Test OK</Text>;
}

describe("smoke test", () => {
  it("renders text", () => {
    render(<Demo />);
    expect(screen.getByText("UniLocate Test OK")).toBeTruthy();
  });
});