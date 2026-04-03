import { api } from './api';
import type { ComplaintDetail, ComplaintSummary } from '../types/complaints';

export async function getComplaints() {
  const { data } = await api.get<ComplaintSummary[]>('/admin/complaints');
  return data;
}

export async function getComplaintById(id: string) {
  const { data } = await api.get<ComplaintDetail>(
    `/admin/complaints/${encodeURIComponent(id)}`,
  );
  return data;
}

export async function updateComplaintStatus(
  id: string,
  payload: {
    status: string;
    assignedTeam?: string | null;
  },
) {
  const { data } = await api.patch(
    `/admin/complaints/${encodeURIComponent(id)}/status`,
    payload,
  );
  return data;
}

export async function getComplaintMessages(id: string) {
  const { data } = await api.get(
    `/admin/complaints/${encodeURIComponent(id)}/messages`,
  );
  return data;
}

export async function sendComplaintMessage(
  id: string,
  payload: {
    body: string;
    senderLabel?: string | null;
    requestCounseling?: boolean;
  },
) {
  const { data } = await api.post(
    `/admin/complaints/${encodeURIComponent(id)}/messages`,
    payload,
  );
  return data;
}


export async function getComplaintLogs(params?: {
  from?: string;
  to?: string;
}) {
  const { data } = await api.get('/admin/complaints/logs', {
    params,
  });
  return data;
}