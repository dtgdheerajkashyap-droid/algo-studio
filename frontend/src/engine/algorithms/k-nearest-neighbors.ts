import type {
  AlgorithmDefinition,
  AlgorithmInput,
  ScatterInput,
} from '../definition';
import type { AlgorithmEvent } from '../events';
import { KNN_SOLUTIONS } from './solutions/knn-solutions';

function assertScatter(input: AlgorithmInput): asserts input is ScatterInput {
  if (input.kind !== 'scatter') throw new Error('k-nearest-neighbors expects a scatter input');
}

function* run(input: AlgorithmInput): Generator<AlgorithmEvent> {
  assertScatter(input);
  const points = [...input.points];
  const k = Math.max(1, Math.min(input.k ?? 3, points.length));
  const query = input.query ?? { x: 0, y: 0 };

  yield {
    v: 1,
    type: 'annotate',
    text: `k-NN: ${points.length} training points, k=${k}. Classifying query (${query.x.toFixed(1)}, ${query.y.toFixed(1)}) by majority vote of ${k} nearest neighbors.`,
  };

  const dists: { id: string; dist: number; idx: number; label: string | number | null | undefined }[] = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const dx = p.x - query.x;
    const dy = p.y - query.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    dists.push({ id: p.id, dist: d, idx: i, label: p.label });
    yield {
      v: 1,
      type: 'distance-calc',
      pointId: p.id,
      x: p.x,
      y: p.y,
      queryX: query.x,
      queryY: query.y,
      distance: d,
      line: { cpp: 14, java: 62, python: 119 },
      note: `d(${p.id}) = ${d.toFixed(3)}`,
    };
  }

  dists.sort((a, b) => {
    if (a.dist !== b.dist) return a.dist - b.dist;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  yield {
    v: 1,
    type: 'highlight-line',
    line: { cpp: 17, java: 66, python: 121 },
    note: 'Sorted distances ascending.',
  };

  const topK = dists.slice(0, k);
  yield {
    v: 1,
    type: 'neighbor-select',
    pointIds: topK.map((d) => d.id),
    k,
    line: { cpp: 20, java: 75, python: 125 },
    note: `Selected ${k} nearest: ${topK.map((d) => `${d.id}(d=${d.dist.toFixed(2)})`).join(', ')}`,
  };

  const tallies: Record<string, number> = {};
  for (const nb of topK) {
    const key = nb.label === null || nb.label === undefined ? 'null' : String(nb.label);
    tallies[key] = (tallies[key] ?? 0) + 1;
  }

  let bestKey = '';
  let bestCnt = -1;
  const sortedKeys = Object.keys(tallies).sort();
  for (const key of sortedKeys) {
    if (tallies[key] > bestCnt) {
      bestCnt = tallies[key];
      bestKey = key;
    }
  }

  const predicted: string | number = isNaN(Number(bestKey)) ? bestKey : Number(bestKey);
  const talliesNum: Record<string | number, number> = {};
  for (const kk of Object.keys(tallies)) {
    const key: string | number = isNaN(Number(kk)) ? kk : Number(kk);
    talliesNum[key] = tallies[kk];
  }

  yield {
    v: 1,
    type: 'vote',
    tallies: talliesNum,
    predicted,
    line: { cpp: 26, java: 81, python: 130 },
    note: `Majority vote → predicted class: ${String(predicted)} (${bestCnt}/${k})`,
  };

  yield {
    v: 1,
    type: 'done',
    summary: `Predicted class for query (${query.x.toFixed(1)}, ${query.y.toFixed(1)}): ${String(predicted)}. Votes: ${Object.entries(talliesNum).map(([k, v]) => `${k}=${v}`).join(', ')}.`,
  };
}

function mkPt(id: string, x: number, y: number, label: number) {
  return { id, x, y, label };
}

const PRESET_TINY_2CLASS: ScatterInput = {
  kind: 'scatter',
  points: [
    mkPt('p0', 1, 1, 0),
    mkPt('p1', 1.5, 1.2, 0),
    mkPt('p2', 0.8, 2, 0),
    mkPt('p3', 2, 0.5, 0),
    mkPt('p4', 4, 4, 1),
    mkPt('p5', 4.5, 3.5, 1),
    mkPt('p6', 5, 4.2, 1),
    mkPt('p7', 3.8, 5, 1),
  ],
  query: { x: 2.8, y: 2.8 },
  k: 3,
};

const PRESET_3CLASS: ScatterInput = {
  kind: 'scatter',
  points: [
    mkPt('a0', 0.5, 1, 0),
    mkPt('a1', 1, 0.5, 0),
    mkPt('a2', 1.2, 1.5, 0),
    mkPt('a3', 0.8, 0.8, 0),
    mkPt('b0', 5, 1, 1),
    mkPt('b1', 5.5, 0.8, 1),
    mkPt('b2', 4.8, 1.5, 1),
    mkPt('b3', 5.2, 1.2, 1),
    mkPt('c0', 3, 5, 2),
    mkPt('c1', 2.8, 4.5, 2),
    mkPt('c2', 3.5, 5.2, 2),
    mkPt('c3', 2.5, 4.8, 2),
  ],
  query: { x: 3, y: 2.5 },
  k: 5,
};

const PRESET_SINGLE: ScatterInput = {
  kind: 'scatter',
  points: Array.from({ length: 10 }, (_, i) => mkPt(`p${i}`, i * 0.4, (i * 0.4) ** 2 + Math.sin(i) * 0.2, 7)),
  query: { x: 2.2, y: 4.8 },
  k: 3,
};

export const kNearestNeighbors: AlgorithmDefinition = {
  id: 'k-nearest-neighbors',
  name: 'k-Nearest Neighbors',
  category: 'ml',
  difficulty: 'easy',
  bigO: 'O(N·d) per query',
  summary:
    'Lazy instance-based classifier: to predict a query point, find its k nearest training points by Euclidean distance and return the majority class.',
  realWorldUse:
    'Widely used for simple recommendation engines (find users who liked similar items), handwriting digit recognition, outlier / fraud detection, and as a baseline classifier before training more complex models. Its laziness (no training phase) means it adapts instantly to new data, but it scales poorly with large datasets.',
  complexity: {
    time: { best: 'O(N·d)', average: 'O(N·d)', worst: 'O(N·d)' },
    space: 'O(N·d)',
    intuition:
      'Each query visits every training point once, computing a d-dimensional Euclidean distance (d multiplications and a square root). This O(N·d) cost is paid at prediction time — there is no pre-training stage — so k-NN is said to be a "lazy learner". Sorting the N distances to pick the top k adds O(N log N), but in practice the linear scan dominates. Memory cost is simply storing all N labeled training points.',
  },
  defaultInput: PRESET_TINY_2CLASS,
  presets: [
    { label: 'Tiny 2-class', input: PRESET_TINY_2CLASS },
    { label: '3-class overlap', input: PRESET_3CLASS },
    { label: 'Single class', input: PRESET_SINGLE },
  ],
  run,
  solutions: KNN_SOLUTIONS,
  examples: [
    {
      title: 'Tiny 2-class, k=3, query near boundary',
      input: PRESET_TINY_2CLASS,
      narration: [
        'We have 8 labeled points: 4 class-0 in the bottom-left blob, 4 class-1 in the top-right blob. Query point (2.8, 2.8) lands roughly in the middle.',
        'For each of the 8 training points we compute Euclidean distance to the query, sort ascending, take the 3 closest. Two of the 3 neighbors vote class-1 and one votes class-0 → predicted label = 1.',
      ],
      output: 'Predicted class: 1',
    },
    {
      title: '3-class, k=5, query in middle region',
      input: PRESET_3CLASS,
      narration: [
        '12 points split evenly into three well-separated blobs: class-0 (left), class-1 (right), class-2 (top). The query (3, 2.5) sits between all three clusters.',
        'After computing 12 distances, the 5 closest include 2 class-0, 2 class-1, and 1 class-2 neighbor — a tie between classes 0 and 1. The tie-break picks the smaller class id → predicted = 0.',
      ],
      output: 'Predicted class: 0',
    },
  ],
  problem: {
    statement:
      'Implement k-nearest-neighbors classification. Read from standard input: first line has three integers N k Q (training points, neighbors, queries). Next N lines each have three integers x y label (integer label in 0..9). Next Q lines each have two integers qx qy. For each query print the predicted integer label, space-separated on one line. Use Euclidean distance; for ties in distance prefer the earlier (smaller-index) point; for ties in the majority vote prefer the smaller label value.',
    signatures: {
      cpp: 'int knnClassify(const vector<Pt>& pts, int k, int qx, int qy)',
      java: 'static int knnClassify(Pt[] pts, int k, int qx, int qy)',
      python: 'def knn_classify(pts: list[tuple[int, int, int]], k: int, qx: int, qy: int) -> int',
    },
    starters: {
      cpp: `#include <bits/stdc++.h>
using namespace std;

struct Pt { int x, y, label; };

int knnClassify(const vector<Pt>& pts, int k, int qx, int qy) {
    // TODO: implement k-NN majority-vote classification
    return -1;
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(nullptr);
    int N, k, Q;
    cin >> N >> k >> Q;
    vector<Pt> pts(N);
    for (int i = 0; i < N; i++) cin >> pts[i].x >> pts[i].y >> pts[i].label;
    for (int q = 0; q < Q; q++) {
        int qx, qy; cin >> qx >> qy;
        if (q > 0) cout << " ";
        cout << knnClassify(pts, k, qx, qy);
    }
    cout << "\\n";
}
`,
      java: `import java.util.*;

public class Main {
    static class Pt { int x, y, label; }

    static int knnClassify(Pt[] pts, int k, int qx, int qy) {
        // TODO: implement k-NN majority-vote classification
        return -1;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int N = sc.nextInt(), k = sc.nextInt(), Q = sc.nextInt();
        Pt[] pts = new Pt[N];
        for (int i = 0; i < N; i++) {
            pts[i] = new Pt();
            pts[i].x = sc.nextInt();
            pts[i].y = sc.nextInt();
            pts[i].label = sc.nextInt();
        }
        StringBuilder sb = new StringBuilder();
        for (int q = 0; q < Q; q++) {
            int qx = sc.nextInt(), qy = sc.nextInt();
            if (q > 0) sb.append(" ");
            sb.append(knnClassify(pts, k, qx, qy));
        }
        System.out.println(sb);
    }
}
`,
      python: `import sys
import math

def knn_classify(pts, k, qx, qy):
    # TODO: implement k-NN majority-vote classification
    return -1

def main():
    data = sys.stdin.read().split()
    idx = 0
    N, k, Q = int(data[idx]), int(data[idx+1]), int(data[idx+2])
    idx += 3
    pts = []
    for _ in range(N):
        x = int(data[idx]); y = int(data[idx+1]); label = int(data[idx+2])
        idx += 3
        pts.append((x, y, label))
    out = []
    for _ in range(Q):
        qx = int(data[idx]); qy = int(data[idx+1])
        idx += 2
        out.append(str(knn_classify(pts, k, qx, qy)))
    print(" ".join(out))

if __name__ == "__main__":
    main()
`,
    },
    expectedBigO: 'O(N)',
    tests: [
      {
        input: `8 3 1
1 1 0
1 1 0
1 2 0
2 0 0
4 4 1
4 3 1
5 4 1
4 5 1
3 3`,
        expected: '1',
        hidden: false,
        label: 'sample 1: 2-class k=3',
      },
      {
        input: `4 1 2
0 0 0
0 0 0
10 10 1
5 5 1
1 1
9 9`,
        expected: '0 1',
        hidden: false,
        label: 'sample 2: k=1 two queries',
      },
      {
        input: `1 1 1
5 5 7
5 5`,
        expected: '7',
        hidden: true,
        label: 'k=1 single point',
      },
      {
        input: `0 0 1
0 0`,
        expected: '-1',
        hidden: true,
        label: 'empty train set',
      },
      {
        input: `6 3 1
0 0 0
0 1 0
1 0 0
0 10 1
1 10 1
10 10 2
2 2`,
        expected: '0',
        hidden: true,
        label: '3-class unambiguous',
      },
      {
        input: `6 3 1
0 0 0
1 1 1
2 2 2
10 0 0
10 1 1
10 2 2
5 1`,
        expected: '0',
        hidden: true,
        label: 'vote tie-break by smaller label',
      },
      {
        input: `5 5 1
1 1 0
2 2 0
-1 -1 1
-2 -2 1
0 0 0
0 0`,
        expected: '0',
        hidden: true,
        label: 'negative coords, k=N',
      },
      {
        input: `10 1 1
0 0 0
0 0 1
0 0 0
0 0 2
0 0 0
0 0 1
0 0 0
0 0 2
0 0 0
0 0 3
0 0`,
        expected: '0',
        hidden: true,
        label: 'duplicate points tie-break by index',
      },
      {
        input: `12 5 1
0 1 0
1 0 0
1 1 0
0 0 0
5 1 1
5 0 1
6 1 1
6 0 1
3 5 2
3 4 2
4 5 2
4 4 2
3 2`,
        expected: '0',
        hidden: true,
        label: '3-class overlap from preset',
      },
      {
        input: (() => {
          const pts: string[] = [];
          for (let i = 0; i < 200; i++) {
            const cls = i < 100 ? 0 : 1;
            const bx = cls === 0 ? -5 : 5;
            const by = (i * 13) % 10;
            pts.push(`${bx + ((i * 7) % 3) - 1} ${by} ${cls}`);
          }
          return `200 11 1\n${pts.join('\n')}\n0 5`;
        })(),
        expected: '0',
        hidden: true,
        label: 'n=200 stress',
      },
    ],
  },
};
