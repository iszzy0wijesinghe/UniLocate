export function getOccupancyStatus(currentCount: number, capacity: number) {
  if (capacity <= 0 || currentCount <= 0) return "Free";

  const ratio = currentCount / capacity;

  if (ratio >= 0.8) return "Crowded";
  if (ratio >= 0.4) return "Almost Full";
  return "Available";
}