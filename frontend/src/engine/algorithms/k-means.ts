import type {
  AlgorithmDefinition,
  AlgorithmInput,
  ScatterInput,
} from '../definition';
import type { AlgorithmEvent } from '../events';
import { KMEANS_SOLUTIONS } from './solutions/kmeans-solutions';

function assertScatter(input: AlgorithmInput): asserts input is ScatterInput {
  if (input.kind !== 'scatter') throw new Error('k-means expects a scatter input');
}

function seededCentroidIds(pointIds: string[], k: number, seed: number): string[] {
  const n = pointIds.length;
  if (n === 0) return [];
  const result: string[] = [];
  if (seed === 0) {
    for (let i = 0; i < k; i++) result.push(pointIds[i % n]);
  } else {
    let s = seed;
    for (let i = 0; i < k; i++) {
      result.push(pointIds[(i + s) % n]);
      s = (s * 7 + 13) % Math.max(n, 1);
    }
  }
  return result;
}

function* run(input: AlgorithmInput): Generator<AlgorithmEvent> {
  assertScatter(input);
  const pointsArr = [...input.points];
  const rawK = Math.max(1, Math.min(input.k ?? 3, pointsArr.length));
  const k = Math.min(rawK, pointsArr.length);
  const seed = input.seed ?? 0;
  const maxIter = Math.max(1, Math.min(input.iterations ?? 20, 20));

  if (pointsArr.length > 0 && rawK > pointsArr.length) {
    yield {
      v: 1,
      type: 'annotate',
      text: `Clamped k from ${rawK} to ${pointsArr.length} (cannot exceed number of points).`,
    };
  }

  yield {
    v: 1,
    type: 'annotate',
    text: `k-Means: ${pointsArr.length} points, k=${k} clusters, seed=${seed}, max ${maxIter} iterations. Centroids initialized, then iterate: assign → move → check convergence.`,
  };

  const byId: Record<string, { x: number; y: number }> = {};
  for (const p of pointsArr) byId[p.id] = { x: p.x, y: p.y };

  const idsList = pointsArr.map((p) => p.id);
  const initCentroidIds = seededCentroidIds(idsList, k, seed);

  const centroids: Record<string, { x: number; y: number; cluster: number }> = {};
  for (let c = 0; c < k; c++) {
    const src = byId[initCentroidIds[c]];
    centroids[`c${c}`] = { x: src.x, y: src.y, cluster: c };
    yield {
      v: 1,
      type: 'move-centroid',
      centroidId: `c${c}`,
      clusterId: c,
      oldX: src.x,
      oldY: src.y,
      newX: src.x,
      newY: src.y,
      line: { cpp: 14, java: 19, python: 9 },
      note: `Centroid c${c} initialized at (${src.x.toFixed(1)}, ${src.y.toFixed(1)}) (from point ${initCentroidIds[c]})`,
    };
  }

  let iteration = 0;
  let converged = false;
  const assignments: Record<string, number> = {};

  for (; iteration < maxIter && !converged; iteration++) {
    yield {
      v: 1,
      type: 'highlight-line',
      line: { cpp: 22, java: 26, python: 18 },
      note: `Iteration ${iteration + 1}: assign each point to nearest centroid`,
    };

    for (let i = 0; i < pointsArr.length; i++) {
      const p = pointsArr[i];
      let bestD2 = 1e18;
      let bestC = 0;
      for (let c = 0; c < k; c++) {
        const cc = centroids[`c${c}`];
        const dx = p.x - cc.x;
        const dy = p.y - cc.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestD2) { bestD2 = d2; bestC = c; }
      }
      assignments[p.id] = bestC;
      yield {
        v: 1,
        type: 'assign',
        pointId: p.id,
        clusterId: bestC,
        centroidId: `c${bestC}`,
        line: { cpp: 31, java: 33, python: 28 },
      };
    }

    let changed = 0;
    yield {
      v: 1,
      type: 'highlight-line',
      line: { cpp: 37, java: 43, python: 37 },
      note: `Iteration ${iteration + 1}: recompute centroids as cluster means`,
    };

    for (let c = 0; c < k; c++) {
      let sx = 0, sy = 0, cnt = 0;
      for (let i = 0; i < pointsArr.length; i++) {
        if (assignments[pointsArr[i].id] === c) {
          sx += pointsArr[i].x;
          sy += pointsArr[i].y;
          cnt++;
        }
      }
      const old = centroids[`c${c}`];
      const newX = cnt > 0 ? sx / cnt : old.x;
      const newY = cnt > 0 ? sy / cnt : old.y;
      const moved = Math.abs(newX - old.x) > 1e-12 || Math.abs(newY - old.y) > 1e-12;
      if (moved) changed++;
      centroids[`c${c}`] = { x: newX, y: newY, cluster: c };
      yield {
        v: 1,
        type: 'move-centroid',
        centroidId: `c${c}`,
        clusterId: c,
        oldX: old.x,
        oldY: old.y,
        newX,
        newY,
        line: { cpp: 45, java: 50, python: 45 },
        note: `Centroid c${c} → (${newX.toFixed(2)}, ${newY.toFixed(2)}), count=${cnt}`,
      };
    }

    converged = changed === 0;
    yield {
      v: 1,
      type: 'convergence-check',
      iteration: iteration + 1,
      changedCount: changed,
      converged,
      line: { cpp: 50, java: 55, python: 46 },
      note: converged
        ? `Converged after ${iteration + 1} iterations (0 centroids moved more than ε.)`
        : `${changed} of ${k} centroids moved — continue.`,
    };
  }

  const clusterSizes: Record<number, number> = {};
  for (let i = 0; i < pointsArr.length; i++) {
    const c = assignments[pointsArr[i].id] ?? 0;
    clusterSizes[c] = (clusterSizes[c] ?? 0) + 1;
  }
  const summaryLines: string[] = [];
  for (let c = 0; c < k; c++) {
    const cc = centroids[`c${c}`];
    summaryLines.push(`c${c}:(${cc.x.toFixed(1)},${cc.y.toFixed(1)}) n=${clusterSizes[c] ?? 0}`);
  }
  const clusterArr = pointsArr.map((p) => assignments[p.id] ?? 0);
  const usedIter = converged ? iteration : maxIter;
  const summaryShort = summaryLines.join(' | ');

  yield {
    v: 1,
    type: 'done',
    summary: `k-Means finished in ${usedIter} iteration(s). ${summaryShort}. Ass: [${clusterArr.join(',')}]`.slice(0, 220),
  };
}

