/**
 * CatalogPage — algorithm cards from the registry, filterable by
 * category and difficulty. Everything works in guest mode.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ALGORITHMS } from '../engine/registry';
import type { Category, Difficulty } from '../engine/definition';

const CATEGORIES: { value: Category | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'sorting', label: 'Sorting' },
  { value: 'searching', label: 'Searching' },
  { value: 'graph', label: 'Graph' },
  { value: 'data-structure', label: 'Data structures' },
];

const DIFFICULTY_STYLE: Record<Difficulty, string> = {
  easy: 'text-ok border-ok/40 bg-ok/10',
  medium: 'text-warn border-warn/40 bg-warn/10',
  hard: 'text-danger border-danger/40 bg-danger/10',
};

export function CatalogPage() {
  const [category, setCategory] = useState<Category | 'all'>('all');

  const shown = useMemo(
    () => (category === 'all' ? ALGORITHMS : ALGORITHMS.filter((a) => a.category === category)),
    [category],
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Algorithms</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Pick an algorithm to watch it run in 3D, read reference solutions, and practice.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => setCategory(c.value)}
            className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
              category === c.value
                ? 'bg-accent text-surface-0 font-medium'
                : 'bg-surface-1 text-ink-muted hover:bg-surface-2 hover:text-ink'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((a) => (
          <Link
            key={a.id}
            to={`/algorithms/${a.id}`}
            className="group rounded-xl border border-surface-3 bg-surface-1 p-4 transition-colors hover:border-accent/50 hover:bg-surface-2"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-medium text-ink group-hover:text-accent transition-colors">{a.name}</h2>
              <span className="font-mono text-xs text-ink-muted">{a.bigO}</span>
            </div>
            <p className="mt-2 text-sm text-ink-muted line-clamp-3">{a.summary}</p>
            <div className="mt-3 flex items-center gap-2 text-[11px]">
              <span className="rounded-full border border-surface-3 bg-surface-2 px-2 py-0.5 capitalize text-ink-muted">
                {a.category.replace('-', ' ')}
              </span>
              <span className={`rounded-full border px-2 py-0.5 capitalize ${DIFFICULTY_STYLE[a.difficulty]}`}>
                {a.difficulty}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {shown.length === 0 && (
        <p className="mt-10 text-center text-sm text-ink-muted">No algorithms in this category yet.</p>
      )}
    </div>
  );
}
