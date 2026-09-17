import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line, Text } from '@react-three/drei';
import * as THREE from 'three';
import type { VisState } from '../engine/visstate';
import type { ScatterInput } from '../engine/definition';
import {
  SCATTER_CENTROID_COLORS,
  SCATTER_CLASS_PALETTE,
  SCATTER_LINE_COLORS,
  SCATTER_POINT_COLORS,
} from './colors';

const POINT_RADIUS = 0.12;
const CENTROID_SIZE = 0.4;
const QUERY_RADIUS = 0.18;

function classColor(label: string | number | null | undefined): string {
  if (label === null || label === undefined) return SCATTER_POINT_COLORS.default;
  const key = String(label);
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  const idx = Math.abs(hash) % SCATTER_CLASS_PALETTE.length;
  return SCATTER_CLASS_PALETTE[idx];
}

function Point({
  id: _id,
  x,
  y,
  label,
  cluster,
  state,
}: {
  id: string;
  x: number;
  y: number;
  label?: string | number | null;
  cluster?: number | string;
  state: string;
}) {
  const mesh = useRef<THREE.Mesh>(null!);
  const mat = useRef<THREE.MeshStandardMaterial>(null!);

  const baseColor = cluster !== undefined ? classColor(cluster) : label !== undefined ? classColor(label) : SCATTER_POINT_COLORS.default;
  const stateColor = SCATTER_POINT_COLORS[state as keyof typeof SCATTER_POINT_COLORS] ?? baseColor;
  const target = useMemo(() => new THREE.Color(stateColor), [stateColor]);

  useFrame((_, dt) => {
    const k = Math.min(dt * 10, 1);
    mesh.current.position.x = THREE.MathUtils.lerp(mesh.current.position.x, x, k);
    mesh.current.position.y = THREE.MathUtils.lerp(mesh.current.position.y, y, k);
    mesh.current.position.z = THREE.MathUtils.lerp(mesh.current.position.z, 0.05, k);
    const isNeighbor = state === 'neighbor';
    const isMisclass = state === 'misclassified';
    const isCorrect = state === 'correct';
    const isPredicted = state === 'predicted';
    const scale = isNeighbor ? 1.25 : isMisclass || isCorrect || isPredicted ? 1.15 : 1;
    mesh.current.scale.x = THREE.MathUtils.lerp(mesh.current.scale.x, scale, k);
    mesh.current.scale.y = THREE.MathUtils.lerp(mesh.current.scale.y, scale, k);
    mesh.current.scale.z = THREE.MathUtils.lerp(mesh.current.scale.z, scale, k);
    mat.current.color.lerp(target, k);
    mat.current.emissive.lerp(
      new THREE.Color(state !== 'default' ? stateColor : '#000000'),
      k,
    );
    mat.current.emissiveIntensity = THREE.MathUtils.lerp(
      mat.current.emissiveIntensity,
      state !== 'default' ? 0.35 : 0,
      k,
    );
  });

  return (
    <mesh
      ref={mesh}
      position={[x, y, 0.05]}
    >
      <sphereGeometry args={[POINT_RADIUS, 18, 14]} />
      <meshStandardMaterial
        ref={mat}
        color={stateColor}
        roughness={0.4}
        metalness={0.1}
      />
    </mesh>
  );
}

function Centroid({
  id: _id,
  x,
  y,
  cluster,
  state,
}: {
  id: string;
  x: number;
  y: number;
  cluster: number | string;
  state: string;
}) {
  const mesh = useRef<THREE.Mesh>(null!);
  const mat = useRef<THREE.MeshStandardMaterial>(null!);
  const color = SCATTER_CENTROID_COLORS[state as keyof typeof SCATTER_CENTROID_COLORS] ?? SCATTER_CENTROID_COLORS.default;
  const target = useMemo(() => new THREE.Color(color), [color]);

  useFrame((_, dt) => {
    const k = Math.min(dt * 8, 1);
    mesh.current.position.x = THREE.MathUtils.lerp(mesh.current.position.x, x, k);
    mesh.current.position.y = THREE.MathUtils.lerp(mesh.current.position.y, y, k);
    mesh.current.position.z = THREE.MathUtils.lerp(mesh.current.position.z, 0.1, k);
    mat.current.color.lerp(target, k);
  });

  return (
    <group>
      <mesh
        ref={mesh}
        position={[x, y, 0.1]}
      >
        <boxGeometry args={[CENTROID_SIZE, CENTROID_SIZE, CENTROID_SIZE]} />
        <meshStandardMaterial
          ref={mat}
          color={color}
          roughness={0.3}
          metalness={0.25}
        />
      </mesh>
      <Text
        position={[x, y + 0.38, 0.12]}
        fontSize={0.22}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        C{String(cluster)}
      </Text>
    </group>
  );
}

