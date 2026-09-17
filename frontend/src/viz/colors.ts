/**
 * Vibrant neon state palette shared by array and graph scenes.
 * Hues are kept far apart (cyan / amber / magenta / green) so states stay
 * distinguishable for colorblind users even at full saturation.
 */

import type { CellState, CentroidState, EdgeState, LineState, NodeState, PointState } from '../engine/visstate';

export const CELL_COLORS: Record<CellState, string> = {
  default: '#5d6b8f',
  comparing: '#ffb020', // hot amber — being compared
  swapping: '#ff4d8f', // neon pink — in motion
  sorted: '#2dd4a7', // emerald — finalized
  current: '#38cfff', // electric cyan — under the cursor
};

/** Emissive companion colors (used for glow; darker = less bloom). */
export const CELL_GLOW: Record<CellState, string> = {
  default: '#101527',
  comparing: '#b36f00',
  swapping: '#c2185b',
  sorted: '#0f8c6c',
  current: '#0e7fb3',
};

/** Value gradient for idle bars: low → high. */
export const VALUE_GRADIENT: [string, string] = ['#4f46e5', '#38cfff']; // indigo → cyan

export const NODE_COLORS: Record<NodeState, string> = {
  default: '#5d6b8f',
  frontier: '#ffb020', // discovered, waiting in queue/stack/PQ
  current: '#38cfff', // being visited right now
  visited: '#2dd4a7', // done
};

export const NODE_GLOW: Record<NodeState, string> = {
  default: '#101527',
  frontier: '#b36f00',
  current: '#0e7fb3',
  visited: '#0f8c6c',
};

export const EDGE_COLORS: Record<EdgeState, string> = {
  default: '#2b3450',
  active: '#ffb020',
  traversed: '#2dd4a7',
};

export const SCATTER_POINT_COLORS: Record<PointState, string> = {
  default: '#5d6b8f',
  comparing: '#ffb020',
  neighbor: '#ff4d8f',
  assigned: '#38cfff',
  misclassified: '#d62d20',
  correct: '#2dd4a7',
  predicted: '#a020f0',
};

export const SCATTER_CENTROID_COLORS: Record<CentroidState, string> = {
  default: '#0071b8',
  moving: '#ff4d8f',
  converged: '#2dd4a7',
};

export const SCATTER_LINE_COLORS: Record<LineState, string> = {
  default: '#5d6b8f',
  updating: '#ffb020',
  final: '#2dd4a7',
};

export const SCATTER_CLASS_PALETTE: string[] = [
  '#e69f00',
  '#56b4e9',
  '#009e73',
  '#cc79a7',
  '#d55e00',
  '#0072b2',
  '#f0e442',
  '#000000',
];

export const STATE_LEGEND: { label: string; color: string }[] = [
  { label: 'default', color: '#5d6b8f' },
  { label: 'comparing', color: '#ffb020' },
  { label: 'swapping', color: '#ff4d8f' },
  { label: 'current', color: '#38cfff' },
  { label: 'sorted / visited', color: '#2dd4a7' },
  { label: 'neighbor', color: '#ff4d8f' },
  { label: 'assigned', color: '#38cfff' },
  { label: 'misclassified', color: '#d62d20' },
  { label: 'correct', color: '#2dd4a7' },
  { label: 'predicted', color: '#a020f0' },
  { label: 'centroid-moving', color: '#ff4d8f' },
  { label: 'centroid-converged', color: '#2dd4a7' },
  { label: 'line-updating', color: '#ffb020' },
];
