/**
 * GraphScene — 3D node/edge rendering for graph and tree algorithms.
 */

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Line } from '@react-three/drei';
import * as THREE from 'three';
import type { VisState } from '../engine/visstate';
import { edgeKey } from '../engine/visstate';
import type { GraphInput, TreeOpsInput } from '../engine/definition';
import { layoutFor, type NodePos } from './layout';
import { EDGE_COLORS, NODE_COLORS } from './colors';

function NodeBall({
  id,
  pos,
  color,
  label,
  sublabel,
}: {
  id: string;
  pos: NodePos;
  color: string;
  label: string;
  sublabel: string | null;
}) {
  const mat = useRef<THREE.MeshStandardMaterial>(null!);
  const target = useMemo(() => new THREE.Color(color), [color]);
  useFrame((_, dt) => {
    mat.current.color.lerp(target, Math.min(dt * 10, 1));
  });
  return (
    <group key={id} position={[pos.x, pos.y, pos.z]}>
      <mesh>
        <sphereGeometry args={[0.55, 32, 32]} />
        <meshStandardMaterial ref={mat} color={color} roughness={0.3} metalness={0.2} />
      </mesh>
      <Text position={[0, 0, 0.58]} fontSize={0.42} color="#0b0e14" anchorX="center" anchorY="middle" fontWeight={700}>
        {label}
      </Text>
      {sublabel !== null && (
        <Text position={[0, -0.95, 0]} fontSize={0.3} color="#e69f00" anchorX="center">
          {sublabel}
        </Text>
      )}
    </group>
  );
}

export function GraphScene({
  vis,
  input,
}: {
  vis: VisState;
  input: GraphInput | TreeOpsInput;
}) {
  const graph = vis.graph;

  // Tree layouts change as nodes are inserted; graph layouts are static.
  const positions = useMemo(
    () => layoutFor(input, graph?.insertedNodes ?? []),
    [input, graph?.insertedNodes],
  );

  if (!graph) return null;

  const directed = input.kind === 'graph' ? !!input.directed : true;

  // Edges: static graph edges, or parent links for inserted tree nodes.
  const edges: { from: string; to: string; weight?: number }[] =
    input.kind === 'graph'
      ? input.edges.map(([from, to, weight]) => ({ from, to, weight }))
      : graph.insertedNodes
          .filter((n) => n.parent)
          .map((n) => ({ from: n.parent!, to: n.id }));

  const nodeIds: string[] =
    input.kind === 'graph' ? input.nodes : graph.insertedNodes.map((n) => n.id);

  const labelOf = (id: string): string => {
    if (input.kind === 'tree-ops') {
      const n = graph.insertedNodes.find((t) => t.id === id);
      return n ? String(n.value) : id;
    }
    return id;
  };

  return (
    <group>
      {edges.map(({ from, to, weight }) => {
        const a = positions.get(from);
        const b = positions.get(to);
        if (!a || !b) return null;
        const k = edgeKey(from, to, directed);
        const state = graph.edgeStates[k] ?? 'default';
        const mid: [number, number, number] = [(a.x + b.x) / 2, (a.y + b.y) / 2 + 0.35, (a.z + b.z) / 2];
        return (
          <group key={k}>
            <Line
              points={[
                [a.x, a.y, a.z],
                [b.x, b.y, b.z],
              ]}
              color={EDGE_COLORS[state]}
              lineWidth={state === 'active' ? 3.5 : 2}
            />
            {weight !== undefined && (
              <Text position={mid} fontSize={0.3} color="#8b93a7" anchorX="center">
                {String(weight)}
              </Text>
            )}
          </group>
        );
      })}
      {nodeIds.map((id) => {
        const pos = positions.get(id);
        if (!pos) return null;
        const value = graph.nodeValues[id];
        return (
          <NodeBall
            key={id}
            id={id}
            pos={pos}
            color={NODE_COLORS[graph.nodeStates[id] ?? 'default']}
            label={labelOf(id)}
            sublabel={value !== undefined && value !== null ? String(value) : null}
          />
        );
      })}
    </group>
  );
}
