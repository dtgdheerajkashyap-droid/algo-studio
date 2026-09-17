/**
 * InputPanel — randomize / presets / custom input, validated against caps.
 */

import { useMemo, useState } from 'react';
import type { AlgorithmDefinition, AlgorithmInput, GraphInput, TreeOpsInput } from '../engine/definition';
import { TRACE_LIMITS } from '../engine/events';
import { usePlayback } from '../stores/playback';

function randomArray(n: number): number[] {
  return Array.from({ length: n }, () => Math.floor(Math.random() * 99) + 1);
}

export function InputPanel({ def }: { def: AlgorithmDefinition }) {
  const load = usePlayback((s) => s.load);
  const currentInput = usePlayback((s) => s.input);
  const [custom, setCustom] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const kind = def.defaultInput.kind;

  // Look up which preset label matches the currently-loaded input (for highlight).
  const computedActivePreset = useMemo(() => {
    if (activePreset) return activePreset;
    const match = def.presets.find((p) => JSON.stringify(p.input) === JSON.stringify(currentInput));
    return match ? match.label : null;
  }, [activePreset, def.presets, currentInput]);

  const applyCustom = () => {
    setError(null);
    setActivePreset(null);
    if (kind === 'array') {
      const parts = custom.trim().split(/[\s,]+/).filter(Boolean);
      const values = parts.map(Number);
      if (values.length === 0 || values.some((v) => !Number.isFinite(v))) {
        setError('Enter numbers separated by spaces or commas.');
        return;
      }
      if (values.length > TRACE_LIMITS.maxArraySize) {
        setError(`Max ${TRACE_LIMITS.maxArraySize} elements.`);
        return;
      }
      const input: AlgorithmInput = { kind: 'array', values };
      if (def.defaultInput.kind === 'array' && def.defaultInput.target !== undefined) {
        input.target = values[Math.floor(values.length / 2)];
      }
      load(def.id, input);
    } else if (kind === 'tree-ops') {
      // Format: "insert: 5 3 7 1 4   search: 3 4" — op: tokens followed by numbers
      const tokens = custom.trim().split(/\s+/).filter(Boolean);
      const ops: TreeOpsInput['ops'] = [];
      let cur: 'insert' | 'search' = 'insert';
      for (const tok of tokens) {
        if (tok === 'insert:' || tok === 'insert') cur = 'insert';
        else if (tok === 'search:' || tok === 'search') cur = 'search';
        else {
          const n = Number(tok);
          if (!Number.isFinite(n)) {
            setError('Use format: insert: 5 3 7   search: 4 8');
            return;
          }
          ops.push({ op: cur, value: Math.trunc(n) });
        }
      }
      if (ops.length === 0) {
        setError('Use format: insert: 5 3 7 — prefix groups with insert: or search:');
        return;
      }
      load(def.id, { kind: 'tree-ops', ops });
    }
  };

  const onPresetClick = (label: string, input: AlgorithmInput) => {
    setActivePreset(label);
    setError(null);
    load(def.id, input);
  };

  // Summary line for graph / tree-ops inputs
  let summary: string | null = null;
  const inp: AlgorithmInput = currentInput ?? def.defaultInput;
  if (inp.kind === 'graph') {
    const g = inp as GraphInput;
    const dir = g.directed ? 'directed' : 'undirected';
    const weighted = g.edges.some((e) => e[2] !== undefined);
    summary = `${dir}${weighted ? ', weighted' : ''} · ${g.nodes.length} nodes, ${g.edges.length} edges · start=${g.start ?? g.nodes[0]}`;
  } else if (inp.kind === 'tree-ops') {
    const t = inp as TreeOpsInput;
    const ni = t.ops.filter((o) => o.op === 'insert').length;
    const ns = t.ops.filter((o) => o.op === 'search').length;
    summary = `${ni} insert${ni === 1 ? '' : 's'} · ${ns} search${ns === 1 ? '' : 'es'}`;
  }

  return (
    <div className="rounded-xl bg-surface-1 border border-surface-3 p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-ink-muted">Input</span>
        {kind === 'array' && (
          <button
            onClick={() => {
              setActivePreset(null);
              load(def.id, { kind: 'array', values: randomArray(12) });
            }}
            className="rounded-md bg-surface-2 hover:bg-surface-3 px-3 py-1 text-xs text-ink"
          >
            🎲 Randomize
          </button>
        )}
        {def.presets.map((p) => {
          const isActive = computedActivePreset === p.label;
          return (
            <button
              key={p.label}
              onClick={() => onPresetClick(p.label, p.input)}
              className={`rounded-md px-3 py-1 text-xs transition-colors ${
                isActive
                  ? 'bg-accent/30 border border-accent/60 text-accent'
                  : 'bg-surface-2 hover:bg-surface-3 text-ink'
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {kind === 'array' && (
        <div className="flex gap-2">
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyCustom()}
            placeholder={`Custom values, e.g. 5 2 8 1 (max ${TRACE_LIMITS.maxArraySize})`}
            className="flex-1 rounded-md bg-surface-0 border border-surface-3 px-3 py-1.5 text-sm text-ink placeholder:text-ink-muted/60 focus:outline-none focus:border-accent"
          />
          <button
            onClick={applyCustom}
            className="rounded-md bg-accent/20 border border-accent/40 text-accent px-3 py-1.5 text-sm hover:bg-accent/30"
          >
            Apply
          </button>
        </div>
      )}

      {kind === 'tree-ops' && (
        <div className="flex gap-2">
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyCustom()}
            placeholder="insert: 5 3 7 1 4   search: 4 8"
            className="flex-1 rounded-md bg-surface-0 border border-surface-3 px-3 py-1.5 text-sm text-ink placeholder:text-ink-muted/60 focus:outline-none focus:border-accent"
          />
          <button
            onClick={applyCustom}
            className="rounded-md bg-accent/20 border border-accent/40 text-accent px-3 py-1.5 text-sm hover:bg-accent/30"
          >
            Apply
          </button>
        </div>
      )}

      {kind === 'graph' && (
        <div className="text-xs text-ink-muted">
          Graph algorithms: pick a preset above.{' '}
          <span className="text-ink">{summary ?? ''}</span>
        </div>
      )}
      {kind === 'tree-ops' && summary && (
        <div className="text-xs text-ink-muted">
          <span className="text-ink">{summary}</span> · custom parser accepts{' '}
          <code className="text-ink">insert:</code> / <code className="text-ink">search:</code> groups
        </div>
      )}

      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
