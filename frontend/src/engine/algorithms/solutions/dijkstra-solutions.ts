/**
 * Dijkstra reference solutions. Line maps in ../dijkstra.ts point here — keep in sync.
 */

import type { Solution } from '../../definition';

const cpp = `#include <vector>
#include <queue>
using namespace std;
const long long INF = 1e18;

// Dijkstra: repeatedly finalize the closest node, relax its edges.
// adj[u] = {v, w} pairs. Returns dist[] with INF for unreachable.
vector<long long> dijkstra(int n, const vector<vector<pair<int,int>>>& adj, int s) {
    vector<long long> dist(n, INF);
    dist[s] = 0;                      // source is 0 away from itself
    // Min-heap of {distance, node} — smallest distance on top.
    priority_queue<pair<long long,int>,
                   vector<pair<long long,int>>, greater<>> pq;
    pq.push({0, s});
    while (!pq.empty()) {
        auto [d, u] = pq.top(); pq.pop();   // closest unfinalized node
        if (d > dist[u]) continue;          // stale entry: already improved
        for (auto [v, w] : adj[u]) {
            if (dist[u] + w < dist[v]) {    // found a shorter path to v?
                dist[v] = dist[u] + w;      // relax the edge
                pq.push({dist[v], v});
            }
        }
    }
    return dist;
}
`;

const java = `import java.util.*;

// Dijkstra: repeatedly finalize the closest node, relax its edges.
class Dijkstra {
    // adj.get(u) = int[]{v, w} pairs. Long.MAX_VALUE marks unreachable.
    static long[] dijkstra(int n, List<List<int[]>> adj, int s) {
        long[] dist = new long[n];
        Arrays.fill(dist, Long.MAX_VALUE);
        dist[s] = 0;                        // source is 0 away from itself
        // Min-heap of {distance, node} — smallest distance on top.
        PriorityQueue<long[]> pq =
            new PriorityQueue<>((a, b) -> Long.compare(a[0], b[0]));
        pq.add(new long[]{0, s});
        while (!pq.isEmpty()) {
            long[] top = pq.poll();         // closest unfinalized node
            long d = top[0]; int u = (int) top[1];
            if (d > dist[u]) continue;      // stale entry: already improved
            for (int[] e : adj.get(u)) {
                int v = e[0], w = e[1];
                if (dist[u] + w < dist[v]) {   // found a shorter path to v?
                    dist[v] = dist[u] + w;     // relax the edge
                    pq.add(new long[]{dist[v], v});
                }
            }
        }
        return dist;
    }
}
`;

const python = `import heapq

def dijkstra(n: int, adj: list[list[tuple[int, int]]], s: int) -> list[float]:
    """Dijkstra: repeatedly finalize the closest node, relax its edges."""
    INF = float("inf")
    dist = [INF] * n
    dist[s] = 0                       # source is 0 away from itself
    pq = [(0, s)]                     # min-heap of (distance, node)
    while pq:
        d, u = heapq.heappop(pq)      # closest unfinalized node
        if d > dist[u]:               # stale entry: already improved
            continue
        for v, w in adj[u]:
            if dist[u] + w < dist[v]:     # found a shorter path to v?
                dist[v] = dist[u] + w     # relax the edge
                heapq.heappush(pq, (dist[v], v))
    return dist
`;

export const DIJKSTRA_SOLUTIONS: Solution[] = [
  { language: 'cpp', code: cpp },
  { language: 'java', code: java },
  { language: 'python', code: python },
];
