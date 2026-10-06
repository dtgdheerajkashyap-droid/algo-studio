/**
 * AppLayout — top nav shell shared by all routes. Bootstraps the auth
 * session once on mount; guest mode keeps everything except dashboard /
 * submit / AI chat usable.
 */

import { useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { pageTitle } from '../lib/pageTitle';
import { useAuth } from '../stores/auth';

function navClass({ isActive }: { isActive: boolean }): string {
  return `rounded-md px-3 py-1.5 text-sm transition-colors ${
    isActive ? 'bg-surface-2 text-ink' : 'text-ink-muted hover:text-ink hover:bg-surface-1'
  }`;
}

export function AppLayout() {
  const user = useAuth((s) => s.user);
  const ready = useAuth((s) => s.ready);
  const { bootstrap, logout } = useAuth.getState();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    void bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.title = pageTitle(pathname);
  }, [pathname]);

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-4 border-b border-surface-3 bg-surface-1/60 px-4 py-2.5 backdrop-blur">
        <Link to="/" className="flex items-center gap-2 text-ink font-semibold tracking-tight">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-accent" />
          Algorithm Studio
        </Link>

        <nav className="flex items-center gap-1 ml-4">
          <NavLink to="/" end className={navClass}>
            Catalog
          </NavLink>
          <NavLink to="/dashboard" className={navClass}>
            Dashboard
          </NavLink>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {/* Render nothing until the session probe finishes, so signed-in
              users don't see a flash of "Sign in" on every page load. */}
          {!ready ? null : user ? (
            <>
              <span className="flex items-center gap-2 text-sm text-ink-muted">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="h-6 w-6 rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-3 text-[11px] text-ink">
                    {user.name.slice(0, 1).toUpperCase()}
                  </span>
                )}
                {user.name}
              </span>
              <button
                onClick={() => {
                  void logout().then(() => navigate('/'));
                }}
                className="rounded-md bg-surface-2 hover:bg-surface-3 px-3 py-1.5 text-sm text-ink"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="rounded-md px-3 py-1.5 text-sm text-ink-muted hover:text-ink">
                Sign in
              </Link>
              <Link
                to="/register"
                className="rounded-md bg-accent/20 border border-accent/40 text-accent px-3 py-1.5 text-sm hover:bg-accent/30"
              >
                Create account
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
