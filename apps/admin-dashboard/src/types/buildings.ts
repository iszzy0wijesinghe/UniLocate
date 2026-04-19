export type OccupancyStatus = 'Free' | 'Available' | 'Almost Full' | 'Crowded' | 'Unknown';

export type BuildingRow = {
  id: string;
  name: string;
  type: string;
  polygon_geojson: unknown;
  display_name: string;
  capacity: number;
  description: string;
  area_group: string;
  capacity_mode: string;
  current_count: number;
  status: OccupancyStatus;
};

export type ZoneImportPayload = {
  zones: Array<{
    id: string;
    name: string;
    type: string;
    polygon_geojson: unknown;
    details?: {
      display_name?: string | null;
      capacity?: number | null;
      description?: string | null;
      status_override?: string | null;
      area_group?: string | null;
      capacity_mode?: string | null;
    };
  }>;
};