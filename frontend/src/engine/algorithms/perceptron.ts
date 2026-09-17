import type {
  AlgorithmDefinition,
  AlgorithmInput,
  ScatterInput,
} from '../definition';
import type { AlgorithmEvent } from '../events';
import { PERCEPTRON_SOLUTIONS } from './solutions/perceptron-solutions';

function assertScatter(input: AlgorithmInput): asserts input is ScatterInput {
  if (input.kind !== 'scatter') throw new Error('perceptron expects a scatter input');
}

function decisionBoundary(w0: number, w1: number, w2: number, xs: number[]): [number, number, number, number] {
  const xmin = Math.min(...xs);
  const xmax = Math.max(...xs);
  const span = xmax - xmin || 1;
  const pad = span * 0.2;
  const x1 = xmin - pad;
  const x2 = xmax + pad;
  let y1: number, y2: number;
  if (Math.abs(w2) > 1e-9) {
    y1 = (-w0 - w1 * x1) / w2;
    y2 = (-w0 - w1 * x2) / w2;
  } else if (Math.abs(w1) > 1e-9) {
    const x0 = -w0 / w1;
    y1 = xmin - pad;
    y2 = xmax + pad;
    return [x0, y1, x0, y2];
  } else {
    y1 = 0;
    y2 = 0;
  }
  return [x1, y1, x2, y2];
}

function* run(input: AlgorithmInput): Generator<AlgorithmEvent> {
  assertScatter(input);
  const pointsArr = [...input.points];
  const n = pointsArr.length;
  const rawAlpha = input.alpha ?? 1;
  const rawMax = input.iterations ?? 50;
  let alpha = rawAlpha;
  const maxEpoch = Math.max(1, Math.min(rawMax, 50));
  if (rawAlpha <= 0) {
    alpha = 0.01;
    yield { v: 1, type: 'annotate', text: `Clamped alpha from ${rawAlpha} to ${alpha}.` };
  }
  if (rawMax > 50) {
    yield { v: 1, type: 'annotate', text: `Clamped max epochs from ${rawMax} to ${maxEpoch}.` };
  }
  if (n === 0) {
    yield { v: 1, type: 'done', summary: 'Empty dataset: w=(0,0,0), epoch=-1.' };
    return;
  }

  const xs = pointsArr.map((p) => p.x);

  const uniqueLabels = Array.from(new Set(pointsArr.map((p) => String(p.label ?? 0)))).sort();
  const first = uniqueLabels[0];
  const binarized: number[] = pointsArr.map((p) => (String(p.label ?? 0) === first ? -1 : +1));

  yield {
    v: 1,
    type: 'annotate',
    text: `Perceptron: N=${n}, α=${alpha.toFixed(3)}, max epochs=${maxEpoch}. Labels {${uniqueLabels.join(',')}} binarized to: "${first}" → -1, others → +1. w=[0,0,0] init.`,
  };

  let w0 = 0, w1 = 0, w2 = 0;
  let convergedEpoch = -1;

  {
    const [lx1, ly1, lx2, ly2] = decisionBoundary(w0, w1, w2, xs);
    yield {
      v: 1,
      type: 'predict',
      pointId: pointsArr[0].id,
      yPred: 0,
      yTrue: binarized[0],
      lineX1: lx1,
      lineY1: ly1,
      lineX2: lx2,
      lineY2: ly2,
      line: { cpp: 12, java: 13, python: 7 },
      note: `w = [${w0.toFixed(2)}, ${w1.toFixed(2)}, ${w2.toFixed(2)}] — decision boundary initialized.`,
    };
  }

  for (let epoch = 0; epoch < maxEpoch && convergedEpoch < 0; epoch++) {
    let misses = 0;
    yield {
      v: 1,
      type: 'highlight-line',
      line: { cpp: 15, java: 16, python: 10 },
      note: `Epoch ${epoch + 1} — scan all ${n} points and update weights on misclassification.`,
    };

    for (let i = 0; i < n; i++) {
      const p = pointsArr[i];
      const x1 = p.x, x2 = p.y;
      const activation = w0 + w1 * x1 + w2 * x2;
      const pred = activation >= 0 ? +1 : -1;
      yield {
        v: 1,
        type: 'compute-activation',
        pointId: p.id,
        activation,
        predictedSign: pred,
        line: { cpp: 19, java: 20, python: 14 },
      };

      const trueY = binarized[i];
      const isWrong = pred !== trueY;
      yield {
        v: 1,
        type: 'misclassify-check',
        pointId: p.id,
        predictedSign: pred,
        trueLabel: trueY,
        isWrong,
        line: { cpp: 20, java: 21, python: 15 },
        note: isWrong
          ? `Misclassified point ${p.id}: pred=sign(${activation.toFixed(2)})=${pred}, label=${trueY} → update w.`
          : `OK: pred=${pred} == label=${trueY}.`,
      };

      if (isWrong) {
        misses++;
        const delta = trueY - pred;
        w0 += alpha * delta * 1.0;
        w1 += alpha * delta * x1;
        w2 += alpha * delta * x2;
        yield {
          v: 1,
          type: 'update-params',
          params: { 'w₀': w0, 'w₁': w1, 'w₂': w2 },
          line: { cpp: 22, java: 23, python: 18 },
          note: `w += α·(${trueY}−${pred})·(1,${x1},${x2}) → [${w0.toFixed(2)}, ${w1.toFixed(2)}, ${w2.toFixed(2)}]`,
        };
        const [lx1, ly1, lx2, ly2] = decisionBoundary(w0, w1, w2, xs);
        yield {
          v: 1,
          type: 'predict',
          pointId: p.id,
          yPred: pred,
          yTrue: trueY,
          lineX1: lx1,
          lineY1: ly1,
          lineX2: lx2,
          lineY2: ly2,
        };
      }
    }

    yield {
      v: 1,
      type: 'convergence-check',
      iteration: epoch + 1,
      changedCount: misses,
      converged: misses === 0,
      note: misses === 0
        ? `Epoch ${epoch + 1}: 0 misclassifications → perceptron converged.`
        : `Epoch ${epoch + 1}: ${misses}/${n} misclassified. Continue.`,
    };

    if (misses === 0) convergedEpoch = epoch + 1;
  }

  {
    const [lx1, ly1, lx2, ly2] = decisionBoundary(w0, w1, w2, xs);
    yield {
      v: 1,
      type: 'predict',
      pointId: pointsArr[0].id,
      yPred: 0,
      yTrue: binarized[0],
      lineX1: lx1,
      lineY1: ly1,
      lineX2: lx2,
      lineY2: ly2,
    };
  }

  yield {
    v: 1,
    type: 'done',
    summary: `Perceptron finished. w = [${w0.toFixed(4)}, ${w1.toFixed(4)}, ${w2.toFixed(4)}]. ${
      convergedEpoch > 0 ? `Converged at epoch ${convergedEpoch} with 0 errors.` : `Did not converge in ${maxEpoch} epoch(s).`
    }`,
  };
}

