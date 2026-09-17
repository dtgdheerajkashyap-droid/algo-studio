/**
 * PlaybackControls — video-style transport: play/pause, step, restart,
 * speed, scrubbable timeline, and live counters.
 */

import { usePlayback } from '../stores/playback';

const SPEEDS = [0.25, 0.5, 1, 2, 4];

function IconButton({
  onClick,
  title,
  children,
  disabled,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className="rounded-md bg-surface-2 hover:bg-surface-3 disabled:opacity-40 disabled:cursor-default px-3 py-1.5 text-sm text-ink transition-colors"
    >
      {children}
    </button>
  );
}

export function PlaybackControls() {
  const status = usePlayback((s) => s.status);
  const step = usePlayback((s) => s.step);
  const totalSteps = usePlayback((s) => s.totalSteps);
  const speed = usePlayback((s) => s.speed);
  const counters = usePlayback((s) => s.counters);
  const { play, pause, stepForward, stepBack, restart, seek, setSpeed } = usePlayback.getState();

  const ready = status === 'ready' || status === 'playing';
  const playing = status === 'playing';

  return (
    <div className="rounded-xl bg-surface-1 border border-surface-3 p-3 space-y-2.5">
      {/* Timeline */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-ink-muted tabular-nums whitespace-nowrap w-24">
          {step} / {totalSteps}
        </span>
        <input
          type="range"
          className="timeline"
          min={0}
          max={Math.max(totalSteps, 1)}
          value={step}
          disabled={!ready}
          onChange={(e) => {
            pause();
            seek(Number(e.target.value));
          }}
          aria-label="Timeline"
        />
      </div>

      {/* Transport + speed + counters */}
      <div className="flex flex-wrap items-center gap-2">
        <IconButton onClick={restart} title="Restart" disabled={!ready}>
          ⏮
        </IconButton>
        <IconButton onClick={stepBack} title="Step back" disabled={!ready || step === 0}>
          ⏴
        </IconButton>
        <IconButton
          onClick={playing ? pause : play}
          title={playing ? 'Pause' : 'Play'}
          disabled={!ready}
        >
          {playing ? '⏸ Pause' : '▶ Play'}
        </IconButton>
        <IconButton onClick={stepForward} title="Step forward" disabled={!ready || step >= totalSteps}>
          ⏵
        </IconButton>

        <div className="flex items-center gap-1 ml-2">
          {SPEEDS.map((sp) => (
            <button
              key={sp}
              onClick={() => setSpeed(sp)}
              className={`rounded px-2 py-1 text-xs transition-colors ${
                speed === sp ? 'bg-accent text-surface-0 font-semibold' : 'bg-surface-2 text-ink-muted hover:bg-surface-3'
              }`}
            >
              {sp}×
            </button>
          ))}
        </div>

        <div className="ml-auto flex gap-4 text-xs text-ink-muted tabular-nums">
          <span>
            compares <b className="text-ink">{counters.comparisons}</b>
          </span>
          <span>
            swaps <b className="text-ink">{counters.swaps}</b>
          </span>
          <span>
            writes <b className="text-ink">{counters.writes}</b>
          </span>
          <span>
            accesses <b className="text-ink">{counters.accesses}</b>
          </span>
        </div>
      </div>
    </div>
  );
}
