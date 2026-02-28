import React from "react";
import { View, Text } from "react-native";
import { useLiveLocation } from "../../services/geo/useLiveLocation";

import { calibrationMock } from "../../services/geo/calibrationMock";
import { zonePolygonsMock } from "../../services/geo/zones.mock";
import { matchNearestPlace, matchPolygonZone } from "../../services/geo/geoIntel";

export default function Home() {
  const { point, permissionDenied } = useLiveLocation();

  const match = point
    ? matchPolygonZone({ lat: point.lat, lng: point.lng }, zonePolygonsMock) ??
      matchNearestPlace(
        { lat: point.lat, lng: point.lng, accuracy: point.accuracy },
        calibrationMock
      )
    : null;

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16 }}>
      <Text style={{ fontSize: 18, marginBottom: 12 }}>Home (Location Tracking)</Text>

      {permissionDenied ? (
        <Text style={{ fontSize: 14, color: "red", textAlign: "center" }}>
          Location permission denied. Please enable location permission for UniLocate.
        </Text>
      ) : !point ? (
        <Text style={{ fontSize: 14 }}>Getting location...</Text>
      ) : (
        <>
          <Text style={{ fontSize: 14 }}>Latitude: {point.lat.toFixed(6)}</Text>
          <Text style={{ fontSize: 14 }}>Longitude: {point.lng.toFixed(6)}</Text>
          <Text style={{ fontSize: 14 }}>
            Accuracy: ±{Math.round(point.accuracy ?? 0)} m
          </Text>

          {point.timestamp ? (
            <Text style={{ fontSize: 12, marginTop: 8, opacity: 0.7 }}>
              Updated: {new Date(point.timestamp).toLocaleTimeString()}
            </Text>
          ) : null}

          {/* ✅ Phase 2 output */}
          <View style={{ marginTop: 14, alignItems: "center" }}>
            {match ? (
              <>
                <Text style={{ fontSize: 16, fontWeight: "700" }}>
                  Zone Match: {match.placeType}
                </Text>
                <Text style={{ fontSize: 14 }}>
                  {match.placeId} • {match.building} • Floor {match.floor}
                </Text>
                <Text style={{ fontSize: 12, opacity: 0.7 }}>
                  Distance: ~{Math.round(match.distanceM)}m ({match.source})
                </Text>
              </>
            ) : (
              <Text style={{ fontSize: 12, opacity: 0.7 }}>
                Zone: not matched (outside polygon + no nearby calibration match)
              </Text>
            )}
          </View>
        </>
      )}
    </View>
  );
}