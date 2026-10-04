import type { Solution } from '../../definition';

const cpp = `#include <bits/stdc++.h>
using namespace std;

struct Pt { int x, y, label; };

int knnClassify(const vector<Pt>& pts, int k, int qx, int qy) {
    int n = pts.size();
    vector<pair<double, pair<int, int>>> dists;
    for (int i = 0; i < n; i++) {
        double dx = pts[i].x - qx;
        double dy = pts[i].y - qy;
        double d = sqrt(dx * dx + dy * dy);
        dists.push_back({d, {i, pts[i].label}});
    }
    sort(dists.begin(), dists.end());
    map<int, int> cnt;
    for (int i = 0; i < min(k, (int)dists.size()); i++) {
        cnt[dists[i].second.second]++;
    }
    int bestLabel = -1, bestCnt = -1;
    for (auto& p : cnt) {
        if (p.second > bestCnt) {
            bestCnt = p.second;
            bestLabel = p.first;
        }
    }
    return bestLabel;
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(nullptr);
    int N, k, Q;
    cin >> N >> k >> Q;
    vector<Pt> pts(N);
    for (int i = 0; i < N; i++) {
        cin >> pts[i].x >> pts[i].y >> pts[i].label;
    }
    for (int q = 0; q < Q; q++) {
        int qx, qy;
        cin >> qx >> qy;
        if (q > 0) cout << " ";
        cout << knnClassify(pts, k, qx, qy);
    }
    cout << "\\n";
}
`;

const java = `import java.util.*;

public class Main {
    static class Pt { int x, y, label; }

    static int knnClassify(Pt[] pts, int k, int qx, int qy) {
        int n = pts.length;
        double[][] dists = new double[n][3];
        for (int i = 0; i < n; i++) {
            double dx = pts[i].x - qx;
            double dy = pts[i].y - qy;
            dists[i][0] = Math.sqrt(dx * dx + dy * dy);
            dists[i][1] = i;
            dists[i][2] = pts[i].label;
        }
        Arrays.sort(dists, (a, b) -> {
            int cmp = Double.compare(a[0], b[0]);
            if (cmp != 0) return cmp;
            cmp = Double.compare(a[1], b[1]);
            if (cmp != 0) return cmp;
            return Double.compare(a[2], b[2]);
        });
        TreeMap<Integer, Integer> cnt = new TreeMap<>();  // ascending: vote ties -> smaller label
        for (int i = 0; i < Math.min(k, dists.length); i++) {
            int label = (int) dists[i][2];
            cnt.put(label, cnt.getOrDefault(label, 0) + 1);
        }
        int bestLabel = -1, bestCnt = -1;
        for (Map.Entry<Integer, Integer> e : cnt.entrySet()) {
            if (e.getValue() > bestCnt) {
                bestCnt = e.getValue();
                bestLabel = e.getKey();
            }
        }
        return bestLabel;
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
`;

const python = `import sys
import math

def knn_classify(pts, k, qx, qy):
    n = len(pts)
    dists = []
    for i in range(n):
        x, y, label = pts[i]
        dx = x - qx
        dy = y - qy
        d = math.sqrt(dx * dx + dy * dy)
        dists.append((d, i, label))
    dists.sort()
    cnt = {}
    for i in range(min(k, len(dists))):
        label = dists[i][2]
        cnt[label] = cnt.get(label, 0) + 1
    best_label, best_cnt = -1, -1
    for label, count in sorted(cnt.items()):  # ascending: vote ties -> smaller label
        if count > best_cnt:
            best_cnt = count
            best_label = label
    return best_label

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
`;

export const KNN_SOLUTIONS: Solution[] = [
  { language: 'cpp', code: cpp },
  { language: 'java', code: java },
  { language: 'python', code: python },
];
