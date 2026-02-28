import type { ZonePolygon } from "./polygonTypes";

export const zonePolygonsMock: ZonePolygon[] = [
  {
    zoneId: "study_lobby_f8",
    placeId: "Lobby_Floor8",
    placeType: "STUDY_AREA",
    building: "G_BLOCK",
    floor: 8,
    polygon: [
      { lat: 6.91557995, lng: 79.97406480000001 }, // Corner1
      { lat: 6.9156207, lng: 79.97411115 },        // Corner2
      { lat: 6.91561365, lng: 79.9741117 },        // Corner3
      { lat: 6.9155712000000005, lng: 79.97414025 } // Corner4
    ],
  },
];