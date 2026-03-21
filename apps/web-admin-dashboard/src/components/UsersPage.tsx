import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createUser, deleteUser, fetchUsers, updateUser } from '../api/complaints';
import type { StaffRole } from '../lib/types';

export default function UsersPage() {
  const queryClient = useQueryClient();
  const usersQuery = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: fetchUsers,
  });
  const [form, setForm] = useState({
    email: '',
    password: '',
    role: 'GRIEVANCE' as StaffRole,
  });

  const createUserMutation = useMutation({
    mutationFn: () => createUser(form),
    onSuccess: () => {
      setForm({ email: '', password: '', role: 'GRIEVANCE' });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
  const toggleUserMutation = useMutation({
    mutationFn: ({
      userId,
      isActive,
    }: {
      userId: string;
      isActive: boolean;
    }) => updateUser(userId, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
  const deleteUserMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-panel">
        <h1 className="font-display text-3xl font-semibold text-primary">Staff users</h1>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <input
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            placeholder="Email"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
          />
          <input
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            placeholder="Temporary password"
            value={form.password}
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
          />
          <select
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            value={form.role}
            onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as StaffRole }))}
          >
            {['GRIEVANCE', 'DISCIPLINE', 'COUNSELOR', 'SUPER_ADMIN'].map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>
        <button
          className="mt-4 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white"
          onClick={() => createUserMutation.mutate()}
        >
          Create user
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {usersQuery.data?.map((user) => (
          <div key={user.id} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-panel">
            <p className="text-sm font-semibold text-primary">{user.email}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">{user.role}</p>
            <p className="mt-4 text-sm text-slate-500">{user.isActive ? 'Active' : 'Inactive'}</p>
            <div className="mt-5 flex gap-3">
              <button
                className="rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary"
                onClick={() =>
                  toggleUserMutation.mutate({ userId: user.id, isActive: !user.isActive })
                }
              >
                {user.isActive ? 'Deactivate' : 'Activate'}
              </button>
              <button
                className="rounded-full border border-accent px-4 py-2 text-sm font-semibold text-accent"
                onClick={() => deleteUserMutation.mutate(user.id)}
              >
                Delete
              </button>
            </div>
          </div>
        )) ?? <p className="text-sm text-slate-500">Loading users...</p>}
      </div>
    </div>
  );
}