function mkPt(id: string, x: number, y: number) {
  return { id, x, y };
}

function blob(cx: number, cy: number, n: number, prefix: string, startIdx = 0): { id: string; x: number; y: number }[] {
  const pts: { id: string; x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const ang = (i * 2.399) % (Math.PI * 2);
    const r = 0.3 + ((i * 0.27) % 0.8);
    pts.push(mkPt(`${prefix}${startIdx + i}`, cx + Math.cos(ang) * r, cy + Math.sin(ang) * r));
  }
  return pts;
}

const PRESET_2BLOB: ScatterInput = {
  kind: 'scatter',
  points: [
    ...blob(-3, 0, 6, 'p'),
    ...blob(3, 0, 6, 'p', 6),
  ],
  k: 2,
  seed: 42,
  iterations: 20,
};

const PRESET_3BLOB: ScatterInput = {
  kind: 'scatter',
  points: [
    ...blob(-3, 2, 6, 'a'),
    ...blob(3, 2, 6, 'b'),
    ...blob(0, -3, 6, 'c'),
  ],
  k: 3,
  seed: 0,
  iterations: 20,
};

const PRESET_4BLOB: ScatterInput = {
  kind: 'scatter',
  points: [
    ...blob(-3, -2, 5, 'p0_'),
    ...blob(3, -2, 5, 'p1_'),
    ...blob(-3, 2, 5, 'p2_'),
    ...blob(3, 2, 5, 'p3_'),
  ],
  k: 4,
  seed: 7,
  iterations: 20,
};

