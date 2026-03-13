import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';

import { fetchCases, updateCaseStatus } from '../api/complaints';
import type { ComplaintCase } from '../lib/types';

const columnHelper = createColumnHelper<ComplaintCase>();

export default function CasesPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    severity: '',
    assignedTeam: '',
  });

  const casesQuery = useQuery({
    queryKey: ['admin', 'cases', filters],
    queryFn: () => fetchCases(filters),
  });

  const statusMutation = useMutation({
    mutationFn: ({ caseId, status }: { caseId: string; status: ComplaintCase['status'] }) =>
      updateCaseStatus(caseId, status, `Updated from cases list to ${status}.`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'cases'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
    },
  });

  const columns = useMemo(
    () => [
      columnHelper.accessor('anonId', {
        header: 'Anon ID',
        cell: (info) => (
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-accent">{info.getValue()}</p>
            <p className="mt-1 text-sm font-semibold text-primary">{info.row.original.title}</p>
          </div>
        ),
      }),
      columnHelper.accessor('status', { header: 'Status' }),
      columnHelper.accessor('category', { header: 'Category' }),
      columnHelper.accessor('severity', { header: 'Severity' }),
      columnHelper.accessor('assignedTeam', {
        header: 'Assigned team',
        cell: (info) => info.getValue() ?? 'Unassigned',
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: (info) => (
          <div className="flex items-center gap-2">
            <Link
              className="rounded-full border border-primary px-3 py-1 text-xs font-semibold text-primary"
              to={`/cases/${info.row.original.id}`}
            >
              Open
            </Link>
            <button
              className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-white"
              onClick={() =>
                statusMutation.mutate({
                  caseId: info.row.original.id,
                  status: 'NEED_MORE_INFO',
                })
              }
            >
              Request info
            </button>
          </div>
        ),
      }),
    ],
    [statusMutation],
  );

  const table = useReactTable({
    data: casesQuery.data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-6">
      <header className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-panel">
        <h1 className="font-display text-3xl font-semibold text-primary">Cases</h1>
        <p className="mt-2 text-sm text-slate-500">
          Filter the intake queue and move cases through review, evidence requests, and action taken.
        </p>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {(['status', 'category', 'severity', 'assignedTeam'] as const).map((key) => (
            <input
              key={key}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none ring-0"
              placeholder={`Filter by ${key}`}
              value={filters[key]}
              onChange={(event) =>
                setFilters((current) => ({ ...current, [key]: event.target.value }))
              }
            />
          ))}
        </div>
      </header>

      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-panel">
        <table className="min-w-full divide-y divide-slate-200 text-left">
          <thead className="bg-slate-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-100">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-5 py-4 align-top text-sm text-slate-700">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
