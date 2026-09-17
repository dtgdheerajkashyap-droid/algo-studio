/**
 * ComplexityTab — Big-O table, stability, space, and the intuition paragraph.
 */

import type { AlgorithmDefinition } from '../../engine/definition';

export function ComplexityTab({ def }: { def: AlgorithmDefinition }) {
  const c = def.complexity;
  return (
    <div className="space-y-4 text-sm">
      <table className="w-full text-left">
        <thead>
          <tr className="text-xs uppercase tracking-wide text-ink-muted">
            <th className="pb-2 font-medium">Case</th>
            <th className="pb-2 font-medium">Time</th>
          </tr>
        </thead>
        <tbody className="font-mono">
          <tr className="border-t border-surface-3">
            <td className="py-1.5 font-sans text-ink-muted">Best</td>
            <td className="text-ok">{c.time.best}</td>
          </tr>
          <tr className="border-t border-surface-3">
            <td className="py-1.5 font-sans text-ink-muted">Average</td>
            <td className="text-warn">{c.time.average}</td>
          </tr>
          <tr className="border-t border-surface-3">
            <td className="py-1.5 font-sans text-ink-muted">Worst</td>
            <td className="text-danger">{c.time.worst}</td>
          </tr>
          <tr className="border-t border-surface-3">
            <td className="py-1.5 font-sans text-ink-muted">Space</td>
            <td className="text-ink">{c.space}</td>
          </tr>
          {c.stable !== undefined && (
            <tr className="border-t border-surface-3">
              <td className="py-1.5 font-sans text-ink-muted">Stable</td>
              <td className="font-sans text-ink">{c.stable ? 'Yes' : 'No'}</td>
            </tr>
          )}
        </tbody>
      </table>

      <div>
        <h3 className="text-xs uppercase tracking-wide text-ink-muted">Intuition</h3>
        <p className="mt-1.5 leading-relaxed text-ink">{c.intuition}</p>
      </div>

      <div>
        <h3 className="text-xs uppercase tracking-wide text-ink-muted">Real-world use</h3>
        <p className="mt-1.5 leading-relaxed text-ink">{def.realWorldUse}</p>
      </div>
    </div>
  );
}
