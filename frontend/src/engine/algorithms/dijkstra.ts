/**
 * Dijkstra's Shortest Path — AlgorithmDefinition module.
 *
 * Line maps refer to ./solutions/dijkstra-solutions.ts — keep in sync.
 */

import type {
  AlgorithmDefinition,
  AlgorithmInput,
  GraphInput,
} from '../definition';
import type { AlgorithmEvent } from '../events';
import { DIJKSTRA_SOLUTIONS } from './solutions/dijkstra-solutions';

function assertGraph(input: AlgorithmInput): asserts input is GraphInput {
  if (input.kind !== 'graph') throw new Error('dijkstra expects a graph input');
}

interface AdjEntry { to: string; w: number }

/** Build adjacency list with deterministic neighbor order (input edge order). */
function adjacency(g: GraphInput): Map<string, AdjEntry[]> {
  const adj = new Map<string, AdjEntry[]>(g.nodes.map((n) => [n, []]));
  for (const [from, to, w] of g.edges) {
    const weight = w ?? 1;
    adj.get(from)?.push({ to, w: weight });
    if (!g.directed) adj.get(to)?.push({ to: from, w: weight });
  }
  return adj;
}

/** A tiny min-heap of {dist, node}, enough for deterministic visualizer playback. */
class MinPQ {
  private data: Array<{ d: number; u: string }> = [];
  push(d: number, u: string) {
    this.data.push({ d, u });
    let i = this.data.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.data[p].d <= this.data[i].d) break;
      [this.data[p], this.data[i]] = [this.data[i], this.data[p]];
      i = p;
    }
  }
  pop(): { d: number; u: string } | undefined {
    if (this.data.length === 0) return undefined;
    const top = this.data[0];
    const last = this.data.pop()!;
    if (this.data.length > 0) {
      this.data[0] = last;
      let i = 0;
      const n = this.data.length;
      while (true) {
        const l = 2 * i + 1, r = 2 * i + 2;
        let smallest = i;
        if (l < n && this.data[l].d < this.data[smallest].d) smallest = l;
        if (r < n && this.data[r].d < this.data[smallest].d) smallest = r;
        if (smallest === i) break;
        [this.data[smallest], this.data[i]] = [this.data[i], this.data[smallest]];
        i = smallest;
      }
    }
    return top;
  }
  items(): string[] {
    // Snapshot contents in display order: sort by distance, break ties alphabetically.
    return [...this.data]
      .sort((a, b) => a.d - b.d || a.u.localeCompare(b.u))
      .map((x) => x.u);
  }
}