function mkPt(id: string, x: number, y: number, label: number) {
  return { id, x, y, label };
}

const PRESET_SEPARABLE: ScatterInput = {
  kind: 'scatter',
  points: [
    mkPt('s0', -3, -2, 0),
    mkPt('s1', -2, -1, 0),
    mkPt('s2', -3, 0, 0),
    mkPt('s3', -1, -3, 0),
    mkPt('s4', -2, -2, 0),
    mkPt('s5', -4, -1, 0),
    mkPt('s6', 3, 2, 1),
    mkPt('s7', 2, 1, 1),
    mkPt('s8', 3, 0, 1),
    mkPt('s9', 1, 3, 1),
    mkPt('sA', 2, 2, 1),
    mkPt('sB', 4, 1, 1),
  ],
  alpha: 1,
  iterations: 50,
};

const PRESET_OSCILLATE: ScatterInput = {
  kind: 'scatter',
  points: [
    mkPt('a0', -2, 0, 0),
    mkPt('a1', -1, 1, 0),
    mkPt('a2', 0, 0, 0),
    mkPt('a3', 1, -1, 0),
    mkPt('b0', 1, 0, 1),
    mkPt('b1', 2, 1, 1),
    mkPt('b2', 3, 0, 1),
    mkPt('b3', 0, 1, 1),
  ],
  alpha: 1,
  iterations: 50,
};

const PRESET_INSEPARABLE: ScatterInput = {
  kind: 'scatter',
  points: [
    mkPt('x0', 0, 0, 0),
    mkPt('x1', 1, 1, 0),
    mkPt('x2', 0, 1, 1),
    mkPt('x3', 1, 0, 1),
    mkPt('x4', -1, 0, 0),
    mkPt('x5', 2, 2, 0),
    mkPt('x6', -1, 2, 1),
    mkPt('x7', 2, -1, 1),
  ],
  alpha: 0.5,
  iterations: 50,
};

