import type { Solution } from '../../definition';

const cpp = `#include <bits/stdc++.h>
using namespace std;

tuple<double,double,double,int> perceptron(const vector<pair<double,double>>& pts,
                                            const vector<int>& labels,
                                            double alpha, int maxEpoch) {
    int n = pts.size();
    vector<int> y(n);
    if (n > 0) {
        set<int> seen;
        map<int,int> binarize;
        for (int i = 0; i < n; i++) seen.insert(labels[i]);
        int first = *seen.begin();
        for (int i = 0; i < n; i++) y[i] = (labels[i] == first) ? -1 : +1;
    }
    double w0 = 0, w1 = 0, w2 = 0;
    int convergedEpoch = -1;
    for (int epoch = 0; epoch < maxEpoch; epoch++) {
        int misses = 0;
        for (int i = 0; i < n; i++) {
            double x1 = pts[i].first, x2 = pts[i].second;
            double a = w0 * 1.0 + w1 * x1 + w2 * x2;
            int pred = (a >= 0) ? +1 : -1;
            if (pred != y[i]) {
                misses++;
                w0 += alpha * (y[i] - pred) * 1.0;
                w1 += alpha * (y[i] - pred) * x1;
                w2 += alpha * (y[i] - pred) * x2;
            }
        }
        if (misses == 0) {
            convergedEpoch = epoch + 1;
            break;
        }
    }
    return {w0, w1, w2, convergedEpoch};
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(nullptr);
    int N, maxEpoch; double alpha;
    cin >> N >> alpha >> maxEpoch;
    vector<pair<double,double>> pts(N);
    vector<int> labels(N);
    for (int i = 0; i < N; i++) {
        cin >> pts[i].first >> pts[i].second >> labels[i];
    }
    auto [w0, w1, w2, ep] = perceptron(pts, labels, alpha, maxEpoch);
    cout << fixed << setprecision(6) << w0 << " " << w1 << " " << w2 << " " << ep << "\\n";
}
`;

const java = `import java.util.*;

public class Main {
    static double[] perceptron(double[][] pts, int[] labels, double alpha, int maxEpoch) {
        int n = pts.length;
        int[] y = new int[n];
        if (n > 0) {
            TreeSet<Integer> seen = new TreeSet<>();
            for (int i = 0; i < n; i++) seen.add(labels[i]);
            int first = seen.first();
            for (int i = 0; i < n; i++) y[i] = (labels[i] == first) ? -1 : +1;
        }
        double w0 = 0, w1 = 0, w2 = 0;
        int convergedEpoch = -1;
        for (int epoch = 0; epoch < maxEpoch; epoch++) {
            int misses = 0;
            for (int i = 0; i < n; i++) {
                double x1 = pts[i][0], x2 = pts[i][1];
                double a = w0 + w1 * x1 + w2 * x2;
                int pred = (a >= 0) ? +1 : -1;
                if (pred != y[i]) {
                    misses++;
                    w0 += alpha * (y[i] - pred) * 1.0;
                    w1 += alpha * (y[i] - pred) * x1;
                    w2 += alpha * (y[i] - pred) * x2;
                }
            }
            if (misses == 0) {
                convergedEpoch = epoch + 1;
                break;
            }
        }
        return new double[]{w0, w1, w2, convergedEpoch};
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int N = sc.nextInt();
        double alpha = sc.nextDouble();
        int maxEpoch = sc.nextInt();
        double[][] pts = new double[N][2];
        int[] labels = new int[N];
        for (int i = 0; i < N; i++) {
            pts[i][0] = sc.nextDouble();
            pts[i][1] = sc.nextDouble();
            labels[i] = sc.nextInt();
        }
        double[] res = perceptron(pts, labels, alpha, maxEpoch);
        System.out.printf("%.6f %.6f %.6f %.0f%n", res[0], res[1], res[2], res[3]);
    }
}
`;

const python = `import sys

def perceptron(pts, labels, alpha, max_epoch):
    n = len(pts)
    y = [0] * n
    if n > 0:
        seen = sorted(set(labels))
        first = seen[0]
        for i in range(n):
            y[i] = -1 if labels[i] == first else +1
    w0, w1, w2 = 0.0, 0.0, 0.0
    converged_epoch = -1
    for epoch in range(max_epoch):
        misses = 0
        for i in range(n):
            x1, x2 = pts[i]
            a = w0 + w1 * x1 + w2 * x2
            pred = +1 if a >= 0 else -1
            if pred != y[i]:
                misses += 1
                w0 += alpha * (y[i] - pred) * 1.0
                w1 += alpha * (y[i] - pred) * x1
                w2 += alpha * (y[i] - pred) * x2
        if misses == 0:
            converged_epoch = epoch + 1
            break
    return (w0, w1, w2, converged_epoch)

def main():
    data = sys.stdin.read().split()
    idx = 0
    N = int(data[idx]); idx += 1
    alpha = float(data[idx]); idx += 1
    max_epoch = int(data[idx]); idx += 1
    pts = []
    labels = []
    for _ in range(N):
        x1 = float(data[idx]); idx += 1
        x2 = float(data[idx]); idx += 1
        lab = int(data[idx]); idx += 1
        pts.append((x1, x2))
        labels.append(lab)
    w0, w1, w2, ep = perceptron(pts, labels, alpha, max_epoch)
    print(f"{w0:.6f} {w1:.6f} {w2:.6f} {ep}")

if __name__ == "__main__":
    main()
`;

export const PERCEPTRON_SOLUTIONS: Solution[] = [
  { language: 'cpp', code: cpp },
  { language: 'java', code: java },
  { language: 'python', code: python },
];
