/**
 * AlgorithmPage — the heart of the app: 3D visualizer + playback on the
 * left, tabbed learning panel (Solution / Examples / Complexity / Practice /
 * AI Tutor) on the right.
 */

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getAlgorithm } from '../engine/registry';
import { usePlayback } from '../stores/playback';
import { Visualizer } from '../viz/Visualizer';
import { PlaybackControls } from '../viz/PlaybackControls';
import { InputPanel } from '../viz/InputPanel';
import { SolutionTab } from './tabs/SolutionTab';
import { ExamplesTab } from './tabs/ExamplesTab';
import { ComplexityTab } from './tabs/ComplexityTab';
import { PracticeTab } from './tabs/PracticeTab';
import { TutorTab } from './tabs/TutorTab';

const TABS = ['Solution', 'Examples', 'Complexity', 'Practice', 'AI Tutor'] as const;
type Tab = (typeof TABS)[number];

export function AlgorithmPage() {
  const { id } = useParams<{ id: string }>();
  const def = id ? getAlgorithm(id) : undefined;
  const load = usePlayback((s) => s.load);
  const [tab, setTab] = useState<Tab>('Solution');

  useEffect(() => {
    if (def) load(def.id);
  }, [def, load]);

  if (!def) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Algorithm not found</h1>
        <p className="mt-2 text-sm text-ink-muted">
          No algorithm with id “{id}”.{' '}
          <Link to="/" className="text-accent hover:underline">
            Back to catalog
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full max-w-[1600px] flex-col gap-3 px-4 py-4 lg:flex-row">
      {/* Left: visualizer column */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 lg:w-3/5">
        <div>
          <div className="flex items-baseline gap-3">
            <h1 className="text-xl font-semibold tracking-tight">{def.name}</h1>
            <span className="font-mono text-sm text-ink-muted">{def.bigO}</span>
          </div>
          <p className="mt-0.5 text-sm text-ink-muted">{def.summary}</p>
        </div>
        <InputPanel def={def} />
        <div className="min-h-[320px] flex-1">
          <Visualizer />
        </div>
        <PlaybackControls />
      </div>

      {/* Right: learning panel */}
      <div className="flex min-h-0 flex-col rounded-xl border border-surface-3 bg-surface-1 lg:w-2/5">
        <div className="flex gap-1 border-b border-surface-3 p-2">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                tab === t ? 'bg-surface-3 text-ink' : 'text-ink-muted hover:bg-surface-2 hover:text-ink'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-3">
          {tab === 'Solution' && <SolutionTab def={def} />}
          {tab === 'Examples' && <ExamplesTab def={def} />}
          {tab === 'Complexity' && <ComplexityTab def={def} />}
          {tab === 'Practice' && <PracticeTab def={def} />}
          {tab === 'AI Tutor' && <TutorTab def={def} />}
        </div>
      </div>
    </div>
  );
}
