/**
 * AuthPages — LoginPage + RegisterPage. Email/password via the auth store;
 * Google OAuth button shown when the backend reports it's configured.
 */

import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError } from '../lib/api';
import { useAuth } from '../stores/auth';

function AuthShell({ title, children, footer }: { title: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      <div className="mt-6 rounded-xl border border-surface-3 bg-surface-1 p-5">{children}</div>
      <p className="mt-4 text-center text-sm text-ink-muted">{footer}</p>
    </div>
  );
}

const inputClass =
  'w-full rounded-md border border-surface-3 bg-surface-0 px-3 py-2 text-sm text-ink placeholder:text-ink-muted/60 focus:border-accent focus:outline-none';

function GoogleButton() {
  const googleEnabled = useAuth((s) => s.googleEnabled);
  if (!googleEnabled) return null;
  return (
    <>
      <a
        href="/api/auth/google"
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-surface-3 bg-surface-2 px-3 py-2 text-sm text-ink hover:bg-surface-3"
      >
        Continue with Google
      </a>
      <div className="my-4 flex items-center gap-3 text-xs text-ink-muted">
        <span className="h-px flex-1 bg-surface-3" />
        or
        <span className="h-px flex-1 bg-surface-3" />
      </div>
    </>
  );
}

export function LoginPage() {
  const login = useAuth((s) => s.login);
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed — is the backend running?');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Sign in"
      footer={
        <>
          No account?{' '}
          <Link to="/register" className="text-accent hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <GoogleButton />
      <form onSubmit={(e) => void submit(e)} className="space-y-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          autoComplete="email"
          className={inputClass}
        />
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoComplete="current-password"
          className={inputClass}
        />
        {error && <p className="text-xs text-danger">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md border border-accent/40 bg-accent/20 px-3 py-2 text-sm text-accent hover:bg-accent/30 disabled:opacity-50"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthShell>
  );
}

export function RegisterPage() {
  const register = useAuth((s) => s.register);
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await register(email, name, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Registration failed — is the backend running?');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Create account"
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="text-accent hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <GoogleButton />
      <form onSubmit={(e) => void submit(e)} className="space-y-3">
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          autoComplete="name"
          className={inputClass}
        />
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          autoComplete="email"
          className={inputClass}
        />
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password (min 8 characters)"
          autoComplete="new-password"
          className={inputClass}
        />
        {error && <p className="text-xs text-danger">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md border border-accent/40 bg-accent/20 px-3 py-2 text-sm text-accent hover:bg-accent/30 disabled:opacity-50"
        >
          {busy ? 'Creating…' : 'Create account'}
        </button>
      </form>
    </AuthShell>
  );
}