function QueryMarker({ x, y, predictedLabel }: { x: number; y: number; predictedLabel?: string | number | null }) {
  const mesh = useRef<THREE.Mesh>(null!);
  const t = useRef(0);

  useFrame((_, dt) => {
    t.current += dt * 2;
    const pulse = 0.9 + 0.2 * Math.sin(t.current);
    mesh.current.scale.setScalar(pulse);
  });

  const color = predictedLabel !== undefined && predictedLabel !== null
    ? classColor(predictedLabel)
    : '#38cfff';

  return (
    <group position={[x, y, 0.15]}>
      <mesh ref={mesh}>
        <sphereGeometry args={[QUERY_RADIUS, 20, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          roughness={0.3}
          metalness={0.2}
        />
      </mesh>
      <mesh position={[0, 0, -0.02]}>
        <ringGeometry args={[QUERY_RADIUS * 1.4, QUERY_RADIUS * 1.7, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
      {predictedLabel !== undefined && predictedLabel !== null && (
        <Text
          position={[0, -0.35, 0.1]}
          fontSize={0.2}
          color="#ffffff"
          anchorX="center"
          anchorY="top"
          outlineWidth={0.018}
          outlineColor="#000000"
        >
          pred: {String(predictedLabel)}
        </Text>
      )}
    </group>
  );
}

function LinePrimitive({
  x1, y1, x2, y2, state,
}: { x1: number; y1: number; x2: number; y2: number; state: string }) {
  const ref = useRef<any>(null);
  const color = SCATTER_LINE_COLORS[state as keyof typeof SCATTER_LINE_COLORS] ?? SCATTER_LINE_COLORS.default;
  const points = useMemo(() => [[x1, y1, 0.08], [x2, y2, 0.08]], [x1, y1, x2, y2]);
  useFrame((_, dt) => {
    if (ref.current && ref.current.geometry) {
      const pos = ref.current.geometry.attributes.position;
      if (pos && pos.count === 2) {
        const k = Math.min(dt * 8, 1);
        pos.setXYZ(
          0,
          THREE.MathUtils.lerp(pos.getX(0), x1, k),
          THREE.MathUtils.lerp(pos.getY(0), y1, k),
          0.08,
        );
        pos.setXYZ(
          1,
          THREE.MathUtils.lerp(pos.getX(1), x2, k),
          THREE.MathUtils.lerp(pos.getY(1), y2, k),
          0.08,
        );
        pos.needsUpdate = true;
      }
    }
  });
  return (
    <Line
      ref={ref}
      points={points as any}
      color={color}
      lineWidth={state === 'final' ? 3 : 2}
      transparent
      opacity={state === 'updating' ? 0.85 : 1}
    />
  );
}

function LossCurve({ data }: { data: { x: number; y: number }[] }) {
  if (!data || data.length < 2) return null;

  const OFFSET_X = 4.2;
  const OFFSET_Y = 2.2;
  const W = 2.4;
  const H = 1.5;

  const maxX = Math.max(...data.map((d) => d.x), 1);
  const maxY = Math.max(...data.map((d) => d.y), 1e-9);
  const minY = Math.min(...data.map((d) => d.y), 0);
  const rangeY = Math.max(maxY - minY, 1e-9);

  const points = data.map((d) => {
    const px = OFFSET_X - W / 2 + (d.x / maxX) * W;
    const py = OFFSET_Y - H / 2 + ((d.y - minY) / rangeY) * H;
    return [px, py, 0.02] as [number, number, number];
  });

  const latest = points[points.length - 1];
  const currLoss = data[data.length - 1].y;

  return (
    <group>
      <mesh position={[OFFSET_X, OFFSET_Y, -0.01]}>
        <planeGeometry args={[W * 1.08, H * 1.18]} />
        <meshBasicMaterial color="#0d1322" transparent opacity={0.82} />
      </mesh>
      <mesh position={[OFFSET_X, OFFSET_Y, 0]}>
        <planeGeometry args={[W, H]} />
        <meshBasicMaterial color="#11182a" />
      </mesh>
      <Line
        points={[
          [OFFSET_X - W / 2, OFFSET_Y - H / 2, 0.01],
          [OFFSET_X - W / 2, OFFSET_Y + H / 2, 0.01],
          [OFFSET_X + W / 2, OFFSET_Y - H / 2, 0.01],
          [OFFSET_X - W / 2, OFFSET_Y - H / 2, 0.01],
        ] as any}
        color="#2b3450"
        lineWidth={1}
      />
      <Line
        points={points as any}
        color="#ffb020"
        lineWidth={2}
      />
      <Text
        position={[OFFSET_X, OFFSET_Y + H / 2 + 0.18, 0.02]}
        fontSize={0.16}
        color="#8b93a7"
        anchorX="center"
        anchorY="bottom"
      >
        Loss (MSE)
      </Text>
      <Text
        position={[latest[0] - 0.05, latest[1] + 0.15, 0.03]}
        fontSize={0.14}
        color="#ffb020"
        anchorX="right"
        anchorY="middle"
      >
        {currLoss < 0.01 ? currLoss.toExponential(2) : currLoss.toFixed(3)}
      </Text>
    </group>
  );
}

function AxisGrid({ minX, maxX, minY, maxY }: { minX: number; maxX: number; minY: number; maxY: number }) {
  const pad = 0.6;
  const x0 = minX - pad;
  const x1 = maxX + pad;
  const y0 = minY - pad;
  const y1 = maxY + pad;
  const spanX = Math.max(x1 - x0, 3);
  const spanY = Math.max(y1 - y0, 3);

  const step = 1;
  const xLines: [number, number, number][][] = [];
  for (let x = Math.ceil(x0); x <= Math.floor(x1); x += step) {
    xLines.push([[x, y0, -0.02], [x, y1, -0.02]]);
  }
  const yLines: [number, number, number][][] = [];
  for (let y = Math.ceil(y0); y <= Math.floor(y1); y += step) {
    yLines.push([[x0, y, -0.02], [x1, y, -0.02]]);
  }

  return (
    <group>
      <mesh position={[(x0 + x1) / 2, (y0 + y1) / 2, -0.05]}>
        <planeGeometry args={[spanX, spanY]} />
        <meshBasicMaterial color="#0a0f1e" />
      </mesh>
      {xLines.map((p, i) => (
        <Line key={`gx${i}`} points={p as any} color="#1a2238" lineWidth={1} />
      ))}
      {yLines.map((p, i) => (
        <Line key={`gy${i}`} points={p as any} color="#1a2238" lineWidth={1} />
      ))}
      <Line
        points={[[x0, 0, -0.01], [x1, 0, -0.01]] as any}
        color="#2b3450"
        lineWidth={1.5}
      />
      <Line
        points={[[0, y0, -0.01], [0, y1, -0.01]] as any}
        color="#2b3450"
        lineWidth={1.5}
      />
    </group>
  );
}

export function ScatterScene({
  vis,
  input: _input,
}: {
  vis: VisState;
  input: ScatterInput;
}) {
  const scatter = vis.scatter;
  if (!scatter) return null;

  const allPoints = scatter.points;
  const pointIds = Object.keys(allPoints);

  let minX = -5;
  let maxX = 5;
  let minY = -5;
  let maxY = 5;
  if (pointIds.length > 0) {
    const xs = pointIds.map((id) => allPoints[id].x);
    const ys = pointIds.map((id) => allPoints[id].y);
    if (scatter.query) {
      xs.push(scatter.query.x);
      ys.push(scatter.query.y);
    }
    if (scatter.centroids) {
      for (const cid of Object.keys(scatter.centroids)) {
        xs.push(scatter.centroids[cid].x);
        ys.push(scatter.centroids[cid].y);
      }
    }
    minX = Math.min(...xs, -3);
    maxX = Math.max(...xs, 3);
    minY = Math.min(...ys, -3);
    maxY = Math.max(...ys, 3);
  }

  return (
    <group>
      <AxisGrid minX={minX} maxX={maxX} minY={minY} maxY={maxY} />
      {pointIds.map((id) => {
        const p = allPoints[id];
        return (
          <Point
            key={id}
            id={id}
            x={p.x}
            y={p.y}
            label={p.label}
            cluster={p.cluster}
            state={p.state}
          />
        );
      })}
      {scatter.centroids &&
        Object.keys(scatter.centroids).map((cid) => {
          const c = scatter.centroids![cid];
          return (
            <Centroid
              key={cid}
              id={cid}
              x={c.x}
              y={c.y}
              cluster={c.cluster}
              state={c.state}
            />
          );
        })}
      {scatter.query && (
        <QueryMarker
          x={scatter.query.x}
          y={scatter.query.y}
          predictedLabel={scatter.query.predictedLabel}
        />
      )}
      {scatter.query &&
        scatter.neighborLines &&
        scatter.neighborLines.length > 0 &&
        scatter.neighborLines.map((pid) => {
          const p = scatter.points[pid];
          if (!p) return null;
          return (
            <Line
              key={`nl-${pid}`}
              points={[
                [scatter.query!.x, scatter.query!.y, 0.06],
                [p.x, p.y, 0.06],
              ] as any}
              color="#ff4d8f"
              lineWidth={1.5}
              dashed
              dashSize={0.12}
              gapSize={0.08}
              transparent
              opacity={0.8}
            />
          );
        })}
      {scatter.line && (
        <LinePrimitive
          x1={scatter.line.x1}
          y1={scatter.line.y1}
          x2={scatter.line.x2}
          y2={scatter.line.y2}
          state={scatter.line.state}
        />
      )}
      {scatter.lossCurve && scatter.lossCurve.length > 1 && (
        <LossCurve data={scatter.lossCurve} />
      )}
    </group>
  );
}
