"""Scientific and Protocol Correctness Tests for BB84 Simulator

Verifies:
1. Ideal channel has 0% QBER and ~100% detection rate.
2. Intercept-resend attack with Eve=100% generates expected ~25% QBER (+/- statistical tolerance).
3. Photon loss strictly reduces detected pulse count without creating artificial bit errors.
4. Handling zero valid comparison bits returns None (unavailable), not zero.
5. Deterministic reproducibility with fixed random seed.
6. Wilson score interval calculation and sample size warnings.
"""

import pytest
import numpy as np

from app.simulator.models import SimulationConfig
from app.simulator.channel import QuantumChannel
from app.simulator.bb84 import BB84Simulator, calculate_wilson_interval


def test_ideal_channel_zero_qber():
    """Verify that an ideal channel without noise, loss, or Eve yields zero errors."""
    config = SimulationConfig(
        scenario_id="ideal_test",
        num_pulses=2000,
        noise_prob=0.0,
        loss_prob=0.0,
        eve_prob=0.0,
        test_bit_fraction=0.5,
        random_seed=42
    )
    sim = BB84Simulator(config)
    result = sim.run()

    assert result.metrics.transmitted_pulses == 2000
    assert result.metrics.detected_pulses == 2000
    assert result.metrics.photon_loss_rate == 0.0
    assert result.metrics.error_count == 0
    assert result.metrics.qber == 0.0
    assert result.metrics.sample_size_sufficient is True
    # In ideal BB84, roughly 50% of pulses have matching bases
    assert 900 <= result.metrics.sifted_bits_count <= 1100


def test_full_intercept_resend_qber_theoretical_convergence():
    """
    Verify theoretical requirement:
    In BB84 with uniformly random bases, full intercept-resend (Eve=100%) produces
    an expected QBER of ~25% on the sifted key.
    We test across 6000 pulses with fixed seed.
    """
    config = SimulationConfig(
        scenario_id="full_eve_test",
        num_pulses=8000,
        noise_prob=0.0,
        loss_prob=0.0,
        eve_prob=1.0,
        test_bit_fraction=0.5,
        random_seed=1234
    )
    sim = BB84Simulator(config)
    result = sim.run()

    assert result.metrics.qber is not None
    # 25% expected QBER with 3-sigma tolerance for ~2000 test bits is approx [0.22, 0.28]
    assert 0.22 <= result.metrics.qber <= 0.28, f"Observed QBER {result.metrics.qber} outside expected range [0.22, 0.28]"
    assert result.metrics.theoretical_expected_qber == 0.25


def test_partial_intercept_resend_qber():
    """Verify partial eavesdropping (Eve=40%) produces expected ~10% QBER (0.25 * 0.40)."""
    config = SimulationConfig(
        scenario_id="partial_eve_test",
        num_pulses=8000,
        noise_prob=0.0,
        loss_prob=0.0,
        eve_prob=0.40,
        test_bit_fraction=0.5,
        random_seed=5678
    )
    sim = BB84Simulator(config)
    result = sim.run()

    assert result.metrics.qber is not None
    # Expected: 0.25 * 0.40 = 0.10. Tolerance [0.075, 0.125]
    assert 0.075 <= result.metrics.qber <= 0.125, f"Observed QBER {result.metrics.qber} outside expected range [0.075, 0.125]"


def test_photon_loss_reduces_detections_not_inflates_errors():
    """
    Verify requirement:
    Photon loss must represent missing detections, not automatically incorrect bits.
    In a channel with 70% loss and 0% noise/Eve, detection rate should be ~30%,
    and QBER should remain exactly 0.0%.
    """
    config = SimulationConfig(
        scenario_id="loss_test",
        num_pulses=4000,
        noise_prob=0.0,
        loss_prob=0.70,
        eve_prob=0.0,
        test_bit_fraction=0.5,
        random_seed=999
    )
    sim = BB84Simulator(config)
    result = sim.run()

    # Detections should be approximately 30% of 4000 = ~1200
    assert 1050 <= result.metrics.detected_pulses <= 1350
    # Photon loss rate should be around 0.70
    assert 0.65 <= result.metrics.photon_loss_rate <= 0.75
    # QBER must remain 0.0 because there is no noise or eavesdropping
    assert result.metrics.error_count == 0
    assert result.metrics.qber == 0.0


def test_complete_loss_zero_comparison_bits():
    """
    Verify requirement:
    Handle zero valid comparison bits by returning an unavailable QBER (None),
    NOT zero or a fabricated value.
    """
    config = SimulationConfig(
        scenario_id="total_loss_test",
        num_pulses=50,
        noise_prob=0.0,
        loss_prob=1.0,  # 100% loss: no photons detected
        eve_prob=0.0,
        test_bit_fraction=0.5,
        random_seed=111
    )
    sim = BB84Simulator(config)
    result = sim.run()

    assert result.metrics.detected_pulses == 0
    assert result.metrics.sifted_bits_count == 0
    assert result.metrics.test_bits_count == 0
    assert result.metrics.error_count == 0
    assert result.metrics.qber is None
    assert result.metrics.qber_confidence_lower is None
    assert result.metrics.qber_confidence_upper is None
    assert result.metrics.sample_size_sufficient is False


def test_reproducibility_with_fixed_seed():
    """Verify that identical random seed produces bit-for-bit identical results."""
    config1 = SimulationConfig(
        scenario_id="seed_test_1",
        num_pulses=500,
        noise_prob=0.02,
        loss_prob=0.15,
        eve_prob=0.20,
        random_seed=4242
    )
    config2 = SimulationConfig(
        scenario_id="seed_test_2",
        num_pulses=500,
        noise_prob=0.02,
        loss_prob=0.15,
        eve_prob=0.20,
        random_seed=4242
    )

    r1 = BB84Simulator(config1).run()
    r2 = BB84Simulator(config2).run()

    assert r1.metrics.detected_pulses == r2.metrics.detected_pulses
    assert r1.metrics.sifted_bits_count == r2.metrics.sifted_bits_count
    assert r1.metrics.test_bits_count == r2.metrics.test_bits_count
    assert r1.metrics.error_count == r2.metrics.error_count
    assert r1.metrics.qber == r2.metrics.qber


def test_wilson_confidence_interval():
    """Verify Wilson score confidence interval calculation."""
    # 5 errors in 100 test bits
    lower, upper, width = calculate_wilson_interval(5, 100)
    assert lower is not None and upper is not None
    assert 0.015 < lower < 0.05
    assert 0.05 < upper < 0.12
    assert width == pytest.approx(upper - lower, abs=1e-5)

    # 0 total bits -> None
    l0, u0, w0 = calculate_wilson_interval(0, 0)
    assert l0 is None and u0 is None and w0 is None
