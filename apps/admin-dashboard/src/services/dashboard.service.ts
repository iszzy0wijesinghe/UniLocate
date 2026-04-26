import { api } from './api';

export type DashboardSummary = {
  totalBuildings: number;
  overcrowdedBuildings: number;
  warningBuildings: number;
  totalLostFoundPosts: number;
  lostPosts: number;
  foundPosts: number;
  lostItemReportsToday: number;
  totalUsers: number;
  totalComplaints: number;
  activeComplaints: number;
};

export async function getDashboardSummary() {
  const { data } = await api.get<DashboardSummary>('/admin/dashboard/summary');
  return data;
}

export async function getOccupancyZones() {
  const { data } = await api.get('/zones/occupancy');
  return data;
}