export const perceptron: AlgorithmDefinition = {
  id: 'perceptron',
  name: 'Perceptron Learning',
  category: 'ml',
  difficulty: 'medium',
  bigO: 'O(N·d·epochs)',
  summary:
    'The classic binary linear classifier: start with w = [0, 0, 0], repeatedly scan points and add α·(y − ŷ)·x⃗ to w on every misclassification, until a full zero-misclassification epoch or a max epoch cap is hit.',
  realWorldUse:
    'The 1958 Rosenblatt perceptron is the simplest trainable neural unit. Historically it proved learnable linear-separable concepts exist; practically it underpins support-vector machines (the SVM primal is a perceptron with margin loss) and logistic regression gradient ascent. Today it is taught as the canonical error-driven online learner and the basis for modern neural-net gradient-descent.',
  complexity: {
    time: { best: 'O(N·d)', average: 'O(N·d·epochs)', worst: 'O(N·d·epochs)' },
    space: 'O(N·d + d)',
    intuition:
      'In each epoch the algorithm scans N points. Per point it computes a d-dimensional dot product (d = number of features + 1 bias) and performs up to d scalar additions to update the weight vector if misclassified: O(N·d) per epoch × epochs. The perceptron convergence theorem guarantees the procedure halts after a bounded number of updates IF the dataset is linearly separable with margin γ and max-norm R: at most (R/γ)² updates. If not linearly separable, learning oscillates and we rely on the epoch cap. Memory is O(N·d) for the dataset plus O(d) for w.',
  },
  defaultInput: PRESET_SEPARABLE,
  presets: [
    { label: 'Linearly separable', input: PRESET_SEPARABLE },
    { label: 'Nearly separable (oscillates)', input: PRESET_OSCILLATE },
    { label: 'Inseparable XOR-style', input: PRESET_INSEPARABLE },
  ],
  run,
  solutions: PERCEPTRON_SOLUTIONS,
  examples: [
    {
      title: 'Linearly separable 2-blob, α=1, converges in ≤5 epochs',
      input: PRESET_SEPARABLE,
      narration: [
        '6 class-0 points in the bottom-left half-plane, 6 class-1 in the top-right — cleanly linearly separable. w starts at origin, decision boundary undefined.',
        'Epoch 1 walks the list: the first misclassified point pushes w toward the correct half-plane. Each weight-update visibly rotates the decision boundary line in the visualization.',
        'By epoch 2 or 3 the entire dataset has zero misclassifications and the procedure halts with a converged boundary cleanly separating the two blobs.',
      ],
      output: `Converges typically in 2–4 epochs; w reports convergedEpoch ∈ [1, 5].`,
    },
    {
      title: 'XOR-style inseparable dataset: maxEpoch reached without converge',
      input: PRESET_INSEPARABLE,
      narration: [
        'Two classes sit in opposite quadrants: class-0 at (0,0) and (1,1), class-1 at (0,1) and (1,0), surrounded by outer points. No straight line can separate them — this is the classic XOR problem.',
        'Each epoch shuffles some misclassified points but never a full epoch of zero misses. The decision boundary oscillates and the epoch counter ticks up to the 50 cap.',
        'convergedEpoch reports -1. The final w still classifies correctly on average but makes systematic errors on the XOR-style inner points.',
      ],
      output: 'convergedEpoch = -1 (did not converge within 50 epochs).',
    },
  ],
  problem: {
    statement:
      'Implement the perceptron learning rule for binary classification. First line: N alpha maxEpoch. Next N lines each have x1, x2 (two real features) and label (integer). Output four values space-separated: final w0, w1, w2 (6 decimals), then the 1-based converged-epoch or -1 if no zero-misclassify epoch occurred within maxEpoch. Binarize string/int labels: first label in sorted-unique order maps to -1, the other to +1. Initialize w = [0,0,0]. Prediction ŷ = +1 if w·x ≥ 0 else −1. Weight update on misclassification: w += alpha * (y − ŷ) * x⃗ (x0 = 1, x1 = feature 1, x2 = feature 2). Scan points in input order per epoch. Convergence check is at end of each epoch (zero misclassifications in a full pass → convergedEpoch = 1-based epoch number and exit).',
    signatures: {
      cpp: 'tuple<double,double,double,int> perceptron(const vector<Pt>& pts, const vector<int>& labels, double alpha, int maxEpoch)',
      java: 'static double[] perceptron(double[][] pts, int[] labels, double alpha, int maxEpoch)',
      python: 'def perceptron(pts: list[tuple[float,float]], labels: list[int], alpha: float, max_epoch: int) -> tuple[float, float, float, int]',
    },
    starters: {
      cpp: `#include <bits/stdc++.h>
using namespace std;

tuple<double,double,double,int> perceptron(const vector<pair<double,double>>& pts,
                                           const vector<int>& labels,
                                           double alpha, int maxEpoch) {
    // TODO: implement the perceptron learning rule
    return {0, 0, 0, -1};
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(nullptr);
    int N, maxEpoch; double alpha;
    cin >> N >> alpha >> maxEpoch;
    vector<pair<double,double>> pts(N);
    vector<int> labels(N);
    for (int i = 0; i < N; i++)
        cin >> pts[i].first >> pts[i].second >> labels[i];
    auto [w0, w1, w2, ep] = perceptron(pts, labels, alpha, maxEpoch);
    cout << fixed << setprecision(6) << w0 << " " << w1 << " " << w2 << " " << ep << "\\n";
}
`,
      java: `import java.util.*;
public class Main {
    static double[] perceptron(double[][] pts, int[] labels, double alpha, int maxEpoch) {
        // TODO: implement the perceptron learning rule
        return new double[]{0, 0, 0, -1};
    }
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int N = sc.nextInt(); double alpha = sc.nextDouble(); int maxEpoch = sc.nextInt();
        double[][] pts = new double[N][2]; int[] labels = new int[N];
        for (int i = 0; i < N; i++) {
            pts[i][0] = sc.nextDouble(); pts[i][1] = sc.nextDouble();
            labels[i] = sc.nextInt();
        }
        double[] res = perceptron(pts, labels, alpha, maxEpoch);
        System.out.printf("%.6f %.6f %.6f %.0f%n", res[0], res[1], res[2], res[3]);
    }
}
`,
      python: `import sys

def perceptron(pts, labels, alpha, max_epoch):
    # TODO: implement the perceptron learning rule
    return (0.0, 0.0, 0.0, -1)

def main():
    data = sys.stdin.read().split()
    idx = 0
    N = int(data[idx]); idx += 1
    alpha = float(data[idx]); idx += 1
    max_epoch = int(data[idx]); idx += 1
    pts = []; labels = []
    for _ in range(N):
        x1 = float(data[idx]); idx += 1
        x2 = float(data[idx]); idx += 1
        lab = int(data[idx]); idx += 1
        pts.append((x1, x2)); labels.append(lab)
    w0, w1, w2, ep = perceptron(pts, labels, alpha, max_epoch)
    print(f"{w0:.6f} {w1:.6f} {w2:.6f} {ep}")

if __name__ == "__main__":
    main()
`,
    },
    expectedBigO: 'O(N·epochs)',
    tests: [
      {
        input: `4 1 50\n-2 -2 0\n-1 -1 0\n2 2 1\n1 1 1`,
        expected: '2.000000 0.000000 2.000000 2',
        hidden: false,
        label: 'sample 1: separable 4-pt',
      },
      {
        input: `2 1 10\n0 0 0\n1 1 1`,
        expected: '0.000000 2.000000 2.000000 1',
        hidden: false,
        label: 'sample 2: 2-pt 1-epoch converge',
      },
      {
        input: `1 1 10\n5 5 7`,
        expected: '0.000000 0.000000 0.000000 1',
        hidden: true,
        label: 'single point converges in 1',
      },
      {
        input: `4 1 10\n0 0 0\n1 1 0\n0 1 1\n1 0 1`,
        expected: '-2.000000 2.000000 -2.000000 -1',
        hidden: true,
        label: 'XOR 4-pt inseparable',
      },
      {
        input: `6 0.5 20\n-3 1 0\n-2 0 0\n-1 -1 0\n1 1 1\n2 0 1\n3 -1 1`,
        expected: '0.000000 1.000000 0.000000 2',
        hidden: true,
        label: '6-pt separable α=0.5',
      },
      {
        input: `10 0.1 10\n-3 -2 0\n-3 -1 0\n-2 -2 0\n-1 -3 0\n-2 -1 0\n3 2 1\n3 1 1\n2 2 1\n1 3 1\n2 1 1`,
        expected: '0.000000 0.400000 0.200000 2',
        hidden: true,
        label: '10-pt separable α=0.1',
      },
      {
        input: `4 1 1\n0 0 0\n1 0 1\n0 1 1\n1 1 0`,
        expected: '0.000000 0.000000 0.000000 -1',
        hidden: true,
        label: 'inseparable + cap=1 epoch returns -1',
      },
      {
        input: `8 0.5 50\n-2 -1 0\n-1 -2 0\n-3 0 0\n0 -3 0\n2 1 1\n1 2 1\n3 0 1\n0 3 1`,
        expected: '0.000000 1.000000 1.000000 1',
        hidden: true,
        label: '8-pt opposite-quad separable',
      },
      (() => {
        const pts: string[] = [];
        for (let i = 0; i < 100; i++) {
          const cls = 0;
          pts.push(`${-3 - (i % 3)} ${-2 - ((i * 2) % 3)} ${cls}`);
        }
        for (let i = 0; i < 100; i++) {
          const cls = 1;
          pts.push(`${3 + (i % 3)} ${2 + ((i * 2) % 3)} ${cls}`);
        }
        return {
          input: `200 1 50\n${pts.join('\n')}`,
          expected: '0.000000 6.000000 4.000000 1',
          hidden: true,
          label: 'n=200 stress separable',
        };
      })(),
      {
        input: `3 1 50\n-1 0 0\n0 0 1\n1 0 0`,
        expected: '-2.000000 -2.000000 0.000000 -1',
        hidden: true,
        label: 'boundary point activation=0 check',
      },
    ],
  },
};
