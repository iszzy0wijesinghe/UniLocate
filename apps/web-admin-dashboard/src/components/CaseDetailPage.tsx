import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  addInternalNote,
  assignCase,
  fetchCaseDetail,
  fetchUsers,
  requestAttachmentDownload,
  sendStaffMessage,
  updateCaseStatus,
} from '../api/complaints';

export default function CaseDetailPage() {
  const { id = '' } = useParams();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('IN_REVIEW');
  const [statusReason, setStatusReason] = useState('');
  const [message, setMessage] = useState('');
  const [note, setNote] = useState('');
  const [assignment, setAssignment] = useState({ assignedTeam: 'GRIEVANCE', assignedToUserId: '' });

  const caseQuery = useQuery({
    queryKey: ['admin', 'case', id],
    queryFn: () => fetchCaseDetail(id),
    enabled: Boolean(id),
  });
  const usersQuery = useQuery({
    queryKey: ['admin', 'users', 'for-assignment'],
    queryFn: fetchUsers,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'case', id] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'cases'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
  };

  const statusMutation = useMutation({
    mutationFn: () => updateCaseStatus(id, status as any, statusReason),
    onSuccess: invalidate,
  });
  const assignmentMutation = useMutation({
    mutationFn: () => assignCase(id, assignment.assignedToUserId, assignment.assignedTeam),
    onSuccess: invalidate,
  });
  const messageMutation = useMutation({
    mutationFn: () => sendStaffMessage(id, message),
    onSuccess: () => {
      setMessage('');
      invalidate();
    },
  });
  const noteMutation = useMutation({
    mutationFn: () => addInternalNote(id, note),
    onSuccess: () => {
      setNote('');
      invalidate();
    },
  });

  const detail = caseQuery.data;

  if (!detail) {
    return <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-panel">Loading case...</div>;
  }

  return (
    <div className="space-y-6">
      <header className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-panel">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-accent">{detail.case.anonId}</p>
            <h1 className="mt-2 font-display text-3xl font-semibold text-primary">{detail.case.title}</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">{detail.case.description}</p>
          </div>
          {detail.case.severity === 'CRITICAL' ? (
            <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-accent">
              Critical risk language detected
            </div>
          ) : null}
        </div>
      </header>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-6">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-panel">
            <h2 className="font-display text-2xl font-semibold text-primary">Student-visible thread</h2>
            <div className="mt-6 space-y-4">
              {detail.messages.map((messageItem) => (
                <div key={messageItem.id} className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-primary">{messageItem.senderLabel}</p>
                    <p className="text-xs text-slate-400">{new Date(messageItem.createdAt).toLocaleString()}</p>
                  </div>
                  <p className="mt-3 text-sm text-slate-700">{messageItem.body}</p>
                </div>
              ))}
            </div>

            <textarea
              className="mt-6 min-h-32 w-full rounded-3xl border border-slate-200 px-4 py-4 text-sm outline-none"
              placeholder="Send a response into the anonymous student thread"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
            <button
              className="mt-4 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white"
              onClick={() => messageMutation.mutate()}
            >
              Send staff message
            </button>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-panel">
            <h2 className="font-display text-2xl font-semibold text-primary">Internal notes</h2>
            <div className="mt-6 space-y-3">
              {detail.internalNotes.map((noteItem) => (
                <div key={noteItem.id} className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                  <p>{noteItem.body}</p>
                  <p className="mt-2 text-xs text-slate-400">{new Date(noteItem.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>

            <textarea
              className="mt-6 min-h-28 w-full rounded-3xl border border-slate-200 px-4 py-4 text-sm outline-none"
              placeholder="Add an internal note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
            <button
              className="mt-4 rounded-full border border-primary px-5 py-3 text-sm font-semibold text-primary"
              onClick={() => noteMutation.mutate()}
            >
              Save internal note
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-panel">
            <h2 className="font-display text-2xl font-semibold text-primary">Case controls</h2>
            <div className="mt-6 space-y-3">
              <select
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                {['NEW', 'IN_REVIEW', 'NEED_MORE_INFO', 'ACTION_TAKEN', 'CLOSED'].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <input
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                placeholder="Why is the status changing?"
                value={statusReason}
                onChange={(event) => setStatusReason(event.target.value)}
              />
              <button
                className="w-full rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white"
                onClick={() => statusMutation.mutate()}
              >
                Update status
              </button>
            </div>

            <div className="mt-8 space-y-3">
              <select
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                value={assignment.assignedTeam}
                onChange={(event) =>
                  setAssignment((current) => ({ ...current, assignedTeam: event.target.value }))
                }
              >
                {['GRIEVANCE', 'DISCIPLINE', 'COUNSELING'].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <select
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                value={assignment.assignedToUserId}
                onChange={(event) =>
                  setAssignment((current) => ({ ...current, assignedToUserId: event.target.value }))
                }
              >
                <option value="">Select staff member</option>
                {usersQuery.data?.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.email} ({user.role})
                  </option>
                ))}
              </select>
              <button
                className="w-full rounded-full border border-primary px-5 py-3 text-sm font-semibold text-primary"
                onClick={() => assignmentMutation.mutate()}
              >
                Assign case
              </button>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-panel">
            <h2 className="font-display text-2xl font-semibold text-primary">Attachments</h2>
            <div className="mt-6 space-y-3">
              {detail.attachments.map((attachment) => (
                <button
                  key={attachment.id}
                  className="flex w-full items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-left"
                  onClick={async () => {
                    const result = await requestAttachmentDownload(id, attachment.id);
                    window.open(result.downloadUrl, '_blank', 'noopener,noreferrer');
                  }}
                >
                  <span>
                    <span className="block text-sm font-semibold text-primary">{attachment.originalName}</span>
                    <span className="mt-1 block text-xs text-slate-500">{attachment.mimeType}</span>
                  </span>
                  <span className="text-xs font-semibold text-accent">Download</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-panel">
            <h2 className="font-display text-2xl font-semibold text-primary">Audit trail</h2>
            <div className="mt-6 space-y-3">
              {detail.auditLogs.map((log) => (
                <div key={log.id} className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-sm font-semibold capitalize text-primary">
                    {log.action.replaceAll('_', ' ')}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{new Date(log.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
