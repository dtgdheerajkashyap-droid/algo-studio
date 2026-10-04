/**
 * PracticeTab — problem statement + Monaco editor with starter code, and
 * submission via the backend (Judge0 + AI grader). Submitting requires
 * sign-in; editing works in guest mode.
 */

import { useMemo, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Link } from 'react-router-dom';
import type { AlgorithmDefinition, Language } from '../../engine/definition';
import { api, ApiError } from '../../lib/api';
import { useAuth } from '../../stores/auth';

const MONACO_LANG: Record<Language, string> = { cpp: 'cpp', java: 'java', python: 'python' };
const LANG_LABEL: Record<Language, string> = { cpp: 'C++', java: 'Java', python: 'Python' };

interface TestResult {
  label: string | null;
  passed: boolean;
  hidden: boolean;
  output?: string;
  expected?: string;
}

interface SubmissionResult {
  status: 'accepted' | 'wrong-answer' | 'error';
  results: TestResult[];
  ai_feedback: string | null;
}

export function PracticeTab({ def }: { def: AlgorithmDefinition }) {
  const user = useAuth((s) => s.user);
  const [lang, setLang] = useState<Language>('python');
  const [code, setCode] = useState<Record<Language, string>>(() => ({ ...def.problem.starters }));
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const samples = useMemo(() => def.problem.tests.filter((t) => !t.hidden), [def]);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      // Generous timeout: tests (up to 5s each) + compile + AI feedback.
      const res = await api.post<SubmissionResult>(
        '/submissions',
        { algorithm_id: def.id, language: lang, code: code[lang] },
        { timeoutMs: 120_000 },
      );
      setResult(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Submission failed — is the backend running?');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="text-sm leading-relaxed text-ink">{def.problem.statement}</div>
      <p className="text-xs text-ink-muted">
        Expected complexity: <code className="font-mono text-ink">{def.problem.expectedBigO}</code> · Signature:{' '}
        <code className="font-mono text-ink">{def.problem.signatures[lang]}</code>
      </p>

      {samples.length > 0 && (
        <div className="rounded-lg border border-surface-3 bg-surface-0/40 p-2.5 text-xs">
          <span className="uppercase tracking-wide text-ink-muted">Samples</span>
          <div className="mt-1.5 space-y-1 font-mono">
            {samples.map((t) => (
              <div key={t.label ?? t.input} className="flex gap-3">
                <span className="text-ink-muted">in:</span>
                <span className="text-ink">{t.input || '(empty)'}</span>
                <span className="text-ink-muted">out:</span>
                <span className="text-ink">{t.expected || '(empty)'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-1">
        {(Object.keys(LANG_LABEL) as Language[]).map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={`rounded-md px-3 py-1 text-xs transition-colors ${
              lang === l ? 'bg-accent text-surface-0 font-medium' : 'bg-surface-2 text-ink-muted hover:bg-surface-3'
            }`}
          >
            {LANG_LABEL[l]}
          </button>
        ))}
        <button
          onClick={() => setCode((c) => ({ ...c, [lang]: def.problem.starters[lang] }))}
          className="ml-auto rounded-md bg-surface-2 px-3 py-1 text-xs text-ink-muted hover:bg-surface-3"
        >
          Reset
        </button>
      </div>

      <div className="min-h-[260px] flex-1 overflow-hidden rounded-lg border border-surface-3">
        <Editor
          language={MONACO_LANG[lang]}
          value={code[lang]}
          onChange={(v) => setCode((c) => ({ ...c, [lang]: v ?? '' }))}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            scrollBeyondLastLine: false,
            lineNumbersMinChars: 3,
            tabSize: 4,
          }}
        />
      </div>

      {user ? (
        <button
          onClick={() => void submit()}
          disabled={submitting}
          className="rounded-md bg-accent/20 border border-accent/40 text-accent px-4 py-2 text-sm hover:bg-accent/30 disabled:opacity-50"
        >
          {submitting ? 'Running tests…' : 'Submit'}
        </button>
      ) : (
        <p className="text-sm text-ink-muted">
          <Link to="/login" className="text-accent hover:underline">
            Sign in
          </Link>{' '}
          to submit and track progress.
        </p>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      {result && (
        <div className="rounded-lg border border-surface-3 bg-surface-0/40 p-3 text-sm">
          <p
            className={
              result.status === 'accepted' ? 'font-medium text-ok' : result.status === 'wrong-answer' ? 'font-medium text-warn' : 'font-medium text-danger'
            }
          >
            {result.status === 'accepted' ? '✓ Accepted' : result.status === 'wrong-answer' ? '✗ Wrong answer' : '✗ Error'}
          </p>
          <ul className="mt-2 space-y-1 text-xs">
            {result.results.map((t, i) => (
              <li key={i} className={t.passed ? 'text-ok' : 'text-danger'}>
                {t.passed ? '✓' : '✗'} {t.label ?? `test ${i + 1}`}
                {!t.passed && !t.hidden && t.expected !== undefined && (
                  <span className="ml-2 font-mono text-ink-muted">
                    expected “{t.expected}”, got “{t.output ?? ''}”
                  </span>
                )}
              </li>
            ))}
          </ul>
          {result.ai_feedback && (
            <div className="mt-3 border-t border-surface-3 pt-2 text-ink-muted">
              <span className="text-xs uppercase tracking-wide">AI feedback</span>
              <p className="mt-1 leading-relaxed text-ink">{result.ai_feedback}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
