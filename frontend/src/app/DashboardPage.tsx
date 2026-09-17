/**
 * DashboardPage — per-user progress: solved problems, recent submissions.
 * Requires sign-in; degrades gracefully when the backend is down.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ALGORITHMS } from '../engine/registry';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../stores/auth';

interface SubmissionSummary {
  id: number;
  algorithm_id: string;
  language: string;
  status: 'accepted' | 'wrong-answer' | 'error';
  created_at: string;
}

interface Progress {
  solved_algorithm_ids: string[];
  submissions: SubmissionSummary[];
}

const STATUS_STYLE: Record<SubmissionSummary['status'], string> = {
  accepted: 'text-ok',
  'wrong-answer': 'text-warn',
  error: 'text-danger',
};

export function DashboardPage() {
  const user = useAuth((s) => s.user);
  const ready = useAuth((s) => s.ready);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    api
      .get<Progress>('/progress')
      .then((p) => {
        if (!cancelled) setProgress(p);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof ApiError ? e.message : 'Could not load progress — is the backend running?');
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!ready) return null;

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="mt-2 text-sm text-ink-muted">
          <Link to="/login" className="text-accent hover:underline">
            Sign in
          </Link>{' '}
          to track which problems you've solved and review past submissions.
        </p>
      </div>
    );
  }

  const solved = new Set(progress?.solved_algorithm_ids ?? []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {user.name}</h1>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      {/* Progress overview */}
      <section className="mt-6">
        <h2 className="text-xs uppercase tracking-wide text-ink-muted">
          Progress · {solved.size} / {ALGORITHMS.length} solved
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {ALGORITHMS.map((a) => (
            <Link
              key={a.id}
              to={`/algorithms/${a.id}`}
              className="flex items-center justify-between rounded-lg border border-surface-3 bg-surface-1 px-3 py-2.5 text-sm hover:bg-surface-2"
            >
              <span className="text-ink">{a.name}</span>
              {solved.has(a.id) ? (
                <span className="text-xs text-ok">✓ Solved</span>
              ) : (
                <span className="text-xs text-ink-muted">Not yet</span>
              )}
            </Link>
          ))}
        </div>
      </section>

      {/* Recent submissions */}
      <section className="mt-8">
        <h2 className="text-xs uppercase tracking-wide text-ink-muted">Recent submissions</h2>
        {progress && progress.submissions.length === 0 && (
          <p className="mt-3 text-sm text-ink-muted">No submissions yet — pick an algorithm and try the Practice tab.</p>
        )}
        {progress && progress.submissions.length > 0 && (
          <table className="mt-3 w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-ink-muted">
                <th className="pb-2 font-medium">Algorithm</th>
                <th className="pb-2 font-medium">Language</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {progress.submissions.map((s) => (
                <tr key={s.id} className="border-t border-surface-3">
                  <td className="py-2">
                    <Link to={`/algorithms/${s.algorithm_id}`} className="text-accent hover:underline">
                      {ALGORITHMS.find((a) => a.id === s.algorithm_id)?.name ?? s.algorithm_id}
                    </Link>
                  </td>
                  <td className="py-2 text-ink-muted">{s.language}</td>
                  <td className={`py-2 ${STATUS_STYLE[s.status]}`}>{s.status}</td>
                  <td className="py-2 text-ink-muted">{new Date(s.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
