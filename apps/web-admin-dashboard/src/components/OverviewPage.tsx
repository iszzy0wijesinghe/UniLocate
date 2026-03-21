import { useQuery } from '@tanstack/react-query';

import { fetchOverview } from '../api/complaints';

export default function OverviewPage() {
  const overviewQuery = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: fetchOverview,
  });

  const overview = overviewQuery.data;

  return (
    <div className="space-y-6">
      <header className="rounded-[28px] bg-primary px-8 py-8 text-white shadow-panel">
        <p className="text-xs uppercase tracking-[0.3em] text-white/60">Complaint operations</p>
        <h1 className="mt-3 font-display text-4xl font-semibold">
          Anonymous case command center
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-white/75">
          Review critical complaints, spot queues that need more information, and keep counselor
          escalation visible across the team.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          ['Total cases', overview?.totalCases ?? 0],
          ['New', overview?.newCases ?? 0],
          ['Critical', overview?.criticalCases ?? 0],
          ['Need more info', overview?.needMoreInfo ?? 0],
          ['Closed this week', overview?.closedThisWeek ?? 0],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-panel">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-3 font-display text-4xl font-semibold text-primary">{value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-panel">
          <h2 className="font-display text-2xl font-semibold text-primary">Recent activity</h2>
          <div className="mt-6 space-y-4">
            {overview?.recentActivity?.map((item) => (
              <div key={item.id} className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-sm font-semibold capitalize text-primary">
                  {item.action.replaceAll('_', ' ')}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Case: {item.caseId ?? 'system'} - {new Date(item.createdAt).toLocaleString()}
                </p>
              </div>
            )) ?? <p className="text-sm text-slate-500">Loading recent activity...</p>}
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-panel">
          <h2 className="font-display text-2xl font-semibold text-primary">Critical alerts</h2>
          <div className="mt-6 space-y-4">
            {overview?.criticalAlerts?.map((item) => (
              <div key={item.id} className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.2em] text-accent">{item.anonId}</p>
                <p className="mt-2 text-base font-semibold text-primary">{item.title}</p>
                <p className="mt-1 text-sm text-slate-600">{item.description}</p>
              </div>
            )) ?? <p className="text-sm text-slate-500">Loading critical alerts...</p>}
          </div>
        </div>
      </section>
    </div>
  );
}
