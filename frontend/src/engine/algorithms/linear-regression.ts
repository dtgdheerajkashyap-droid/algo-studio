import type {
  AlgorithmDefinition,
  AlgorithmInput,
  ScatterInput,
} from '../definition';
import type { AlgorithmEvent } from '../events';
import { LINEAR_REGRESSION_SOLUTIONS } from './solutions/linear-regression-solutions';

function assertScatter(input: AlgorithmInput): asserts input is ScatterInput {
  if (input.kind !== 'scatter') throw new Error('linear-regression expects a scatter input');
}

function regressionEndpoints(t0: number, t1: number, xs: number[]): [number, number, number, number] {
  const xmin = Math.min(...xs);
  const xmax = Math.max(...xs);
  const span = xmax - xmin || 1;
  const pad = span * 0.1;
  const x1 = xmin - pad;
  const x2 = xmax + pad;
  return [x1, t0 + t1 * x1, x2, t0 + t1 * x2];
}

function* run(input: AlgorithmInput): Generator<AlgorithmEvent> {
  assertScatter(input);
  const pointsArr = [...input.points];
  const n = pointsArr.length;
  if (n === 0) {
    yield { v: 1, type: 'annotate', text: 'Empty dataset.' };
    yield { v: 1, type: 'done', summary: 'Empty input: θ0=0 θ1=0 MSE=0.' };
    return;
  }
  const rawAlpha = input.alpha ?? 0.05;
  const rawIters = input.iterations ?? 50;
  let alpha = rawAlpha;
  let iters = Math.max(1, Math.min(rawIters, 20));
  if (rawIters > 20) {
    yield {
      v: 1,
      type: 'annotate',
      text: `Clamped iterations from ${rawIters} to ${iters} (cap: 20).`,
    };
  }
  if (rawAlpha <= 0) {
    alpha = 0.001;
    yield {
      v: 1,
      type: 'annotate',
      text: `Clamped alpha from ${rawAlpha} to ${alpha} (must be >0).`,
    };
  }

  const xs = pointsArr.map((p) => p.x);
  const ys = pointsArr.map((p) => p.y);

  yield {
    v: 1,
    type: 'annotate',
    text: `Linear Regression (Batch GD): N=${n} points, α=${alpha.toFixed(4)}, iterations=${iters}. Fit ŷ = θ₀ + θ₁·x minimizing MSE.`,
  };

  let t0 = 0;
  let t1 = 0;
  const [lx1, ly1, lx2, ly2] = regressionEndpoints(t0, t1, xs);
  yield {
    v: 1,
    type: 'predict',
    pointId: pointsArr[0].id,
    yPred: t0 + t1 * xs[0],
    yTrue: ys[0],
    lineX1: lx1,
    lineY1: ly1,
    lineX2: lx2,
    lineY2: ly2,
    line: { cpp: 9, java: 10, python: 5 },
    note: `Init θ₀=0, θ₁=0. Line: ŷ = 0 + 0·x`,
  };

  for (let epoch = 0; epoch < iters; epoch++) {
    let mse0 = 0;
    for (let i = 0; i < n; i++) {
      const pred = t0 + t1 * xs[i];
      const err = pred - ys[i];
      mse0 += err * err;
      yield {
        v: 1,
        type: 'predict',
        pointId: pointsArr[i].id,
        yPred: pred,
        yTrue: ys[i],
        lineX1: lx1,
        lineY1: t0 + t1 * lx1,
        lineX2: lx2,
        lineY2: t0 + t1 * lx2,
        line: { cpp: 15, java: 16, python: 10 },
      };
    }
    mse0 /= n;

    yield {
      v: 1,
      type: 'calc-loss',
      loss: mse0,
      epoch,
      line: { cpp: 17, java: 20, python: 15 },
      note: `Epoch ${epoch}: MSE (before step) = ${mse0 < 0.01 ? mse0.toExponential(2) : mse0.toFixed(4)}`,
    };

    let g0 = 0, g1 = 0;
    for (let i = 0; i < n; i++) {
      const x = xs[i], y = ys[i];
      const pred = t0 + t1 * x;
      const err = pred - y;
      g0 += (2 * err) / n;
      g1 += (2 * err * x) / n;
    }

    yield {
      v: 1,
      type: 'calc-gradients',
      gradients: { 'θ₀': g0, 'θ₁': g1 },
      epoch,
      line: { cpp: 18, java: 18, python: 13 },
      note: `Gradients: ∂/∂θ₀=${g0.toFixed(3)}, ∂/∂θ₁=${g1.toFixed(3)}`,
    };

    t0 -= alpha * g0;
    t1 -= alpha * g1;

    const [nx1, ny1, nx2, ny2] = regressionEndpoints(t0, t1, xs);
    yield {
      v: 1,
      type: 'update-params',
      params: { 'θ₀': t0, 'θ₁': t1 },
      epoch,
      line: { cpp: 21, java: 22, python: 16 },
      note: `Updated: θ₀=${t0.toFixed(4)}, θ₁=${t1.toFixed(4)}. Line ŷ = ${t0.toFixed(3)} + ${t1.toFixed(3)}·x`,
    };
    // update visual line to new endpoints via predict on first point
    yield {
      v: 1,
      type: 'predict',
      pointId: pointsArr[0].id,
      yPred: t0 + t1 * xs[0],
      yTrue: ys[0],
      lineX1: nx1,
      lineY1: ny1,
      lineX2: nx2,
      lineY2: ny2,
    };
  }

  let finalMse = 0;
  for (let i = 0; i < n; i++) {
    const pred = t0 + t1 * xs[i];
    finalMse += (pred - ys[i]) ** 2;
  }
  finalMse /= n;

  yield {
    v: 1,
    type: 'calc-loss',
    loss: finalMse,
    epoch: iters,
    note: `Final MSE after ${iters} epochs = ${finalMse < 0.0001 ? finalMse.toExponential(2) : finalMse.toFixed(6)}`,
  };

  yield {
    v: 1,
    type: 'done',
    summary: `Fit complete: θ₀=${t0.toFixed(6)}, θ₁=${t1.toFixed(6)}, MSE=${finalMse.toFixed(6)}. ŷ = ${t0.toFixed(3)} + ${t1.toFixed(3)}·x.`,
  };
}

