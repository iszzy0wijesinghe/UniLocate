import fs from "fs";
import path from "path";
import "dotenv/config";
import { pool } from "../db";

type GeoJsonFeature = {
  type: "Feature";
  properties: {
    fid?: number;
    building_id?: string | null;
    display_name?: string | null;
    floors_min?: number | null;
    floors_max?: number | null;
    floor_height_m?: number | null;
  };
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: any;
  };
};

type GeoJsonFeatureCollection = {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
};

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\(/g, "")
    .replace(/\)/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function inferZoneType(name: string): string {
  const n = name.toLowerCase();

  if (n.includes("pool") || n.includes("court") || n.includes("ground")) {
    return "SPORTS";
  }

  if (
    n.includes("canteen") ||
    n.includes("bird nest") ||
    n.includes("wala")
  ) {
    return "FOOD";
  }

  if (n.includes("security")) {
    return "SECURITY";
  }

  if (n.includes("parking") || n.includes("carpark")) {
    return "PARKING";
  }

  if (n.includes("block")) {
    return "BLOCK";
  }

  if (n.includes("library") || n.includes("study")) {
    return "STUDY_AREA";
  }

  return "PUBLIC";
}

async function run() {
  const geojsonPath = path.resolve(process.cwd(), "../../campus_zones.geojson");

  if (!fs.existsSync(geojsonPath)) {
    throw new Error(`GeoJSON file not found at: ${geojsonPath}`);
  }

  const raw = fs.readFileSync(geojsonPath, "utf-8");
  const data = JSON.parse(raw) as GeoJsonFeatureCollection;

  if (!Array.isArray(data.features)) {
    throw new Error("Invalid GeoJSON: missing features array");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    for (const feature of data.features) {
      const name = feature.properties.display_name?.trim();
      if (!name) continue;

      const id = slugify(name);
      const type = inferZoneType(name);

      await client.query(
        `
        INSERT INTO zones (id, name, type, polygon_geojson)
        VALUES ($1, $2, $3, $4::jsonb)
        ON CONFLICT (id)
        DO UPDATE SET
          name = EXCLUDED.name,
          type = EXCLUDED.type,
          polygon_geojson = EXCLUDED.polygon_geojson
        `,
        [id, name, type, JSON.stringify(feature.geometry)]
      );
    }

    await client.query("COMMIT");
    console.log(`Imported ${data.features.length} zones successfully.`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});