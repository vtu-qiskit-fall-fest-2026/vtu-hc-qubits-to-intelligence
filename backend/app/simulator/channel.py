"""QuantumGuard AI - Quantum Channel & Disturbance Engine

Implements physical quantum state transformations, transmission attenuation (photon loss),
depolarizing channel noise, and Eve's intercept-resend attack model for the BB84 protocol.
"""

from typing import Tuple, Optional
import numpy as np


class QuantumChannel:
    """Simulates physical transmission effects on single-photon quantum states in BB84."""

    RECTILINEAR = "+"  # Standard basis: |0>, |1>
    DIAGONAL = "x"     # Conjugate basis: |+>, |->

    STATE_LABELS = {
        ("+", 0): "|0>",
        ("+", 1): "|1>",
        ("x", 0): "|+>",
        ("x", 1): "|->",
    }

    def __init__(self, loss_prob: float = 0.0, noise_prob: float = 0.0, eve_prob: float = 0.0, rng: Optional[np.random.Generator] = None):
        """
        Initialize channel with physical disturbance parameters.

        Args:
            loss_prob: Probability of photon absorption/loss [0.0, 1.0].
            noise_prob: Probability of channel disturbance/bit-flip [0.0, 1.0].
            eve_prob: Probability of Eve intercept-resend attack [0.0, 1.0].
            rng: NumPy random generator for deterministic experiments.
        """
        if not (0.0 <= loss_prob <= 1.0):
            raise ValueError(f"loss_prob must be between 0.0 and 1.0, got {loss_prob}")
        if not (0.0 <= noise_prob <= 1.0):
            raise ValueError(f"noise_prob must be between 0.0 and 1.0, got {noise_prob}")
        if not (0.0 <= eve_prob <= 1.0):
            raise ValueError(f"eve_prob must be between 0.0 and 1.0, got {eve_prob}")

        self.loss_prob = float(loss_prob)
        self.noise_prob = float(noise_prob)
        self.eve_prob = float(eve_prob)
        self.rng = rng if rng is not None else np.random.default_rng()

    def transmit_pulse(
        self,
        alice_bit: int,
        alice_basis: str
    ) -> Tuple[bool, bool, Optional[str], Optional[int], bool, Optional[str], Optional[int]]:
        """
        Simulate transmission of a single photon pulse through the channel.

        Returns:
            Tuple:
            - photon_lost (bool): True if photon is lost (no detection at Bob)
            - eve_intercepted (bool): True if Eve intercepted the pulse
            - eve_basis (str | None): Eve's measurement basis if intercepted
            - eve_bit (int | None): Eve's measured bit if intercepted
            - bob_detection (bool): True if Bob registered a photon click
            - bob_basis (str | None): Bob's randomly chosen basis
            - bob_bit (int | None): Bob's measurement outcome if detected
        """
        # 1. Photon Loss Model (Attenuated Fiber / Detection Inefficiency)
        # Loss represents missing detections at Bob, NOT bit flips.
        photon_lost = bool(self.rng.random() < self.loss_prob)
        if photon_lost:
            # Bob receives no click, so Bob cannot measure any bit.
            # Eve may still theoretically tap before loss, but if lost, Bob receives no signal.
            return (
                True,   # photon_lost
                False,  # eve_intercepted (unregistered at receiver)
                None,   # eve_basis
                None,   # eve_bit
                False,  # bob_detection
                None,   # bob_basis
                None    # bob_bit
            )

        # 2. Eve Intercept-Resend Attack Model
        # When active, Eve intercepts with probability eve_prob, measures in a random basis,
        # and forwards a freshly prepared state corresponding to her outcome.
        eve_intercepted = bool(self.rng.random() < self.eve_prob)
        current_basis = alice_basis
        current_bit = alice_bit
        eve_basis = None
        eve_bit = None

        if eve_intercepted:
            # Eve randomly chooses rectilinear (+) or diagonal (x)
            eve_basis = self.RECTILINEAR if self.rng.random() < 0.5 else self.DIAGONAL
            if eve_basis == alice_basis:
                # Same basis: Eve deterministically gets Alice's bit
                eve_bit = alice_bit
            else:
                # Conjugate basis: MUB (mutually unbiased basis) measurement collapses to 0 or 1 with 50/50 probability
                eve_bit = int(self.rng.random() < 0.5)

            # Eve prepares replacement state in her chosen basis
            current_basis = eve_basis
            current_bit = eve_bit

        # 3. Channel Noise Model (Thermal/Dark counts/Phase flips)
        # Evaluated on the state in transit to Bob
        if self.noise_prob > 0.0:
            if self.rng.random() < self.noise_prob:
                current_bit = 1 - current_bit

        # 4. Bob's Receiver Measurement
        bob_basis = self.RECTILINEAR if self.rng.random() < 0.5 else self.DIAGONAL
        bob_detection = True

        if bob_basis == current_basis:
            # Bob measures in same basis as incoming state: deterministic outcome
            bob_bit = current_bit
        else:
            # Bob measures in conjugate basis: 50% probability of 0 or 1
            bob_bit = int(self.rng.random() < 0.5)

        return (
            False,            # photon_lost
            eve_intercepted,  # eve_intercepted
            eve_basis,        # eve_basis
            eve_bit,          # eve_bit
            bob_detection,    # bob_detection
            bob_basis,        # bob_basis
            bob_bit           # bob_bit
        )

    def calculate_theoretical_qber(self) -> float:
        """
        Calculate theoretical expected QBER on the sifted key.

        Theoretical expectation:
        - In ideal noiseless channel with Eve intercept-resend:
          Matching bases between Alice and Bob occurs 50% of time.
          When Eve intercepts with probability p_eve:
            50% Eve matches Alice -> Bob gets 0% error.
            50% Eve doesn't match Alice -> Bob gets 50% error.
            Expected Eve-induced error = p_eve * (0.5 * 0 + 0.5 * 0.5) = 0.25 * p_eve.
        - With channel noise p_noise:
          Expected QBER = p_noise * (1 - 0.25 * p_eve) + (1 - p_noise) * (0.25 * p_eve)
        """
        eve_error = 0.25 * self.eve_prob
        # Channel noise flips combined with attack error:
        expected_qber = self.noise_prob * (1.0 - eve_error) + (1.0 - self.noise_prob) * eve_error
        return float(expected_qber)