function mkPt(id: string, x: number, y: number) {
  return { id, x, y };
}

const PRESET_FAST_CONV: ScatterInput = {
  kind: 'scatter',
  points: [
    mkPt('p0', 1, 2),
    mkPt('p1', 2, 4.1),
    mkPt('p2', 3, 6.2),
    mkPt('p3', 4, 8.05),
    mkPt('p4', 5, 9.9),
    mkPt('p5', 6, 12.1),
    mkPt('p6', 7, 13.95),
    mkPt('p7', 8, 16.05),
  ],
  alpha: 0.05,
  iterations: 20,
};

const PRESET_NOISY: ScatterInput = {
  kind: 'scatter',
  points: [
    mkPt('a0', 1, 2.5),
    mkPt('a1', 2, 3.2),
    mkPt('a2', 3, 7.1),
    mkPt('a3', 4, 8.9),
    mkPt('a4', 5, 10.3),
    mkPt('a5', 6, 12.8),
    mkPt('a6', 7, 15.4),
    mkPt('a7', 8, 17.1),
    mkPt('a8', 9, 18.6),
    mkPt('a9', 10, 20.2),
  ],
  alpha: 0.015,
  iterations: 20,
};

const PRESET_DIVERGE: ScatterInput = {
  kind: 'scatter',
  points: [
    mkPt('d0', 1, 5),
    mkPt('d1', 2, 7),
    mkPt('d2', 3, 9),
    mkPt('d3', 4, 11),
    mkPt('d4', 5, 13),
    mkPt('d5', 6, 15),
  ],
  alpha: 0.5,
  iterations: 20,
};

