import { api } from './api';
import type { BuildingRow, ZoneImportPayload } from '../types/buildings';

export async function getBuildingsOccupancy() {
  const { data } = await api.get<BuildingRow[]>('/zones/occupancy');
  return data;
}

export async function importZones(payload: ZoneImportPayload) {
  const { data } = await api.post('/admin/zones/import', payload);
  return data;
}

export async function checkZoneIdExists(id: string) {
  const { data } = await api.get(`/admin/zones/check-id/${encodeURIComponent(id)}`);
  return data as { ok: boolean; exists: boolean; zone: { id: string; name: string } | null };
}

export async function updateZoneDetails(
  id: string,
  payload: {
    area_group: string;
    capacity: number;
    capacity_mode: string;
    description: string;
  },
) {
  const { data } = await api.patch(`/admin/zones/${encodeURIComponent(id)}/details`, payload);
  return data;
}

export async function deleteZone(id: string) {
  const { data } = await api.delete(`/admin/zones/${encodeURIComponent(id)}`);
  return data;
}