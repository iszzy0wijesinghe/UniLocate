import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useMutation } from '@tanstack/react-query';

import { login } from './api/complaints';
import AuditPage from './components/AuditPage';
import CaseDetailPage from './components/CaseDetailPage';
import CasesPage from './components/CasesPage';
import Layout from './components/Layout';
import OverviewPage from './components/OverviewPage';
import UsersPage from './components/UsersPage';
import { useAuthStore } from './store/useAuthStore';

const queryClient = new QueryClient();

function LoginPage() {
  const setSession = useAuthStore((state) => state.setSession);
  const mutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => login(email, password),
    onSuccess: (session) => setSession(session),
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-md rounded-[32px] border border-slate-200 bg-white p-8 shadow-panel">
        <p className="text-xs uppercase tracking-[0.3em] text-accent">Staff access</p>
        <h1 className="mt-3 font-display text-4xl font-semibold text-primary">Anonymous complaints</h1>
        <p className="mt-3 text-sm text-slate-500">
          Use seeded staff credentials from the API notes or create your own after logging in as Super Admin.
        </p>

        <form
          className="mt-8 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            mutation.mutate({
              email: String(formData.get('email') ?? ''),
              password: String(formData.get('password') ?? ''),
            });
          }}
        >
          <input
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            type="email"
            name="email"
            placeholder="grievance@unilocate.edu"
          />
          <input
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            type="password"
            name="password"
            placeholder="Password"
          />
          {mutation.isError ? (
            <p className="text-sm font-medium text-accent">
              {(mutation.error as Error).message || 'Login failed'}
            </p>
          ) : null}
          <button className="w-full rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white" type="submit">
            {mutation.isPending ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

function AppRoutes() {
  const hydrated = useAuthStore((state) => state.hydrated);
  const session = useAuthStore((state) => state.session);
  const hydrate = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!hydrated) {
    return <div className="flex min-h-screen items-center justify-center bg-surface text-primary">Loading...</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={session ? <Layout /> : <Navigate to="/login" replace />}>
        <Route index element={<OverviewPage />} />
        <Route path="cases" element={<CasesPage />} />
        <Route path="cases/:id" element={<CaseDetailPage />} />
        <Route
          path="users"
          element={
            session?.user.role === 'SUPER_ADMIN' ? <UsersPage /> : <Navigate to="/" replace />
          }
        />
        <Route
          path="audit"
          element={
            session?.user.role === 'SUPER_ADMIN' ? <AuditPage /> : <Navigate to="/" replace />
          }
        />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppRoutes />
    </QueryClientProvider>
  );
}
