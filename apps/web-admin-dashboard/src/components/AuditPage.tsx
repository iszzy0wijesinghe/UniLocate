import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { fetchAudit } from '../api/complaints';

export default function AuditPage() {
  const [filters, setFilters] = useState({
    caseId: '',
    actorUserId: '',
    action: '',
    from: '',
    to: '',
  });

  const auditQuery = useQuery({
    queryKey: ['admin', 'audit', filters],
    queryFn: () => fetchAudit(filters),
  });

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-panel">
        <h1 className="font-display text-3xl font-semibold text-primary">Audit</h1>
        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {(['caseId', 'actorUserId', 'action', 'from', 'to'] as const).map((key) => (
            <input
              key={key}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              placeholder={key}
              value={filters[key]}
              onChange={(event) =>
                setFilters((current) => ({ ...current, [key]: event.target.value }))
              }
            />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {auditQuery.data?.map((item) => (
          <div key={item.id} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-panel">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold capitalize text-primary">
                {item.action.replaceAll('_', ' ')}
              </p>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                {new Date(item.createdAt).toLocaleString()}
              </p>
            </div>
            <p className="mt-2 text-sm text-slate-600">Case: {item.caseId ?? 'system'}</p>
            <pre className="mt-4 overflow-auto rounded-2xl bg-slate-50 p-4 text-xs text-slate-600">
              {JSON.stringify(item.meta, null, 2)}
            </pre>
          </div>
        )) ?? <p className="text-sm text-slate-500">Loading audit logs...</p>}
      </div>
    </div>
  );
}
