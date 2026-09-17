import type { Solution } from '../../definition';

const cpp = `#include <bits/stdc++.h>
using namespace std;

tuple<double,double,double> linearReg(const vector<pair<double,double>>& data,
                                      double alpha, int iters) {
    int n = data.size();
    double t0 = 0, t1 = 0;
    for (int iter = 0; iter < iters; iter++) {
        double g0 = 0, g1 = 0;
        double mse = 0;
        for (int i = 0; i < n; i++) {
            double x = data[i].first, y = data[i].second;
            double pred = t0 + t1 * x;
            double err = pred - y;
            mse += err * err;
            g0 += 2.0 * err / n;
            g1 += 2.0 * err * x / n;
        }
        mse /= n;
        (void)mse;
        t0 -= alpha * g0;
        t1 -= alpha * g1;
    }
    double finalMse = 0;
    for (int i = 0; i < n; i++) {
        double x = data[i].first, y = data[i].second;
        double pred = t0 + t1 * x;
        double err = pred - y;
        finalMse += err * err;
    }
    finalMse /= n;
    return {t0, t1, finalMse};
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(nullptr);
    int N, iters;
    double alpha;
    cin >> N >> alpha >> iters;
    vector<pair<double,double>> data(N);
    for (int i = 0; i < N; i++) cin >> data[i].first >> data[i].second;
    auto [t0, t1, mse] = linearReg(data, alpha, iters);
    cout << fixed << setprecision(6) << t0 << " " << t1 << " " << mse << "\\n";
}
`;

const java = `import java.util.*;

public class Main {
    static double[] linearReg(double[][] data, double alpha, int iters) {
        int n = data.length;
        double t0 = 0, t1 = 0;
        for (int iter = 0; iter < iters; iter++) {
            double g0 = 0, g1 = 0;
            for (int i = 0; i < n; i++) {
                double x = data[i][0], y = data[i][1];
                double pred = t0 + t1 * x;
                double err = pred - y;
                g0 += 2.0 * err / n;
                g1 += 2.0 * err * x / n;
            }
            t0 -= alpha * g0;
            t1 -= alpha * g1;
        }
        double mse = 0;
        for (int i = 0; i < n; i++) {
            double x = data[i][0], y = data[i][1];
            double pred = t0 + t1 * x;
            double err = pred - y;
            mse += err * err;
        }
        mse /= n;
        return new double[]{t0, t1, mse};
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int N = sc.nextInt();
        double alpha = sc.nextDouble();
        int iters = sc.nextInt();
        double[][] data = new double[N][2];
        for (int i = 0; i < N; i++) {
            data[i][0] = sc.nextDouble();
            data[i][1] = sc.nextDouble();
        }
        double[] res = linearReg(data, alpha, iters);
        System.out.printf("%.6f %.6f %.6f%n", res[0], res[1], res[2]);
    }
}
`;

const python = `import sys

def linear_reg(data, alpha, iters):
    n = len(data)
    t0, t1 = 0.0, 0.0
    for _ in range(iters):
        g0, g1 = 0.0, 0.0
        for i in range(n):
            x, y = data[i]
            pred = t0 + t1 * x
            err = pred - y
            g0 += 2.0 * err / n
            g1 += 2.0 * err * x / n
        t0 -= alpha * g0
        t1 -= alpha * g1
    final_mse = 0.0
    for i in range(n):
        x, y = data[i]
        pred = t0 + t1 * x
        err = pred - y
        final_mse += err * err
    final_mse /= n
    return (t0, t1, final_mse)

def main():
    data_in = sys.stdin.read().split()
    idx = 0
    N = int(data_in[idx]); idx += 1
    alpha = float(data_in[idx]); idx += 1
    iters = int(data_in[idx]); idx += 1
    data = []
    for _ in range(N):
        x = float(data_in[idx]); idx += 1
        y = float(data_in[idx]); idx += 1
        data.append((x, y))
    t0, t1, mse = linear_reg(data, alpha, iters)
    print(f"{t0:.6f} {t1:.6f} {mse:.6f}")

if __name__ == "__main__":
    main()
`;

export const LINEAR_REGRESSION_SOLUTIONS: Solution[] = [
  { language: 'cpp', code: cpp },
  { language: 'java', code: java },
  { language: 'python', code: python },
];
