/** @format */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLiveLocation } from "../../services/geo/useLiveLocation";
import {
  fetchZones,
  sendLocationEvent,
  type Zone,
} from "../../services/api/unilocateApi";
import { matchPolygonZone } from "../../services/geo/geoIntel";

type ZonePolygon = {
  id: string;
  name: string;
  type: string;
  polygon: { lat: number; lng: number }[];
};

function convertBackendZonesToPolygons(zones: Zone[]): ZonePolygon[] {
  return zones
    .map((zone) => {
      const coords = zone.polygon_geojson?.coordinates?.[0];

      if (!Array.isArray(coords)) return null;

      return {
        id: zone.id,
        name: zone.name,
        type: zone.type,
        polygon: coords.map((point: number[]) => ({
          lng: point[0],
          lat: point[1],
        })),
      };
    })
    .filter(Boolean) as ZonePolygon[];
}

export default function Home() {
  const { point, permissionDenied } = useLiveLocation();

  const [zones, setZones] = useState<Zone[]>([]);
  const [zonesStatus, setZonesStatus] = useState("Loading zones...");
  const [zonesError, setZonesError] = useState("");
  const [pingStatus, setPingStatus] = useState("Waiting for first ping...");

  const lastPingAtRef = useRef<number>(0);

  useEffect(() => {
    fetchZones()
      .then((data) => {
        setZones(data);
        setZonesStatus(`Loaded ${data.length} zones from backend`);
      })
      .catch((err) => {
        console.error("fetchZones failed", err);
        setZonesError(err.message || "Failed to fetch zones");
        setZonesStatus("Failed to load zones");
      });
  }, []);

  const polygonZones = useMemo(() => {
    return convertBackendZonesToPolygons(zones);
  }, [zones]);

  const matchedZone = useMemo(() => {
    if (!point || polygonZones.length === 0) return null;

    const found = polygonZones.find((zone) => {
      const result = matchPolygonZone(
        { lat: point.lat, lng: point.lng },
        [
          {
            zoneId: zone.id,
            placeId: zone.id,
            placeType: zone.type,
            building: zone.name,
            floor: 0,
            polygon: zone.polygon,
          },
        ]
      );

      return !!result;
    });

    return found ?? null;
  }, [point, polygonZones]);

  useEffect(() => {
    if (!point) return;

    const now = Date.now();

    // send a ping every 5 seconds for now
    if (now - lastPingAtRef.current < 5000) return;
    lastPingAtRef.current = now;

    sendLocationEvent({
      userId: "test-user-1",
      lat: point.lat,
      lng: point.lng,
      accuracyM: point.accuracy,
      matchedZoneId: matchedZone?.id ?? null,
      eventType: "PING",
    })
      .then(() => {
        setPingStatus(`Ping sent at ${new Date().toLocaleTimeString()}`);
      })
      .catch((err) => {
        console.error("sendLocationEvent failed", err);
        setPingStatus(`Ping failed: ${err.message}`);
      });
  }, [point?.lat, point?.lng, point?.accuracy, matchedZone?.id]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>UniLocate Home</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Backend</Text>
        <Text style={styles.text}>{zonesStatus}</Text>
        {!!zonesError && <Text style={styles.error}>{zonesError}</Text>}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Live Location</Text>

        {permissionDenied ? (
          <Text style={styles.error}>
            Location permission denied. Please enable location permission.
          </Text>
        ) : !point ? (
          <Text style={styles.text}>Getting current location...</Text>
        ) : (
          <>
            <Text style={styles.text}>Latitude: {point.lat.toFixed(6)}</Text>
            <Text style={styles.text}>Longitude: {point.lng.toFixed(6)}</Text>
            <Text style={styles.text}>
              Accuracy: ±{Math.round(point.accuracy ?? 0)}m
            </Text>
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Current Zone</Text>
        {matchedZone ? (
          <>
            <Text style={styles.text}>Name: {matchedZone.name}</Text>
            <Text style={styles.text}>Type: {matchedZone.type}</Text>
            <Text style={styles.text}>Zone ID: {matchedZone.id}</Text>
          </>
        ) : (
          <Text style={styles.text}>No zone matched</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Ping Status</Text>
        <Text style={styles.text}>{pingStatus}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 16,
    color: "#111827",
  },
  card: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 14,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
    color: "#111827",
  },
  text: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 4,
  },
  error: {
    fontSize: 14,
    color: "red",
    marginTop: 6,
  },
});