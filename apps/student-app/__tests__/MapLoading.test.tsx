/** @format */

import React from "react";
import { render, waitFor } from "@testing-library/react-native";
import Home from "../src/features/home/Home";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");

  return {
    Ionicons: ({ name }: any) => <Text>{name}</Text>,
    MaterialCommunityIcons: ({ name }: any) => <Text>{name}</Text>,
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

jest.mock("../src/services/geo/useLiveLocation", () => ({
  useLiveLocation: () => ({
    point: {
      lat: 6.9147,
      lng: 79.9729,
      accuracy: 12,
    },
  }),
}));

jest.mock("../src/features/location-logs/useLocationLogger", () => ({
  useLocationLogger: jest.fn(),
}));

jest.mock("../src/services/device/getDeviceId", () => ({
  getDeviceId: jest.fn().mockResolvedValue("test-device-id"),
}));

jest.mock("../src/services/notifications/notificationService", () => ({
  notifyOfflineMode: jest.fn(),
  notifyOvercrowdedBuilding: jest.fn(),
}));

jest.mock("../src/services/api/unilocateApi", () => ({
  fetchBoundary: jest.fn().mockResolvedValue({
    id: "boundary-1",
    name: "SLIIT Campus Boundary",
    polygon_geojson: {
      type: "Polygon",
      coordinates: [
        [
          [79.972, 6.914],
          [79.974, 6.914],
          [79.974, 6.916],
          [79.972, 6.916],
          [79.972, 6.914],
        ],
      ],
    },
  }),

  fetchOccupancyZones: jest.fn().mockResolvedValue([
    {
      id: "zone-1",
      name: "main_library",
      display_name: "Main Library",
      type: "Library",
      area_group: "study_food",
      capacity_mode: "limited",
      capacity: 100,
      current_count: 35,
      status: "Available",
      description: "Main library study area",
      polygon_geojson: {
        type: "Polygon",
        coordinates: [
          [
            [79.972, 6.914],
            [79.974, 6.914],
            [79.974, 6.916],
            [79.972, 6.916],
            [79.972, 6.914],
          ],
        ],
      },
    },
  ]),

  sendLocationEvent: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock("../src/features/home/components/CampusMap2D", () => {
  const React = require("react");
  const { Text, View } = require("react-native");

  return function MockCampusMap2D({ zones }: any) {
    return (
      <View>
        <Text>Campus map loaded</Text>
        {zones?.map((zone: any) => (
          <Text key={zone.id}>{zone.name}</Text>
        ))}
      </View>
    );
  };
});

describe("Map loading and realtime occupancy", () => {
  it("loads campus map and occupancy zones", async () => {
    const { getByText } = render(<Home />);

    expect(getByText("Campus map loaded")).toBeTruthy();
    expect(getByText("Good Morning!")).toBeTruthy();

    await waitFor(() => {
      expect(getByText("1 zones loaded")).toBeTruthy();
      expect(getByText("Main Library")).toBeTruthy();
    });
  });
});