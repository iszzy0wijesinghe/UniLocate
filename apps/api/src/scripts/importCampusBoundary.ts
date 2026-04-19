import fs from "fs";
import path from "path";
import "dotenv/config";
import { pool } from "../db";

type GeoJsonFeatureCollection = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties?: Record<string, unknown>;
    geometry: {
      type: "Polygon" | "MultiPolygon";
      coordinates: unknown;
    };
  }>;
};

async function run() {
  const geojsonPath = path.resolve(process.cwd(), "../../campus_boundary.geojson");

  if (!fs.existsSync(geojsonPath)) {
    throw new Error(`GeoJSON file not found at: ${geojsonPath}`);
  }

  const raw = fs.readFileSync(geojsonPath, "utf-8");
  const data = JSON.parse(raw) as GeoJsonFeatureCollection;

  if (!Array.isArray(data.features) || data.features.length === 0) {
    throw new Error("No boundary feature found in GeoJSON");
  }

  const feature = data.features[0];

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `
      INSERT INTO boundaries (id, name, polygon_geojson)
      VALUES ($1, $2, $3::jsonb)
      ON CONFLICT (id)
      DO UPDATE SET
        name = EXCLUDED.name,
        polygon_geojson = EXCLUDED.polygon_geojson
      `,
      ["campus_boundary", "Campus Boundary", JSON.stringify(feature.geometry)]
    );

    await client.query("COMMIT");
    console.log("Campus boundary imported successfully.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error("Boundary import failed:", err);
  process.exit(1);
});