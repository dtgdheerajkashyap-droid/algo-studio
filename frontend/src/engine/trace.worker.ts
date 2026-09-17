/**
 * Trace Web Worker — algorithm execution runs here, off the main thread
 * (spec §5: main thread stays at 60fps; zero network in the hot path).
 */

import { getAlgorithm } from './registry';
import { runTrace, type Trace } from './trace';
import type { AlgorithmInput } from './definition';

export interface TraceRequest {
  requestId: number;
  algorithmId: string;
  input?: AlgorithmInput;
}

export type TraceResponse =
  | { requestId: number; ok: true; trace: Trace }
  | { requestId: number; ok: false; error: string };

self.onmessage = (msg: MessageEvent<TraceRequest>) => {
  const { requestId, algorithmId, input } = msg.data;
  try {
    const def = getAlgorithm(algorithmId);
    if (!def) throw new Error(`Unknown algorithm: ${algorithmId}`);
    const trace = runTrace(def, input ?? def.defaultInput, {
      validate: import.meta.env.DEV,
    });
    const response: TraceResponse = { requestId, ok: true, trace };
    self.postMessage(response);
  } catch (err) {
    const response: TraceResponse = {
      requestId,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
    self.postMessage(response);
  }
};
