/**
 * Visualizer — the r3f canvas: camera, lights, and the active scene.
 */

import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { usePlayback } from '../stores/playback';
import { ArrayScene } from './ArrayScene';
import { GraphScene } from './GraphScene';
import { ScatterScene } from './ScatterScene';
import { STATE_LEGEND } from './colors';
import type { ScatterInput } from '../engine/definition';

export function Visualizer() {
  const visState = usePlayback((s) => s.visState);
  const trace = usePlayback((s) => s.trace);
  const status = usePlayback((s) => s.status);
  const warning = usePlayback((s) => s.warning);

  return (
    <div className="relative h-full w-full rounded-xl overflow-hidden bg-surface-1 border border-surface-3">
      {status === 'loading' && (
        <div className="absolute inset-0 z-10 flex items-center justify-center text-ink-muted">
          Generating trace…
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 z-10 flex items-center justify-center text-danger px-8 text-center">
          {usePlayback.getState().error}
        </div>
      )}
      {warning && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 rounded-md bg-warn/20 border border-warn/50 text-warn text-xs px-3 py-1">
          {warning}
        </div>
      )}

      <Canvas camera={{ position: [0, 7, 14], fov: 45 }} dpr={[1, 2]}>
        <ambientLight intensity={0.55} />
        <directionalLight position={[6, 12, 8]} intensity={1.1} />
        <directionalLight position={[-6, 4, -6]} intensity={0.35} />
        {visState?.array && <ArrayScene vis={visState} />}
        {visState?.graph && trace && trace.input.kind !== 'array' && trace.input.kind !== 'scatter' && (
          <GraphScene vis={visState} input={trace.input} />
        )}
        {visState?.scatter && trace && trace.input.kind === 'scatter' && (
          <ScatterScene vis={visState} input={trace.input as ScatterInput} />
        )}
        <OrbitControls makeDefault enableDamping dampingFactor={0.1} />
      </Canvas>

      {/* Legend */}
      <div className="absolute bottom-2 left-2 z-10 flex gap-3 rounded-md bg-surface-0/80 px-3 py-1.5 text-[11px] text-ink-muted backdrop-blur">
        {STATE_LEGEND.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>

      {/* Narration strip */}
      {visState?.narration && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 max-w-[80%] rounded-md bg-surface-0/85 px-4 py-1.5 text-sm text-ink backdrop-blur">
          {visState.narration}
        </div>
      )}

      {/* Frontier (queue/stack/PQ) readout */}
      {visState?.graph?.frontier && (
        <div className="absolute top-2 right-2 z-10 rounded-md bg-surface-0/85 px-3 py-1.5 text-xs text-ink-muted backdrop-blur">
          <span className="uppercase tracking-wide mr-2 text-[10px]">{visState.graph.frontier.kind}</span>
          {visState.graph.frontier.items.length > 0 ? (
            <span className="font-mono text-ink">[{visState.graph.frontier.items.join(', ')}]</span>
          ) : (
            <span className="italic">empty</span>
          )}
        </div>
      )}
    </div>
  );
}
