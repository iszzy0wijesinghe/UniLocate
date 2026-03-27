import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import { useAuthStore } from '../store/useAuthStore';

const navItems = [
  { to: '/', label: 'Overview' },
  { to: '/cases', label: 'Cases' },
  { to: '/users', label: 'Users', superAdminOnly: true },
  { to: '/audit', label: 'Audit', superAdminOnly: true },
];

export default function Layout() {
  const navigate = useNavigate();
  const session = useAuthStore((state) => state.session);
  const setSession = useAuthStore((state) => state.setSession);

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-surface text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-7xl gap-6 px-4 py-6 lg:px-8">
        <aside className="w-full max-w-xs rounded-[28px] border border-slate-200 bg-white p-6 shadow-panel">
          <p className="font-display text-2xl font-semibold text-primary">UniLocate</p>
          <p className="mt-2 text-sm text-slate-500">Anonymous complaints operations</p>

          <div className="mt-8 space-y-2">
            {navItems
              .filter((item) => !item.superAdminOnly || session.user.role === 'SUPER_ADMIN')
              .map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `block rounded-2xl px-4 py-3 text-sm font-medium transition ${
                      isActive
                        ? 'bg-primary text-white'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-primary'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
          </div>

          <div className="mt-10 rounded-2xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Signed in as</p>
            <p className="mt-2 text-sm font-semibold text-primary">{session.user.email}</p>
            <p className="mt-1 text-xs text-slate-500">{session.user.role}</p>
            <button
              className="mt-4 w-full rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white"
              onClick={() => {
                setSession(null);
                navigate('/login');
              }}
            >
              Sign out
            </button>
          </div>
        </aside>

        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
