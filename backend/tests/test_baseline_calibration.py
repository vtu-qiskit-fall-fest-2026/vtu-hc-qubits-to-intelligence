"""Tests for Baseline Calibration Engine"""

import pytest
import numpy as np

from app.simulator.models import SimulationConfig
from app.simulator.bb84 import BB84Simulator
from app.analytics.baseline import calibrate_baseline, BaselineCalibration


def test_baseline_calibration_from_runs():
    """Verify baseline calibration calculates expected distribution parameters."""
    runs = []
    for i in range(6):
        cfg = SimulationConfig(
            scenario_id="normal_test",
            num_pulses=1000,
            noise_prob=0.015,
            loss_prob=0.10,
            eve_prob=0.0,
            random_seed=100 + i
        )
        sim = BB84Simulator(cfg)
        runs.append(sim.run())

    baseline = calibrate_baseline(
        runs=runs,
        name="Test Baseline",
        version="1.0.0",
        sensitivity="medium"
    )

    assert baseline.num_runs == 6
    assert baseline.total_test_bits > 0
    # Mean QBER should be close to 0.015 (operational noise)
    assert 0.005 <= baseline.mean_qber <= 0.035
    # Upper threshold should be higher than mean QBER
    assert baseline.qber_upper_threshold > baseline.mean_qber
    # Detection rate should be around 0.90 (since loss=0.10)
    assert 0.85 <= baseline.mean_detection_rate <= 0.95
    assert baseline.is_sufficient is True
    assert baseline.is_stable is True


def test_baseline_insufficient_sample_warning():
    """Verify warning generated when calibration sample is too small."""
    runs = []
    # Only 2 runs
    for i in range(2):
        cfg = SimulationConfig(
            scenario_id="tiny_test",
            num_pulses=50,
            noise_prob=0.01,
            loss_prob=0.10,
            random_seed=50 + i
        )
        runs.append(BB84Simulator(cfg).run())

    baseline = calibrate_baseline(runs, name="Tiny Baseline")
    assert baseline.is_sufficient is False
    assert any("Small calibration sample" in w for w in baseline.warning_messages)


def test_baseline_sensitivity_scaling():
    """Verify high sensitivity sets a lower threshold than low sensitivity."""
    runs = []
    for i in range(5):
        cfg = SimulationConfig(
            scenario_id="sens_test",
            num_pulses=800,
            noise_prob=0.02,
            loss_prob=0.10,
            random_seed=200 + i
        )
        runs.append(BB84Simulator(cfg).run())

    b_high = calibrate_baseline(runs, sensitivity="high")
    b_low = calibrate_baseline(runs, sensitivity="low")

    # High sensitivity should have tighter (lower) threshold than low sensitivity
    assert b_high.qber_upper_threshold <= b_low.qber_upper_threshold
