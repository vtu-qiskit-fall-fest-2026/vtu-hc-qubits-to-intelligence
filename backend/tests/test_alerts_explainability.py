"""Tests for Explainable Security Alerts Engine"""

import pytest

from app.simulator.models import SimulationConfig
from app.simulator.bb84 import BB84Simulator
from app.analytics.features import extract_features
from app.analytics.baseline import calibrate_baseline
from app.analytics.detectors.hybrid import HybridDetectionEngine
from app.analytics.alerts import AlertEngine


def test_explainable_alert_structure():
    """Verify generated alert contains all mandatory explainability fields and alternative causes."""
    # Calibrate baseline
    cal_runs = [
        BB84Simulator(SimulationConfig(num_pulses=1000, noise_prob=0.015, loss_prob=0.10, random_seed=i)).run()
        for i in range(5)
    ]
    baseline = calibrate_baseline(cal_runs)

    # Run attack scenario
    attack_cfg = SimulationConfig(
        scenario_id="attack_demo",
        num_pulses=1200,
        noise_prob=0.01,
        loss_prob=0.10,
        eve_prob=0.60,
        random_seed=42
    )
    attack_run = BB84Simulator(attack_cfg).run()

    feats = extract_features(attack_run.metrics, baseline)
    hybrid_engine = HybridDetectionEngine()
    detection = hybrid_engine.analyze(feats, baseline)

    alert_engine = AlertEngine()
    alert = alert_engine.generate_alert(attack_run, feats, detection, baseline)

    assert alert is not None
    assert alert.run_id == attack_run.run_id
    assert alert.status in ["ANOMALY SUSPECTED", "INVESTIGATION REQUIRED"]
    assert alert.severity in ["HIGH", "CRITICAL"]
    assert len(alert.alternative_causes) >= 3
    # Check that alternatives mention environmental / optical causes
    assert any("noise" in alt.lower() or "fiber" in alt.lower() or "temperature" in alt.lower() for alt in alert.alternative_causes)
    assert len(alert.recommended_next_step) > 10
    # Must contain scientific disclaimer not claiming conclusive proof of attack
    assert "does NOT independently prove eavesdropping" in alert.scientific_disclaimer
    assert alert.observed_metrics["qber"] is not None
    assert alert.baseline_reference is not None
