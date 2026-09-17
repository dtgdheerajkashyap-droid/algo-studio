import type { Solution } from '../../definition';

const cpp = `#include <bits/stdc++.h>
using namespace std;

typedef pair<double,double> Pt;

vector<int> kmeans(const vector<Pt>& pts, int k, int seed, int maxIter=20) {
    int n = pts.size();
    vector<Pt> centroids(k);
    if (seed == 0) {
        for (int i = 0; i < k; i++)
            centroids[i] = pts[i % n];
    } else {
        int s = seed;
        for (int i = 0; i < k; i++) {
            centroids[i] = pts[(i + s) % n];
            s = (s * 7 + 13) % max(n, 1);
        }
    }
    vector<int> assign(n, 0);
    for (int iter = 0; iter < maxIter; iter++) {
        for (int i = 0; i < n; i++) {
            double best = 1e18;
            int bc = -1;
            for (int c = 0; c < k; c++) {
                double dx = pts[i].first  - centroids[c].first;
                double dy = pts[i].second - centroids[c].second;
                double d2 = dx*dx + dy*dy;
                if (d2 < best) { best = d2; bc = c; }
            }
            assign[i] = bc;
        }
        vector<Pt> sums(k, {0, 0});
        vector<int> cnt(k, 0);
        for (int i = 0; i < n; i++) {
            sums[assign[i]].first  += pts[i].first;
            sums[assign[i]].second += pts[i].second;
            cnt[assign[i]]++;
        }
        int changed = 0;
        for (int c = 0; c < k; c++) {
            Pt newC = (cnt[c] > 0)
                ? Pt{ sums[c].first / cnt[c], sums[c].second / cnt[c] }
                : centroids[c];
            if (fabs(newC.first  - centroids[c].first)  > 1e-12 ||
                fabs(newC.second - centroids[c].second) > 1e-12)
                changed++;
            centroids[c] = newC;
        }
        if (changed == 0) break;
    }
    return assign;
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
`;

const java = `import java.util.*;

public class Main {
    static class Pt { double x, y; Pt(double a,double b){x=a;y=b;} }

    static int[] kmeans(Pt[] pts, int k, int seed, int maxIter) {
        int n = pts.length;
        Pt[] centroids = new Pt[k];
        if (seed == 0) {
            for (int i = 0; i < k; i++)
                centroids[i] = new Pt(pts[i % n].x, pts[i % n].y);
        } else {
            int s = seed;
            for (int i = 0; i < k; i++) {
                Pt src = pts[(i + s) % n];
                centroids[i] = new Pt(src.x, src.y);
                s = (s * 7 + 13) % Math.max(n, 1);
            }
        }
        int[] assign = new int[n];
        for (int iter = 0; iter < maxIter; iter++) {
            for (int i = 0; i < n; i++) {
                double best = 1e18;
                int bc = -1;
                for (int c = 0; c < k; c++) {
                    double dx = pts[i].x - centroids[c].x;
                    double dy = pts[i].y - centroids[c].y;
                    double d2 = dx*dx + dy*dy;
                    if (d2 < best) { best = d2; bc = c; }
                }
                assign[i] = bc;
            }
            double[] sumX = new double[k], sumY = new double[k];
            int[] cnt = new int[k];
            for (int i = 0; i < n; i++) {
                sumX[assign[i]] += pts[i].x;
                sumY[assign[i]] += pts[i].y;
                cnt[assign[i]]++;
            }
            int changed = 0;
            for (int c = 0; c < k; c++) {
                double nx = cnt[c] > 0 ? sumX[c] / cnt[c] : centroids[c].x;
                double ny = cnt[c] > 0 ? sumY[c] / cnt[c] : centroids[c].y;
                if (Math.abs(nx - centroids[c].x) > 1e-12 ||
                    Math.abs(ny - centroids[c].y) > 1e-12)
                    changed++;
                centroids[c] = new Pt(nx, ny);
            }
            if (changed == 0) break;
        }
        return assign;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int N = sc.nextInt(), k = sc.nextInt(), seed = sc.nextInt(), maxIter = sc.nextInt();
        Pt[] pts = new Pt[N];
        for (int i = 0; i < N; i++)
            pts[i] = new Pt(sc.nextDouble(), sc.nextDouble());
        int[] res = kmeans(pts, k, seed, maxIter);
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < N; i++) {
            if (i > 0) sb.append(",");
            sb.append(res[i]);
        }
        System.out.println(sb);
    }
}
`;

const python = `import math
import sys

def kmeans(pts, k, seed, max_iter=20):
    n = len(pts)
    centroids = [(0.0, 0.0)] * k
    if seed == 0:
        for i in range(k):
            centroids[i] = (float(pts[i % n][0]), float(pts[i % n][1]))
    else:
        s = seed
        for i in range(k):
            src = pts[(i + s) % n]
            centroids[i] = (float(src[0]), float(src[1]))
            s = (s * 7 + 13) % max(n, 1)
    assign = [0] * n
    for _it in range(max_iter):
        for i in range(n):
            best = 1e18
            bc = -1
            for c in range(k):
                dx = pts[i][0] - centroids[c][0]
                dy = pts[i][1] - centroids[c][1]
                d2 = dx*dx + dy*dy
                if d2 < best:
                    best = d2
                    bc = c
            assign[i] = bc
        sum_x = [0.0] * k
        sum_y = [0.0] * k
        cnt = [0] * k
        for i in range(n):
            sum_x[assign[i]] += pts[i][0]
            sum_y[assign[i]] += pts[i][1]
            cnt[assign[i]] += 1
        changed = 0
        for c in range(k):
            if cnt[c] > 0:
                nx = sum_x[c] / cnt[c]
                ny = sum_y[c] / cnt[c]
            else:
                nx, ny = centroids[c]
            if abs(nx - centroids[c][0]) > 1e-12 or abs(ny - centroids[c][1]) > 1e-12:
                changed += 1
            centroids[c] = (nx, ny)
        if changed == 0:
            break
    return assign

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
`;

export const KMEANS_SOLUTIONS: Solution[] = [
  { language: 'cpp', code: cpp },
  { language: 'java', code: java },
  { language: 'python', code: python },
];
