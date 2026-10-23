"""QuantumGuard AI - Standardized Simulation Scenarios

Defines 10 pre-calibrated and experimental channel scenarios covering:
- Clean baseline communication
- Legitimate environmental disturbances (noise, fiber bending)
- Adversarial eavesdropping (partial & full intercept-resend)
- Combined degradation
- Small sample / insufficient detection edge-cases
- Unseen robust evaluation configurations
"""

from typing import Dict, List, Any
from app.simulator.models import SimulationConfig


SCENARIO_PRESETS: Dict[str, Dict[str, Any]] = {
    "ideal_normal": {
        "id": "ideal_normal",
        "name": "Scenario 1: Ideal Normal Channel",
        "description": "Baseline noiseless, lossless quantum link with no adversary. Expected QBER ~ 0.0%, detection rate ~ 100%.",
        "config": SimulationConfig(
            scenario_id="ideal_normal",
            scenario_name="Ideal Normal Channel",
            num_pulses=1500,
            noise_prob=0.0,
            loss_prob=0.0,
            eve_prob=0.0,
            test_bit_fraction=0.5,
            notes="Golden reference run for perfect hardware conditions."
        ),
        "ground_truth": "normal",
        "is_reference": True,
    },
    "normal_background_noise": {
        "id": "normal_background_noise",
        "name": "Scenario 2: Normal Channel with Background Noise",
        "description": "Typical operational telecom optical fiber with detector dark counts and low environmental noise (~1.5% QBER, ~12% loss).",
        "config": SimulationConfig(
            scenario_id="normal_background_noise",
            scenario_name="Normal Channel with Background Noise",
            num_pulses=1500,
            noise_prob=0.015,
            loss_prob=0.12,
            eve_prob=0.0,
            test_bit_fraction=0.5,
            notes="Standard operational calibration baseline."
        ),
        "ground_truth": "normal",
        "is_reference": True,
    },
    "high_channel_noise": {
        "id": "high_channel_noise",
        "name": "Scenario 3: Elevated Channel Thermal/Phase Noise",
        "description": "Severe environmental thermal fluctuations or optical misalignment causing QBER to surge to ~9-10% without Eve.",
        "config": SimulationConfig(
            scenario_id="high_channel_noise",
            scenario_name="Elevated Channel Noise",
            num_pulses=1500,
            noise_prob=0.095,
            loss_prob=0.12,
            eve_prob=0.0,
            test_bit_fraction=0.5,
            notes="Legitimate physical disturbance test case."
        ),
        "ground_truth": "anomaly",
        "is_reference": False,
    },
    "high_photon_loss": {
        "id": "high_photon_loss",
        "name": "Scenario 4: Severe Photon Attenuation / Fiber Strain",
        "description": "Macro-bending in fiber link or severe optical coupling loss causing ~85% photon loss while QBER remains low.",
        "config": SimulationConfig(
            scenario_id="high_photon_loss",
            scenario_name="Severe Photon Attenuation",
            num_pulses=1500,
            noise_prob=0.015,
            loss_prob=0.85,
            eve_prob=0.0,
            test_bit_fraction=0.5,
            notes="Tests that photon loss reduces detections without inflating bit errors."
        ),
        "ground_truth": "anomaly",
        "is_reference": False,
    },
    "partial_eve": {
        "id": "partial_eve",
        "name": "Scenario 5: Partial Intercept-Resend Eavesdropping",
        "description": "Adversary Eve taps ~35% of transmitted pulses. Theoretical expected QBER increases by ~0.25 * 0.35 = ~8.75% + background noise.",
        "config": SimulationConfig(
            scenario_id="partial_eve",
            scenario_name="Partial Intercept-Resend (Eve=35%)",
            num_pulses=1500,
            noise_prob=0.01,
            loss_prob=0.10,
            eve_prob=0.35,
            test_bit_fraction=0.5,
            notes="Subtle eavesdropping attack."
        ),
        "ground_truth": "anomaly",
        "is_reference": False,
    },
    "full_eve": {
        "id": "full_eve",
        "name": "Scenario 6: Full Intercept-Resend Attack (Eve=100%)",
        "description": "Full intercept-resend attack across all pulses. Expected QBER ~ 25% on matching sifted bases, well above BB84 security limit (11%).",
        "config": SimulationConfig(
            scenario_id="full_eve",
            scenario_name="Full Intercept-Resend (Eve=100%)",
            num_pulses=1500,
            noise_prob=0.005,
            loss_prob=0.10,
            eve_prob=1.0,
            test_bit_fraction=0.5,
            notes="Textbook BB84 full intercept-resend attack."
        ),
        "ground_truth": "anomaly",
        "is_reference": False,
    },
    "combined_disturbance": {
        "id": "combined_disturbance",
        "name": "Scenario 7: Combined Noise, Loss & Eavesdropping",
        "description": "Compound multi-source impairment: moderate fiber loss (45%), background noise (3.5%), and 50% Eve tapping.",
        "config": SimulationConfig(
            scenario_id="combined_disturbance",
            scenario_name="Combined Multi-Factor Disturbance",
            num_pulses=1800,
            noise_prob=0.035,
            loss_prob=0.45,
            eve_prob=0.50,
            test_bit_fraction=0.5,
            notes="Complex real-world multi-factor impairment."
        ),
        "ground_truth": "anomaly",
        "is_reference": False,
    },
    "insufficient_detection": {
        "id": "insufficient_detection",
        "name": "Scenario 8: Insufficient Sample / Low Detection",
        "description": "Small pulse count (40 pulses) combined with heavy loss (80%), yielding fewer than 10 test bits. Tests uncertainty and statistical caution.",
        "config": SimulationConfig(
            scenario_id="insufficient_detection",
            scenario_name="Insufficient Sample Size (<15 Test Bits)",
            num_pulses=45,
            noise_prob=0.02,
            loss_prob=0.80,
            eve_prob=0.0,
            test_bit_fraction=0.5,
            notes="Validation for statistical uncertainty warnings."
        ),
        "ground_truth": "normal",
        "is_reference": False,
    },
    "robustness_unseen_1": {
        "id": "robustness_unseen_1",
        "name": "Scenario 9: Unseen Robustness Test A (Subtle Intrusion)",
        "description": "Evaluation scenario not seen during baseline calibration: subtle Eve intrusion (18%) with moderate loss (28%).",
        "config": SimulationConfig(
            scenario_id="robustness_unseen_1",
            scenario_name="Unseen Robustness Test A (Eve=18%, Loss=28%)",
            num_pulses=2000,
            noise_prob=0.012,
            loss_prob=0.28,
            eve_prob=0.18,
            test_bit_fraction=0.5,
            notes="Held-out generalization benchmark."
        ),
        "ground_truth": "anomaly",
        "is_reference": False,
    },
    "robustness_unseen_2": {
        "id": "robustness_unseen_2",
        "name": "Scenario 10: Unseen Robustness Test B (Elevated Legitimate Drift)",
        "description": "Evaluation scenario with benign elevated fiber loss (38%) and slightly higher thermal noise (2.8%) without eavesdropping.",
        "config": SimulationConfig(
            scenario_id="robustness_unseen_2",
            scenario_name="Unseen Robustness Test B (Benign Drift: Noise=2.8%, Loss=38%)",
            num_pulses=2000,
            noise_prob=0.028,
            loss_prob=0.38,
            eve_prob=0.0,
            test_bit_fraction=0.5,
            notes="Tests false-positive rejection on mild legitimate drift."
        ),
        "ground_truth": "normal",
        "is_reference": False,
    },
}


def get_all_scenarios() -> List[Dict[str, Any]]:
    """Return summary list of all available scenarios."""
    results = []
    for s_id, s in SCENARIO_PRESETS.items():
        results.append({
            "id": s["id"],
            "name": s["name"],
            "description": s["description"],
            "config": s["config"].model_dump(),
            "ground_truth": s["ground_truth"],
            "is_reference": s["is_reference"],
        })
    return results


def get_scenario_by_id(scenario_id: str) -> SimulationConfig:
    """Retrieve default SimulationConfig for a scenario."""
    if scenario_id not in SCENARIO_PRESETS:
        raise ValueError(f"Unknown scenario_id: {scenario_id}. Available: {list(SCENARIO_PRESETS.keys())}")
    # Return a copy of config
    return SCENARIO_PRESETS[scenario_id]["config"].model_copy(deep=True)