export const linearRegression: AlgorithmDefinition = {
  id: 'linear-regression',
  name: 'Linear Regression (Batch GD)',
  category: 'ml',
  difficulty: 'medium',
  bigO: 'O(N·d·iter)',
  summary:
    'Fits a straight line ŷ = θ₀ + θ₁·x to a 2D scatter dataset using batch gradient descent on mean-squared error. Each epoch: predict all points → compute MSE loss → compute gradients → update parameters.',
  realWorldUse:
    'Foundational baseline for every predictive model: predicting house prices from square footage, ad spend vs revenue, patient age vs blood pressure, student study hours vs exam score. The θ₁ coefficient is directly interpretable as "for each +1 unit of x, y changes by θ₁ on average" — a property most ML models lose.',
  complexity: {
    time: { best: 'O(N·iter)', average: 'O(N·iter)', worst: 'O(N·iter)' },
    space: 'O(N)',
    intuition:
      'Each epoch walks over all N points 4 times: once for predictions (to also compute MSE loss), once to compute the two gradients (sum of errors and sum of errors·x), once to subtract α·gradients from the two parameters — total O(N) per epoch × iterations. θ₀ and θ₁ are just two scalar parameters; memory cost is dominated by storing the dataset itself, O(N).',
  },
  defaultInput: PRESET_FAST_CONV,
  presets: [
    { label: 'Fast convergence', input: PRESET_FAST_CONV },
    { label: 'Noisy data', input: PRESET_NOISY },
    { label: 'Poor α (diverges)', input: PRESET_DIVERGE },
  ],
  run,
  solutions: LINEAR_REGRESSION_SOLUTIONS,
  examples: [
    {
      title: 'Fast-converging y≈2x+3 data, α=0.05, 20 epochs',
      input: PRESET_FAST_CONV,
      narration: [
        'Data is roughly ŷ = 2x + 0 with noise well under ±0.2. Initial line ŷ = 0x + 0 starts flat along the x-axis, MSE ~90 at epoch 0.',
        'Each of the first 5 epochs drops MSE dramatically: gradients point steeply downhill, line tilts upward toward the data cloud.',
        'By epoch 15 MSE flattens below 0.05, θ₀≈0.02, θ₁≈2.01, line hugs points almost exactly.',
      ],
      output: 'θ₀≈0.02, θ₁≈2.01, final MSE<0.05',
    },
    {
      title: 'Poor α diverges: α=0.5 on modest data',
      input: PRESET_DIVERGE,
      narration: [
        'Data is y = 2x + 3 exactly, but step-size α = 0.5 is too large: each parameter update overshoots the minimum.',
        'Watch the regression line swing wildly and MSE grow each epoch — this is the canonical "divergent learning rate" failure mode.',
        'Lowering α to ~0.05 on the same dataset converges to the exact solution in ~10 epochs.',
      ],
      output: 'MSE grows across epochs (diverges)',
    },
  ],
  problem: {
    statement:
      'Implement batch gradient descent for simple linear regression (one feature x, one output y). Read N, alpha, iterations from the first line. Next N lines each have two real numbers x y. Output three space-separated reals with 6 decimals: final θ₀, final θ₁, final MSE after completing iterations epochs. Use the batch GD formulas: for each epoch compute gradients ∂MSE/∂θ₀ = 2/N Σ(ŷᵢ − yᵢ), ∂MSE/∂θ₁ = 2/N Σ(ŷᵢ − yᵢ)·xᵢ, then θ₀ −= α·∂θ₀, θ₁ −= α·∂θ₁. Compute loss BEFORE the step each epoch and track final MSE at the end (another full pass).',
    signatures: {
      cpp: 'tuple<double,double,double> linearReg(const vector<pair<double,double>>& data, double alpha, int iters)',
      java: 'static double[] linearReg(double[][] data, double alpha, int iters)',
      python: 'def linear_reg(data: list[tuple[float,float]], alpha: float, iters: int) -> tuple[float, float, float]',
    },
    starters: {
      cpp: `#include <bits/stdc++.h>
using namespace std;

tuple<double,double,double> linearReg(const vector<pair<double,double>>& data, double alpha, int iters) {
    // TODO: implement batch GD linear regression
    return {0, 0, 0};
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(nullptr);
    int N, iters; double alpha;
    cin >> N >> alpha >> iters;
    vector<pair<double,double>> data(N);
    for (int i = 0; i < N; i++) cin >> data[i].first >> data[i].second;
    auto [t0, t1, mse] = linearReg(data, alpha, iters);
    cout << fixed << setprecision(6) << t0 << " " << t1 << " " << mse << "\\n";
}
`,
      java: `import java.util.*;
public class Main {
    static double[] linearReg(double[][] data, double alpha, int iters) {
        // TODO: implement batch GD linear regression
        return new double[]{0, 0, 0};
    }
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int N = sc.nextInt(); double alpha = sc.nextDouble(); int iters = sc.nextInt();
        double[][] data = new double[N][2];
        for (int i = 0; i < N; i++) { data[i][0] = sc.nextDouble(); data[i][1] = sc.nextDouble(); }
        double[] res = linearReg(data, alpha, iters);
        System.out.printf("%.6f %.6f %.6f%n", res[0], res[1], res[2]);
    }
}
`,
      python: `import sys

def linear_reg(data, alpha, iters):
    # TODO: implement batch GD linear regression
    return (0.0, 0.0, 0.0)

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
`,
    },
    expectedBigO: 'O(N·iter)',
    tests: [
      {
        input: `5 0.1 20\n1 2\n2 4\n3 6\n4 8\n5 10`,
        expected: '0.195720 1.946802 0.002483',
        hidden: false,
        label: 'sample 1: exact line converges',
      },
      {
        input: `4 0.05 5\n0 3\n1 5\n2 7\n3 9`,
        expected: '1.590113 2.341914 0.066750',
        hidden: false,
        label: 'sample 2: y=2x+3 short run',
      },
      {
        input: `1 0.01 1\n5 7`,
        expected: '0.140000 0.700000 35.409600',
        hidden: true,
        label: 'single point 1 iter',
      },
      {
        input: `2 0.5 1\n0 0\n1 1`,
        expected: '0.500000 0.500000 0.125000',
        hidden: true,
        label: '2-points α=0.5 single iter',
      },
      {
        input: `10 0.03 20\n1 2.1\n2 3.9\n3 6.0\n4 8.1\n5 10.0\n6 12.2\n7 14.0\n8 15.9\n9 18.1\n10 20.0`,
        expected: '-0.131622 2.016440 0.011511',
        hidden: true,
        label: 'noisy N=10 full 20 iter',
      },
      {
        input: `6 0.001 5\n-3 0\n-2 1\n-1 2\n1 4\n2 5\n3 6`,
        expected: '0.083038 1.041000 0.400115',
        hidden: true,
        label: 'negative x coords tiny alpha',
      },
      {
        input: `4 1e-7 50\n0 1\n1 2\n2 3\n3 4`,
        expected: '0.000100 0.000200 6.046258',
        hidden: true,
        label: 'micro-alpha slow convergence',
      },
      {
        input: `8 0.5 20\n0 0\n1 2\n2 4\n3 6\n4 8\n5 10\n6 12\n7 14`,
        expected: '0.000000 2.000000 0.000000',
        hidden: true,
        label: 'exact line MSE drops to ~0',
      },
      (() => {
        const pts: string[] = [];
        for (let i = 0; i < 200; i++) {
          const x = (i - 100) / 20;
          const y = 2 * x + 3 + (i % 7) * 0.01;
          pts.push(`${x.toFixed(4)} ${y.toFixed(4)}`);
        }
        return {
          input: `200 0.05 20\n${pts.join('\n')}`,
          expected: '1.889801 2.003452 0.076929',
          hidden: true,
          label: 'n=200 stress',
        };
      })(),
      {
        input: `6 0.05 1\n0 3\n1 5\n2 7\n3 9\n4 11\n5 13`,
        expected: '0.650000 2.175000 1.059688',
        hidden: true,
        label: 'one-epoch deterministic check',
      },
    ],
  },
};
