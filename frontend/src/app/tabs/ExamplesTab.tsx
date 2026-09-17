/**
 * ExamplesTab — worked examples with narration; "Load" pushes the example's
 * input into the visualizer.
 */

import type { AlgorithmDefinition } from '../../engine/definition';
import { usePlayback } from '../../stores/playback';

export function ExamplesTab({ def }: { def: AlgorithmDefinition }) {
  const load = usePlayback((s) => s.load);

  if (def.examples.length === 0) {
    return <p className="text-sm text-ink-muted">No worked examples yet.</p>;
  }

  return (
    <div className="space-y-4">
      {def.examples.map((ex) => (
        <div key={ex.title} className="rounded-lg border border-surface-3 bg-surface-0/40 p-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-medium text-ink">{ex.title}</h3>
            <button
              onClick={() => load(def.id, ex.input)}
              className="rounded-md bg-accent/20 border border-accent/40 text-accent px-2.5 py-1 text-xs hover:bg-accent/30"
            >
              ▶ Load in visualizer
            </button>
          </div>
          <div className="mt-2 space-y-2 text-sm text-ink-muted">
            {ex.narration.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            Output: <code className="font-mono text-ink">{ex.output}</code>
          </p>
        </div>
      ))}
    </div>
  );
}
