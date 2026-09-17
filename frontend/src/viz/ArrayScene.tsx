/**
 * ArrayScene — 3D bar row for sorting/searching algorithms.
 *
 * Bars ease toward their target height/color every frame (lerp in useFrame),
 * so state transitions animate smoothly regardless of playback speed.
 */

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import type { VisState } from '../engine/visstate';
import { CELL_COLORS } from './colors';

const BAR_WIDTH = 0.7;
const GAP = 0.3;
const MAX_HEIGHT = 5;

function Bar({
  value,
  maxValue,
  minValue,
  x,
  color,
  showLabel,
}: {
  value: number;
  maxValue: number;
  minValue: number;
  x: number;
  color: string;
  showLabel: boolean;
}) {
  const mesh = useRef<THREE.Mesh>(null!);
  const mat = useRef<THREE.MeshStandardMaterial>(null!);
  const target = useMemo(() => new THREE.Color(color), [color]);

  // Normalize height: smallest value still gets a visible stub.
  const span = Math.max(maxValue - minValue, 1);
  const h = 0.35 + ((value - minValue) / span) * MAX_HEIGHT;

  useFrame((_, dt) => {
    const k = Math.min(dt * 10, 1);
    // height easing
    const cur = mesh.current.scale.y;
    mesh.current.scale.y = THREE.MathUtils.lerp(cur, h, k);
    mesh.current.position.y = mesh.current.scale.y / 2;
    // color easing
    mat.current.color.lerp(target, k);
    mesh.current.position.x = THREE.MathUtils.lerp(mesh.current.position.x, x, k);
  });

  return (
    <group>
      <mesh ref={mesh} position={[x, h / 2, 0]} scale={[1, h, 1]}>
        <boxGeometry args={[BAR_WIDTH, 1, BAR_WIDTH]} />
        <meshStandardMaterial ref={mat} color={color} roughness={0.35} metalness={0.15} />
      </mesh>
      {showLabel && (
        <Text position={[x, -0.45, BAR_WIDTH / 2]} fontSize={0.34} color="#8b93a7" anchorX="center" anchorY="top">
          {String(value)}
        </Text>
      )}
    </group>
  );
}

export function ArrayScene({ vis }: { vis: VisState }) {
  const arr = vis.array;
  if (!arr) return null;

  const n = arr.values.length;
  const width = n * (BAR_WIDTH + GAP);
  const x0 = -width / 2 + (BAR_WIDTH + GAP) / 2;
  const maxValue = Math.max(...arr.values);
  const minValue = Math.min(...arr.values);
  const showLabels = n <= 30;

  return (
    <group>
      {arr.values.map((v, i) => (
        <Bar
          key={i}
          value={v}
          maxValue={maxValue}
          minValue={minValue}
          x={x0 + i * (BAR_WIDTH + GAP)}
          color={CELL_COLORS[arr.states[i] ?? 'default']}
          showLabel={showLabels}
        />
      ))}
      {/* Active range indicator (merge/quick/binary search windows) */}
      {arr.range && (
        <group>
          <mesh
            position={[
              x0 + ((arr.range.lo + arr.range.hi) / 2) * (BAR_WIDTH + GAP),
              -0.12,
              0,
            ]}
          >
            <boxGeometry
              args={[(arr.range.hi - arr.range.lo + 1) * (BAR_WIDTH + GAP), 0.06, BAR_WIDTH + 0.2]}
            />
            <meshBasicMaterial color="#56b4e9" transparent opacity={0.7} />
          </mesh>
          {arr.range.label && (
            <Text
              position={[x0 + ((arr.range.lo + arr.range.hi) / 2) * (BAR_WIDTH + GAP), -1.1, 0]}
              fontSize={0.32}
              color="#56b4e9"
              anchorX="center"
            >
              {arr.range.label}
            </Text>
          )}
        </group>
      )}
      {/* Named pointers (i, j, lo, hi, mid…) as floating markers */}
      {Object.entries(vis.pointers)
        .filter((entry): entry is [string, number] => typeof entry[1] === 'number')
        .filter(([, idx]) => idx >= 0 && idx < n)
        .map(([name, idx], order) => (
          <Text
            key={name}
            position={[x0 + idx * (BAR_WIDTH + GAP), MAX_HEIGHT + 1.1 + order * 0.5, 0]}
            fontSize={0.38}
            color="#cc79a7"
            anchorX="center"
          >
            {`${name}=${idx}`}
          </Text>
        ))}
    </group>
  );
}
