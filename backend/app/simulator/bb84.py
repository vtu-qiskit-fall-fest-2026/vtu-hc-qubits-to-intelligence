"""QuantumGuard AI - Modular BB84 QKD Simulator

Executes end-to-end BB84 protocol simulation:
1. Alice state preparation (bits & bases)
2. Channel transmission (loss, noise, Eve intercept-resend)
3. Bob detection & measurement
4. Sifting (public basis reconciliation)
5. Parameter estimation (QBER calculation with statistical confidence interval)
6. Candidate raw key generation
"""

import time
import uuid
from datetime import datetime, timezone
from typing import List, Tuple, Optional
import numpy as np

from app.simulator.models import (
    SimulationConfig,
    PulseDetail,
    SimulationMetrics,
    SimulationRunResult,
)
from app.simulator.channel import QuantumChannel


def calculate_wilson_interval(successes: int, total: int, z: float = 1.96) -> Tuple[Optional[float], Optional[float], Optional[float]]:
    """
    Calculate Wilson score interval with continuity correction for a binomial proportion.

    Args:
        successes: Number of error bits.
        total: Number of tested bits.
        z: Normal distribution quantile (1.96 for ~95% confidence).

    Returns:
        Tuple: (lower_bound, upper_bound, interval_width) or (None, None, None) if total == 0
    """
    if total <= 0:
        return None, None, None

    p_hat = successes / total
    z2 = z * z
    denom = 1.0 + z2 / total
    center = (p_hat + z2 / (2.0 * total)) / denom
    margin = (z * np.sqrt((p_hat * (1.0 - p_hat) / total) + (z2 / (4.0 * total * total)))) / denom

    lower = max(0.0, float(center - margin))
    upper = min(1.0, float(center + margin))
    width = float(upper - lower)
    return lower, upper, width


class BB84Simulator:
    """Scientific BB84 Protocol Simulator with channel noise and eavesdropping models."""

    def __init__(self, config: SimulationConfig):
        self.config = config
        self.rng = np.random.default_rng(config.random_seed)
        self.channel = QuantumChannel(
            loss_prob=config.loss_prob,
            noise_prob=config.noise_prob,
            eve_prob=config.eve_prob,
            rng=self.rng
        )

    def run(self) -> SimulationRunResult:
        """Execute full BB84 simulation workflow."""
        start_time = time.perf_counter()
        run_id = f"sim-{uuid.uuid4().hex[:10]}"
        timestamp = datetime.now(timezone.utc).isoformat()

        n = self.config.num_pulses

        # 1. Alice generates random binary bits and bases
        alice_bits = self.rng.integers(0, 2, size=n, dtype=int)
        alice_bases = np.where(self.rng.random(n) < 0.5, QuantumChannel.RECTILINEAR, QuantumChannel.DIAGONAL)

        # 2. Transmission through quantum channel
        pulses: List[PulseDetail] = []
        detected_indices = []

        for i in range(n):
            a_bit = int(alice_bits[i])
            a_basis = str(alice_bases[i])
            a_state = QuantumChannel.STATE_LABELS[(a_basis, a_bit)]

            (
                lost,
                eve_intercepted,
                eve_basis,
                eve_bit,
                bob_detected,
                bob_basis,
                bob_bit,
            ) = self.channel.transmit_pulse(a_bit, a_basis)

            pulse = PulseDetail(
                pulse_index=i,
                alice_bit=a_bit,
                alice_basis=a_basis,
                alice_state=a_state,
                photon_lost=lost,
                eve_intercepted=eve_intercepted,
                eve_basis=eve_basis,
                eve_measured_bit=eve_bit,
                bob_basis=bob_basis,
                bob_detection=bob_detected,
                bob_measured_bit=bob_bit,
                bases_match=False,
                is_sifted=False,
                is_test_bit=False,
                is_error=None,
            )

            if bob_detected:
                detected_indices.append(i)

            pulses.append(pulse)

        detected_count = len(detected_indices)

        # 3. Sifting: Compare Alice and Bob bases for detected pulses
        sifted_indices = []
        for idx in detected_indices:
            p = pulses[idx]
            if p.bob_basis == p.alice_basis:
                p.bases_match = True
                p.is_sifted = True
                sifted_indices.append(idx)

        sifted_count = len(sifted_indices)

        # 4. Parameter Estimation: Select a subset of sifted bits for QBER measurement
        test_bits_count = 0
        candidate_key_count = 0
        error_count = 0
        qber: Optional[float] = None
        ci_lower: Optional[float] = None
        ci_upper: Optional[float] = None
        ci_width: Optional[float] = None

        if sifted_count > 0:
            # Randomly select test bits based on configured fraction
            perm = self.rng.permutation(sifted_count)
            n_test = max(1, int(np.round(sifted_count * self.config.test_bit_fraction)))
            if n_test > sifted_count:
                n_test = sifted_count

            test_idx_set = set(np.array(sifted_indices)[perm[:n_test]])
            test_bits_count = len(test_idx_set)
            candidate_key_count = sifted_count - test_bits_count

            for idx in sifted_indices:
                p = pulses[idx]
                if idx in test_idx_set:
                    p.is_test_bit = True
                    is_err = bool(p.alice_bit != p.bob_measured_bit)
                    p.is_error = is_err
                    if is_err:
                        error_count += 1
                else:
                    p.is_test_bit = False

            if test_bits_count > 0:
                qber = float(error_count / test_bits_count)
                ci_lower, ci_upper, ci_width = calculate_wilson_interval(error_count, test_bits_count)
        else:
            # Sifted count is zero - explicitly None, never replace with 0
            qber = None

        # Sample size sufficiency: at least 30 test bits recommended for reliable normal/binomial approximation
        sample_sufficient = bool(test_bits_count >= 30)

        elapsed_ms = (time.perf_counter() - start_time) * 1000.0

        # Determine ground truth label based on attack configuration
        is_anomaly = bool(
            self.config.eve_prob > 0.0 or
            self.config.noise_prob > 0.06 or
            self.config.loss_prob > 0.65 or
            self.config.scenario_id in ["high_channel_noise", "high_photon_loss", "partial_eve", "full_eve", "combined_disturbance"]
        )
        gt_label = "anomaly" if is_anomaly else "normal"

        metrics = SimulationMetrics(
            transmitted_pulses=n,
            detected_pulses=detected_count,
            detection_rate=float(detected_count / n) if n > 0 else 0.0,
            photon_loss_rate=float((n - detected_count) / n) if n > 0 else 0.0,
            sifted_bits_count=sifted_count,
            sifted_ratio=float(sifted_count / detected_count) if detected_count > 0 else 0.0,
            test_bits_count=test_bits_count,
            candidate_key_bits_count=candidate_key_count,
            error_count=error_count,
            qber=qber,
            qber_confidence_lower=ci_lower,
            qber_confidence_upper=ci_upper,
            confidence_interval_width=ci_width,
            sample_size_sufficient=sample_sufficient,
            theoretical_expected_qber=self.channel.calculate_theoretical_qber(),
            simulation_duration_ms=round(elapsed_ms, 2),
        )

        # Store sample of first 50 pulses for detailed visualization
        sample_size = min(50, len(pulses))
        sample_pulses = pulses[:sample_size]

        return SimulationRunResult(
            run_id=run_id,
            timestamp=timestamp,
            config=self.config,
            metrics=metrics,
            sample_pulses=sample_pulses,
            ground_truth_label=gt_label,
            ground_truth_category=self.config.scenario_id,
        )
