/**
 * Graph layout — deterministic layered (BFS-level) 3D layout.
 *
 * Nodes are arranged by BFS depth from the start node: each level forms a
 * ring row at increasing -Z, giving a readable "wavefront" in 3D. Unreachable
 * components are laid out to the side. Pure function of the input, so node
 * positions are stable across the whole playback.
 */

import type { GraphInput, TreeOpsInput } from '../engine/definition';
import type { TreeNode } from '../engine/visstate';

export interface NodePos {
  x: number;
  y: number;
  z: number;
}

const LEVEL_SPACING = 2.6;
const NODE_SPACING = 2.4;

export function layoutGraph(g: GraphInput): Map<string, NodePos> {
  const adj = new Map<string, string[]>(g.nodes.map((n) => [n, []]));
  for (const [f, t] of g.edges) {
    adj.get(f)?.push(t);
    if (!g.directed) adj.get(t)?.push(f);
  }

  const level = new Map<string, number>();
  const order: string[] = [];
  const seen = new Set<string>();

  // BFS layering from start, then from any remaining unvisited node.
  const roots = [g.start ?? g.nodes[0], ...g.nodes];
  for (const root of roots) {
    if (root == null || seen.has(root)) continue;
    seen.add(root);
    level.set(root, 0);
    const q = [root];
    while (q.length) {
      const cur = q.shift()!;
      order.push(cur);
      for (const nb of adj.get(cur) ?? []) {
        if (!seen.has(nb)) {
          seen.add(nb);
          level.set(nb, (level.get(cur) ?? 0) + 1);
          q.push(nb);
        }
      }
    }
  }

  // Group by level, spread each level along X, step levels along -Z with a
  // gentle Y arc so depth reads clearly from the default camera.
  const byLevel = new Map<number, string[]>();
  for (const n of order) {
    const l = level.get(n) ?? 0;
    if (!byLevel.has(l)) byLevel.set(l, []);
    byLevel.get(l)!.push(n);
  }

  const pos = new Map<string, NodePos>();
  const maxLevel = Math.max(...byLevel.keys());
  for (const [l, nodes] of byLevel) {
    const rowWidth = (nodes.length - 1) * NODE_SPACING;
    nodes.forEach((n, i) => {
      pos.set(n, {
        x: i * NODE_SPACING - rowWidth / 2,
        y: 0.4 * (maxLevel - l),
        z: -l * LEVEL_SPACING,
      });
    });
  }
  return pos;
}

/**
 * BST layout: classic recursive tree positions from the inserted-node list.
 * X derives from in-order position, Y from depth.
 */
export function layoutTree(nodes: TreeNode[]): Map<string, NodePos> {
  const pos = new Map<string, NodePos>();
  if (nodes.length === 0) return pos;

  const children = new Map<string, { left?: string; right?: string }>();
  let root: string | undefined;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  for (const n of nodes) {
    if (!n.parent) {
      root = n.id;
    } else {
      const c = children.get(n.parent) ?? {};
      if (n.side === 'left') c.left = n.id;
      else c.right = n.id;
      children.set(n.parent, c);
    }
  }
  if (!root) root = nodes[0].id;

  let cursor = 0;
  const place = (id: string | undefined, depth: number): void => {
    if (!id || !byId.has(id)) return;
    const c = children.get(id) ?? {};
    place(c.left, depth + 1);
    pos.set(id, { x: cursor * 1.9, y: -depth * 1.8, z: 0 });
    cursor += 1;
    place(c.right, depth + 1);
  };
  place(root, 0);

  // Center horizontally and lift so the root sits near the top.
  const xs = [...pos.values()].map((p) => p.x);
  const midX = (Math.min(...xs) + Math.max(...xs)) / 2;
  const ys = [...pos.values()].map((p) => p.y);
  const midY = (Math.min(...ys) + Math.max(...ys)) / 2;
  for (const p of pos.values()) {
    p.x -= midX;
    p.y -= midY;
  }
  return pos;
}

export function layoutFor(
  input: GraphInput | TreeOpsInput,
  insertedNodes: TreeNode[],
): Map<string, NodePos> {
  return input.kind === 'graph' ? layoutGraph(input) : layoutTree(insertedNodes);
}
