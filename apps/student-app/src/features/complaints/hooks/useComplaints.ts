import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createComplaint,
  fetchComplaintById,
  fetchComplaintMessages,
  fetchStoredComplaints,
  reconnectComplaint,
  requestCounseling,
  sendChatMessage,
  submitIdentityDisclosure,
} from '../complaints.api';
import type {
  CreateComplaintInput,
  IdentityDisclosureInput,
  ReconnectComplaintInput,
  SendMessageInput,
} from '../types/complaints';
import { useComplaintSessionStore } from '../state/useComplaintSessionStore';

export const complaintQueryKeys = {
  sessions: ['complaints', 'sessions'] as const,
  detail: (caseId: string) => ['complaints', 'detail', caseId] as const,
  messages: (caseId: string) => ['complaints', 'messages', caseId] as const,
};

export function useHydrateComplaintSessions() {
  const hydrate = useComplaintSessionStore((state) => state.hydrate);

  useEffect(() => {
    hydrate().catch(() => undefined);
  }, [hydrate]);
}

export function useComplaintCases() {
  const sessions = useComplaintSessionStore((state) => state.sessions);

  return useQuery({
    queryKey: [...complaintQueryKeys.sessions, sessions.map((entry) => entry.caseId).join('|')],
    queryFn: fetchStoredComplaints,
  });
}

export function useComplaintDetail(caseId: string) {
  return useQuery({
    queryKey: complaintQueryKeys.detail(caseId),
    queryFn: () => fetchComplaintById(caseId),
    refetchInterval: 15_000,
  });
}

export function useComplaintMessages(caseId: string) {
  return useQuery({
    queryKey: complaintQueryKeys.messages(caseId),
    queryFn: () => fetchComplaintMessages(caseId),
    refetchInterval: 10_000,
  });
}

export function useCreateComplaintMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateComplaintInput) => createComplaint(payload),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: complaintQueryKeys.sessions });
      queryClient.setQueryData(complaintQueryKeys.detail(result.complaint.id), result.complaint);
      queryClient.setQueryData(complaintQueryKeys.messages(result.complaint.id), result.complaint.messages);
    },
  });
}

export function useReconnectComplaintMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ReconnectComplaintInput) => reconnectComplaint(payload),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: complaintQueryKeys.sessions });
      queryClient.setQueryData(complaintQueryKeys.detail(result.complaint.id), result.complaint);
      queryClient.setQueryData(complaintQueryKeys.messages(result.complaint.id), result.complaint.messages);
    },
  });
}

export function useSendComplaintMessageMutation(caseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SendMessageInput) => sendChatMessage(caseId, payload),
    onSuccess: (result) => {
      queryClient.setQueryData(complaintQueryKeys.detail(caseId), result.complaint);
      queryClient.setQueryData(complaintQueryKeys.messages(caseId), result.messages);
      queryClient.invalidateQueries({ queryKey: complaintQueryKeys.sessions });
    },
  });
}

export function useRequestCounselingMutation(caseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => requestCounseling(caseId),
    onSuccess: (result) => {
      queryClient.setQueryData(complaintQueryKeys.detail(caseId), result.complaint);
      queryClient.setQueryData(complaintQueryKeys.messages(caseId), result.messages);
      queryClient.invalidateQueries({ queryKey: complaintQueryKeys.sessions });
    },
  });
}

export function useIdentityDisclosureMutation(caseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: IdentityDisclosureInput) => submitIdentityDisclosure(caseId, payload),
    onSuccess: (result) => {
      queryClient.setQueryData(complaintQueryKeys.detail(caseId), result.complaint);
      queryClient.invalidateQueries({ queryKey: complaintQueryKeys.sessions });
    },
  });
}