function* run(input: AlgorithmInput): Generator<AlgorithmEvent> {
  assertGraph(input);
  const start = input.start ?? input.nodes[0];
  const adj = adjacency(input);

  const INF = Number.MAX_SAFE_INTEGER;
  const dist = new Map<string, number>(input.nodes.map((n) => [n, INF]));
  dist.set(start, 0);

  yield {
    v: 1,
    type: 'annotate',
    text: `Dijkstra from ${start}: repeatedly finalize the closest node and relax outgoing edges. Weighted${input.directed ? ' directed' : ''} graph with ${input.nodes.length} nodes, ${input.edges.length} edges.`,
  };

  for (const n of input.nodes) {
    yield {
      v: 1,
      type: 'update-node',
      node: n,
      value: n === start ? 0 : '∞',
      line: { cpp: 15, java: 42, python: 70 },
    };
  }

  const pq = new MinPQ();
  pq.push(0, start);
  yield {
    v: 1,
    type: 'discover',
    node: start,
    line: { cpp: 16, java: 43, python: 71 },
    note: `Source ${start} starts at distance 0`,
  };
  yield { v: 1, type: 'frontier', kind: 'priority-queue', items: pq.items(), line: { cpp: 20, java: 47, python: 72 } };

  while (true) {
    const top = pq.pop();
    if (!top) break;
    const { d, u } = top;
    yield { v: 1, type: 'frontier', kind: 'priority-queue', items: pq.items() };
    if (d > (dist.get(u) ?? INF)) {
      yield {
        v: 1,
        type: 'annotate',
        text: `Stale entry for ${u} (${d} vs best ${dist.get(u)}) — skip.`,
        line: { cpp: 23, java: 51, python: 75 },
      };
      continue;
    }
    yield {
      v: 1,
      type: 'visit',
      node: u,
      line: { cpp: 22, java: 49, python: 74 },
      note: `Finalize ${u} with distance ${d}`,
    };
    yield {
      v: 1,
      type: 'update-node',
      node: u,
      value: d,
    };
    for (const { to: v, w } of adj.get(u) ?? []) {
      yield {
        v: 1,
        type: 'traverse-edge',
        from: u,
        to: v,
        line: { cpp: 24, java: 52, python: 77 },
      };
      const du = dist.get(u) ?? INF;
      const dv = dist.get(v) ?? INF;
      if (du !== INF && du + w < dv) {
        const nd = du + w;
        dist.set(v, nd);
        pq.push(nd, v);
        yield {
          v: 1,
          type: 'update-node',
          node: v,
          value: nd,
          line: { cpp: 26, java: 55, python: 79 },
          note: `Relax ${u}→${v}: new distance ${nd} (via ${u} + edge weight ${w})`,
        };
        yield {
          v: 1,
          type: 'discover',
          node: v,
          from: u,
          line: { cpp: 27, java: 56, python: 80 },
          note: `${v} reached via ${u} with dist ${nd}`,
        };
        yield { v: 1, type: 'frontier', kind: 'priority-queue', items: pq.items() };
      }
    }
  }

  const unreached = input.nodes.filter((n) => (dist.get(n) ?? INF) === INF);
  if (unreached.length > 0) {
    yield {
      v: 1,
      type: 'annotate',
      text: `Unreachable from ${start}: ${unreached.join(', ')} (no path).`,
    };
  }

  const summary = input.nodes
    .map((n) => {
      const d = dist.get(n) ?? INF;
      return `${n}=${d === INF ? '∞' : d}`;
    })
    .join(', ');
  yield { v: 1, type: 'done', summary: `Shortest distances from ${start}: ${summary}` };
}

const DEFAULT_GRAPH: GraphInput = {
  kind: 'graph',
  directed: true,
  nodes: ['A', 'B', 'C', 'D', 'E', 'F'],
  edges: [
    ['A', 'B', 4],
    ['A', 'C', 2],
    ['B', 'C', 1],
    ['B', 'D', 5],
    ['C', 'B', 1],
    ['C', 'D', 8],
    ['C', 'E', 10],
    ['D', 'E', 2],
    ['D', 'F', 6],
    ['E', 'F', 3],
  ],
  start: 'A',
};

