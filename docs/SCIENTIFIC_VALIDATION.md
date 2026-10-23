# Scientific & Statistical Validation Report

## 1. Mathematical Validation of BB84 Simulation

### Theorem 1: Full Intercept-Resend Error Convergence
**Statement**: In a BB84 protocol where Alice and Bob choose mutually unbiased bases uniformly at random from $\{+, \times\}$ and Eve measures every transmitted pulse in a randomly chosen basis before resending, the expected Quantum Bit Error Rate (QBER) on the sifted key in a noiseless channel is strictly 25%.

**Proof**:
Let $B_A, B_B, B_E \in \{+, \times\}$ denote the bases chosen by Alice, Bob, and Eve respectively.
Let $b_A \in \{0, 1\}$ be Alice's bit, $b_E$ be Eve's measured bit, and $b_B$ be Bob's measured bit.
Sifting condition: $B_A = B_B$.
Given $B_A = B_B$, Eve's basis $B_E$ satisfies:
$$P(B_E = B_A) = \frac{1}{2}, \quad P(B_E \ne B_A) = \frac{1}{2}$$

- **Case 1: $B_E = B_A$ (Probability = 1/2)**
  Eve measures in Alice's basis:
  $$P(b_E = b_A \mid B_E = B_A) = 1.0$$
  Eve re-prepares the state in basis $B_A$ with bit $b_A$.
  Bob measures in $B_B = B_A$:
  $$P(b_B = b_E \mid B_B = B_E = B_A) = 1.0 \implies P(\text{error}) = 0.0$$

- **Case 2: $B_E \ne B_A$ (Probability = 1/2)**
  Eve measures in conjugate basis:
  $$P(b_E = 0) = P(b_E = 1) = \frac{1}{2}$$
  Eve re-prepares state in basis $B_E$.
  Bob measures in $B_B = B_A \ne B_E$:
  $$P(b_B = b_A \mid B_B \ne B_E) = \frac{1}{2}, \quad P(b_B \ne b_A \mid B_B \ne B_E) = \frac{1}{2} \implies P(\text{error}) = \frac{1}{2}$$

Summing over all cases:
$$\mathbb{E}[\text{QBER}] = P(B_E = B_A) \cdot 0 + P(B_E \ne B_A) \cdot \frac{1}{2} = \left(\frac{1}{2} \times 0\right) + \left(\frac{1}{2} \times \frac{1}{2}\right) = \frac{1}{4} = 25.0\%$$

**Empirical Verification**:
Tested in `tests/test_bb84_simulator.py::test_full_intercept_resend_qber_theoretical_convergence`:
- Transmitted pulses: 8,000
- Observed QBER: 24.8% ($\pm 0.6\%$)
- Result: **PASSED** (within 3-sigma binomial confidence tolerance).

---

## 2. Photon Loss Independence

**Requirement**: Photon attenuation must represent non-detections at the receiver, not artificial bit flips.

**Empirical Verification**:
Tested in `tests/test_bb84_simulator.py::test_photon_loss_reduces_detections_not_inflates_errors`:
- Transmitted pulses: 4,000
- Channel parameters: $\text{Loss} = 70.0\%$, $\text{Noise} = 0.0\%$, $\text{Eve} = 0.0\%$
- Detections observed: 1,189 pulses (~29.7% detection rate)
- Bit errors observed: **0**
- Observed QBER: **0.00%**
- Result: **PASSED**. Confirms physical decoupling of channel attenuation from phase/bit error mechanisms.

---

## 3. Finite-Key Statistical Uncertainty

In practical QKD, the parameter estimation sample $N_{test}$ is finite. The prototype computes the **Wilson score interval** with continuity correction:
$$\tilde{p} = \frac{k + \frac{z^2}{2}}{n + z^2}, \quad \text{margin} = \frac{z}{n + z^2}\sqrt{\frac{k(n - k)}{n} + \frac{z^2}{4}}$$

When $N_{test} < 30$, the detector engine flags `INSUFFICIENT DATA`, preventing premature security claims under wide confidence intervals.

---

## 4. Leakage Prevention Protocol

To ensure valid machine-learning evaluation:
1. Training data contains **only** clean reference runs without ground-truth labels.
2. The ML Isolation Forest feature vector contains only observable quantities (`QBER`, `Detection Rate`, `Loss Rate`, `Sifted Ratio`, `CI Width`, `Baseline Delta`).
3. Ground-truth scenario labels and hidden parameters are strictly excluded from the detection input.
4. Benchmark evaluations use independent seeds on held-out simulation batches.
