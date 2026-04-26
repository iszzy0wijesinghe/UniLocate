/** @format */

import { getOccupancyStatus } from "../src/utils/occupancyStatus";

describe("Realtime occupancy status", () => {
  it("returns Free when count is zero", () => {
    expect(getOccupancyStatus(0, 100)).toBe("Free");
  });

  it("returns Available for low occupancy", () => {
    expect(getOccupancyStatus(20, 100)).toBe("Available");
  });

  it("returns Almost Full for medium occupancy", () => {
    expect(getOccupancyStatus(50, 100)).toBe("Almost Full");
  });

  it("returns Crowded for high occupancy", () => {
    expect(getOccupancyStatus(85, 100)).toBe("Crowded");
  });
});