export const kMeans: AlgorithmDefinition = {
  id: 'k-means',
  name: 'k-Means Clustering',
  category: 'ml',
  difficulty: 'medium',
  bigO: 'O(k·N·d·iter)',
  summary:
    'Unsupervised iterative clustering: pick k seed centroids, then alternate between assigning every point to the nearest centroid and moving each centroid to the mean of its cluster, until centroids stop moving.',
  realWorldUse:
    'Customer segmentation in marketing, image color quantization (reducing a photo to 256 representative colors), anomaly detection, compressing feature vectors for search engines, and grouping similar documents in NLP pipelines.',
  complexity: {
    time: { best: 'O(k·N·d·iter)', average: 'O(k·N·d·iter)', worst: 'O(k·N·d·iter)' },
    space: 'O(N·d + k·d)',
    intuition:
      'Each iteration visits each of the N points, for each point computes k d-dimensional squared distances (O(k·N·d)), then recomputes k centroids by averaging (O(N·d) across clusters). That O(k·N·d) cost paid per iteration yields total O(k·N·d·iter). Convergence typically happens in ≤20 iterations for small datasets. Memory is O(N·d) for the dataset plus O(k·d) for centroids.',
  },
  defaultInput: PRESET_3BLOB,
  presets: [
    { label: '2-blob separable', input: PRESET_2BLOB },
    { label: '3-blob seed=0', input: PRESET_3BLOB },
    { label: '4-quadrant blobs', input: PRESET_4BLOB },
  ],
  run,
  solutions: KMEANS_SOLUTIONS,
  examples: [
    {
      title: '3-blob, k=3, seed=0 deterministic init',
      input: PRESET_3BLOB,
      narration: [
        'Three well-separated blobs of 6 points each. Seed=0 initializes the 3 centroids to the first 3 input points (all from the left blob initially). That is fine: Lloyd algorithm tolerates messy seeds because each iteration re-assigns and re-computes.',
        'Iteration 1 reassigns every point to nearest centroid, then centroids jump toward their cluster means, pulling apart across blob boundaries.',
        'By iteration 3–5 centroids stabilize inside each blob and stop moving → convergence check reports 0 changed → algorithm halts.',
      ],
      output: '18 assignments across 3 clusters',
    },
    {
      title: '2-blob, k=2, seed=42',
      input: PRESET_2BLOB,
      narration: [
        'Two blobs of 6 points on a horizontal line. Seeded init picks 2 points via offset; iter 1 assigns and centroids drift toward each blob center. By iteration 4 the centroids have converged with clean left/right split.',
      ],
      output: '12 assignments split 6+6',
    },
  ],
  problem: {
    statement:
      'Implement Lloyd-style k-Means clustering. Read from standard input: first line has four integers N k seed maxIter. Next N lines each contain two real numbers x y. Print a single line of comma-separated cluster ids (0..k−1) in input order. Use squared Euclidean distance for assignment. For seed=0 init centroids to the first k input points (wrap-around modulo). Otherwise use the seeded-offset init. Stop when no centroid moves more than ε=1e-12 or at maxIter iterations (capped at 20).',
    signatures: {
      cpp: 'vector<int> kmeans(const vector<Pt>& pts, int k, int seed, int maxIter)',
      java: 'static int[] kmeans(Pt[] pts, int k, int seed, int maxIter)',
      python: 'def kmeans(pts: list[tuple[float,float]], k: int, seed: int, max_iter: int) -> list[int]',
    },
    starters: {
      cpp: `#include <bits/stdc++.h>
using namespace std;
typedef pair<double,double> Pt;

vector<int> kmeans(const vector<Pt>& pts, int k, int seed, int maxIter=20) {
    // TODO: implement Lloyd-style k-means clustering
    return {};
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(nullptr);
    int N, k, seed, maxIter;
    cin >> N >> k >> seed >> maxIter;
    vector<Pt> pts(N);
    for (int i = 0; i < N; i++) cin >> pts[i].first >> pts[i].second;
    vector<int> res = kmeans(pts, k, seed, maxIter);
    for (int i = 0; i < N; i++) {
        if (i > 0) cout << ",";
        cout << res[i];
    }
    cout << "\\n";
}
`,
      java: `import java.util.*;
public class Main {
    static class Pt { double x, y; Pt(double a,double b){x=a;y=b;} }
    static int[] kmeans(Pt[] pts, int k, int seed, int maxIter) {
        // TODO: implement Lloyd-style k-means clustering
        return new int[pts.length];
    }
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int N = sc.nextInt(), k = sc.nextInt(), seed = sc.nextInt(), maxIter = sc.nextInt();
        Pt[] pts = new Pt[N];
        for (int i = 0; i < N; i++) pts[i] = new Pt(sc.nextDouble(), sc.nextDouble());
        int[] res = kmeans(pts, k, seed, maxIter);
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < N; i++) {
            if (i > 0) sb.append(",");
            sb.append(res[i]);
        }
        System.out.println(sb);
    }
}
`,
      python: `import sys

def kmeans(pts, k, seed, max_iter=20):
    # TODO: implement Lloyd-style k-means clustering
    return [0] * len(pts)

def main():
    data = sys.stdin.read().split()
    idx = 0
    N = int(data[idx]); idx += 1
    k = int(data[idx]); idx += 1
    seed = int(data[idx]); idx += 1
    max_iter = int(data[idx]); idx += 1
    pts = []
    for _ in range(N):
        x = float(data[idx]); idx += 1
        y = float(data[idx]); idx += 1
        pts.append((x, y))
    res = kmeans(pts, k, seed, max_iter)
    print(",".join(map(str, res)))

if __name__ == "__main__":
    main()
`,
    },
    expectedBigO: 'O(k·N·iter)',
    tests: [
      {
        input: `4 2 0 20\n-3 0\n-2.5 0.5\n3 0\n2.5 0.5`,
        expected: '0,0,1,1',
        hidden: false,
        label: 'sample 1: 2-blob k=2 seed=0',
      },
      {
        input: `9 3 0 20\n-3 2\n-2.5 2.5\n-3.5 2.5\n3 2\n2.5 2.5\n3.5 2.5\n0 -3\n0.5 -3.5\n-0.5 -3.5`,
        expected: '0,0,0,1,1,1,2,2,2',
        hidden: false,
        label: 'sample 2: 3-blob k=3',
      },
      {
        input: `1 1 0 20\n5 5`,
        expected: '0',
        hidden: true,
        label: 'k=1 single point',
      },
      {
        input: `3 3 0 20\n0 0\n1 1\n2 2`,
        expected: '0,1,2',
        hidden: true,
        label: 'k=N each own cluster',
      },
      {
        input: `8 2 7 1\n0 0\n0.1 0.1\n0.2 0.2\n0.1 0\n10 10\n10.1 10.1\n10.2 10.2\n10.1 10`,
        expected: '0,0,0,0,1,1,1,1',
        hidden: true,
        label: '1 iter only still outputs last assign',
      },
      {
        input: `10 2 0 20\n0 0\n0 0\n0 0\n0 0\n0 0\n10 10\n10 10\n10 10\n10 10\n10 10`,
        expected: '0,0,0,0,0,1,1,1,1,1',
        hidden: true,
        label: 'duplicate points',
      },
      {
        input: `8 2 0 20\n-5 -5\n-4 -5\n-5 -4\n-4 -4\n5 5\n4 5\n5 4\n4 4`,
        expected: '0,0,0,0,1,1,1,1',
        hidden: true,
        label: 'negative coords',
      },
      (() => {
        const pts: string[] = [];
        for (let i = 0; i < 200; i++) {
          const bx = i < 100 ? -10 : 10;
          const by = (i % 10) - 5;
          pts.push(`${bx + ((i % 3) * 0.1)} ${by + ((i % 5) * 0.1)}`);
        }
        return {
          input: `200 2 0 20\n${pts.join('\n')}`,
          expected: Array(100).fill('0').concat(Array(100).fill('1')).join(','),
          hidden: true,
          label: 'n=200 stress',
        };
      })(),
      {
        input: `20 4 7 20\n-3 -2\n-3.5 -2\n-3 -2.5\n-2.5 -2\n-3.2 -2.3\n3 -2\n3.5 -2\n3 -2.5\n2.5 -2\n3.2 -2.3\n-3 2\n-3.5 2\n-3 2.5\n-2.5 2\n-3.2 2.3\n3 2\n3.5 2\n3 2.5\n2.5 2\n3.2 2.3`,
        expected: '0,0,0,0,0,1,1,1,1,1,2,2,2,2,2,3,3,3,3,3',
        hidden: true,
        label: 'k=4 quadrants seeded',
      },
      {
        input: `6 2 0 20\n0 0\n1 0\n2 0\n100 0\n101 0\n102 0`,
        expected: '0,0,0,1,1,1',
        hidden: true,
        label: 'seed=0 first-k-points init',
      },
    ],
  },
};