export const dijkstra: AlgorithmDefinition = {
  id: 'dijkstra',
  name: "Dijkstra's Shortest Path",
  category: 'graph',
  difficulty: 'hard',
  bigO: 'O((V+E) log V)',
  summary:
    'Finds shortest-path distances from a single source in a weighted graph with non-negative edge weights. Repeatedly finalizes the closest unfinalized node and relaxes its outgoing edges, using a min-heap priority queue.',
  realWorldUse:
    'GPS routing (OSRM, Google Maps) with contraction hierarchies, network routing (OSPF/IS-IS link-state protocols), finding cheapest paths in road/flight networks, and anything where "closest first" can be modeled as a graph with positive weights. Also the inner loop in A* search when the heuristic is consistent.',
  complexity: {
    time: { best: 'O((V+E) log V)', average: 'O((V+E) log V)', worst: 'O((V+E) log V)' },
    space: 'O(V)',
    intuition:
      'Every edge triggers at most a few heap operations: each successful relaxation pushes a new {dist, node} pair onto the heap, and each node is popped (finalized) exactly once. With a binary heap each push/pop is O(log V), and we push at most E entries and pop V, yielding O((V+E) log V). A Fibonacci heap would tighten this to O(V log V + E), but in practice binary-heap Dijkstra is hard to beat. The dist array and heap each hold at most V entries: O(V) space.',
  },
  defaultInput: DEFAULT_GRAPH,
  presets: [
    { label: 'Default (directed)', input: DEFAULT_GRAPH },
    {
      label: 'Undirected grid',
      input: {
        kind: 'graph',
        directed: false,
        nodes: ['A', 'B', 'C', 'D', 'E', 'F'],
        edges: [
          ['A', 'B', 1],
          ['B', 'C', 2],
          ['A', 'D', 4],
          ['B', 'E', 3],
          ['C', 'F', 1],
          ['D', 'E', 2],
          ['E', 'F', 5],
        ],
        start: 'A',
      },
    },
    {
      label: 'Disconnected',
      input: {
        kind: 'graph',
        directed: true,
        nodes: ['S', 'A', 'B', 'X', 'Y'],
        edges: [
          ['S', 'A', 2],
          ['A', 'B', 3],
          ['S', 'B', 7],
          ['X', 'Y', 1],
        ],
        start: 'S',
      },
    },
    {
      label: 'Tight triangle',
      input: {
        kind: 'graph',
        directed: true,
        nodes: ['S', 'A', 'T'],
        edges: [
          ['S', 'A', 1],
          ['A', 'T', 1],
          ['S', 'T', 5],
        ],
        start: 'S',
      },
    },
  ],
  run,
  solutions: DIJKSTRA_SOLUTIONS,
  examples: [
    {
      title: 'Default directed graph from A',
      input: DEFAULT_GRAPH,
      narration: [
        'Source A starts at dist 0 and goes onto the priority queue. Pop A (d=0): relax its two edges. A→B of weight 4 gives B a tentative distance of 4; A→C of weight 2 gives C a tentative distance of 2. The heap now holds {C:2, B:4}.',
        'C is closest — pop it (d=2). Relax C→B weight 1: 2+1 = 3 beats B\'s current 4, so B\'s distance drops to 3 and a new {B:3} entry is pushed. Relax C→D (weight 8 → dist 10) and C→E (weight 10 → dist 12).',
        'Continue popping the closest node: B at d=3 (the stale entry at d=4 is popped later and skipped), then D which improves E via D→E weight 2 (10+2=12 ties, no change), then E at 12 relaxes E→F weight 3 → F=15, and finally F is finalized.',
      ],
      output: 'A=0, B=3, C=2, D=8, E=10, F=13',
    },
    {
      title: 'Tight triangle: indirect path wins',
      input: {
        kind: 'graph',
        directed: true,
        nodes: ['S', 'A', 'T'],
        edges: [
          ['S', 'A', 1],
          ['A', 'T', 1],
          ['S', 'T', 5],
        ],
        start: 'S',
      },
      narration: [
        'The direct edge S→T costs 5, but going S→A→T costs only 1+1 = 2. Dijkstra correctly finds the two-hop path because when A is finalized at distance 1, relaxing A→T yields 2, which beats the previously recorded distance of 5 from the direct edge.',
        'Non-negative edge weights guarantee that once a node is popped from the min-heap, its distance is final — no future path through a more distant node can ever improve it.',
      ],
      output: 'S=0, A=1, T=2',
    },
  ],
  problem: {
    statement:
      'Implement Dijkstra\'s shortest-path algorithm. Input: first line has N M S — number of nodes (labeled 0..N-1), number of directed weighted edges, and the start node. The next M lines each contain "u v w" — a directed edge from u to v with non-negative integer weight w. Print the shortest distances from S to every node 0..N-1, space-separated, on one line. Print INF (exactly the three uppercase letters) for nodes unreachable from S. Use a min-heap / priority queue for O((V+E) log V).',
    signatures: {
      cpp: 'std::vector<long long> dijkstra(int n, const std::vector<std::vector<std::pair<int,int>>>& adj, int s)',
      java: 'static long[] dijkstra(int n, List<List<int[]>> adj, int s)',
      python: 'def dijkstra(n: int, adj: list[list[tuple[int, int]]], s: int) -> list[float]',
    },
    starters: {
      cpp: `#include <bits/stdc++.h>
using namespace std;

vector<long long> dijkstra(int n, const vector<vector<pair<int,int>>>& adj, int s) {
    // TODO: implement Dijkstra. Return dist[] with INF = 1e18 for unreachable.
    return {};
}

int main() {
    ios_base::sync_with_stdio(false); cin.tie(nullptr);
    int n, m, s; cin >> n >> m >> s;
    vector<vector<pair<int,int>>> adj(n);
    for (int i = 0; i < m; i++) {
        int u, v, w; cin >> u >> v >> w;
        adj[u].push_back({v, w});
    }
    auto dist = dijkstra(n, adj, s);
    const long long INF = 1e18;
    for (int i = 0; i < n; i++) {
        if (i) cout << ' ';
        if (dist[i] >= INF) cout << "INF";
        else cout << dist[i];
    }
    cout << "\\n";
}
`,
      java: `import java.util.*;

public class Main {
    static long[] dijkstra(int n, List<List<int[]>> adj, int s) {
        // TODO: implement Dijkstra. Use Long.MAX_VALUE for unreachable.
        return new long[0];
    }
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt(), m = sc.nextInt(), s = sc.nextInt();
        List<List<int[]>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int i = 0; i < m; i++) {
            int u = sc.nextInt(), v = sc.nextInt(), w = sc.nextInt();
            adj.get(u).add(new int[]{v, w});
        }
        long[] dist = dijkstra(n, adj, s);
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < n; i++) {
            if (i > 0) sb.append(' ');
            if (dist[i] == Long.MAX_VALUE) sb.append("INF");
            else sb.append(dist[i]);
        }
        System.out.println(sb);
    }
}
`,
      python: `import sys, heapq

def dijkstra(n: int, adj: list[list[tuple[int, int]]], s: int) -> list[float]:
    # TODO: implement Dijkstra. Return dist[] with float('inf') for unreachable.
    return []

def main():
    data = sys.stdin.read().split()
    idx = 0
    n, m, s = int(data[idx]), int(data[idx+1]), int(data[idx+2]); idx += 3
    adj = [[] for _ in range(n)]
    for _ in range(m):
        u, v, w = int(data[idx]), int(data[idx+1]), int(data[idx+2]); idx += 3
        adj[u].append((v, w))
    dist = dijkstra(n, adj, s)
    out = []
    for d in dist:
        out.append("INF" if d == float("inf") else str(int(d)))
    print(" ".join(out))

if __name__ == "__main__":
    main()
`,
    },
    expectedBigO: 'O((V+E) log V)',
    tests: [
      {
        input: '6 10 0\n0 1 4\n0 2 2\n1 2 1\n1 3 5\n2 1 1\n2 3 8\n2 4 10\n3 4 2\n3 5 6\n4 5 3',
        expected: '0 3 2 8 10 13',
        hidden: false,
        label: 'sample 1',
      },
      {
        input: '3 3 0\n0 1 1\n1 2 1\n0 2 5',
        expected: '0 1 2',
        hidden: false,
        label: 'sample 2 (indirect wins)',
      },
      {
        input: '1 0 0',
        expected: '0',
        hidden: true,
        label: 'single node',
      },
      {
        input: '5 3 0\n0 1 2\n1 2 3\n0 2 7',
        expected: '0 2 5 INF INF',
        hidden: true,
        label: 'unreachable nodes',
      },
      {
        input: '4 4 2\n0 1 1\n1 2 2\n2 3 4\n0 3 10',
        expected: 'INF INF 0 4',
        hidden: true,
        label: 'start not 0, unreachable before start',
      },
      {
        input: '4 6 0\n0 1 10\n0 2 5\n1 2 2\n2 1 3\n1 3 1\n2 3 9',
        expected: '0 8 5 9',
        hidden: true,
        label: 'stale heap entries',
      },
      {
        input: '5 0 0',
        expected: '0 INF INF INF INF',
        hidden: true,
        label: 'no edges',
      },
      {
        input: '2 2 0\n0 1 5\n0 1 1',
        expected: '0 1',
        hidden: true,
        label: 'parallel edges',
      },
      {
        input: '7 8 0\n0 1 7\n0 2 9\n0 5 14\n1 2 10\n1 3 15\n2 3 11\n2 5 2\n5 4 9\n3 4 6',
        expected: '0 7 9 20 20 11 INF',
        hidden: true,
        label: 'classic CLRS example',
      },
      {
        input: '5 6 1\n0 1 2\n1 2 3\n2 3 1\n0 3 7\n3 4 4\n1 4 12',
        expected: 'INF 0 3 4 8',
        hidden: true,
        label: 'start=1, unreachable 0',
      },
    ],
  },
};
