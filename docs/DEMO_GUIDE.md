# QuantumGuard AI — Demonstration Guide for Faculty & SIH Judges

This guide provides a structured, 5-minute live demonstration workflow for college faculty evaluations, project viva, and Smart India Hackathon (SIH) juries.

---

## 1. Executive Summary & Problem Context

- **The Problem:** In Quantum Key Distribution (QKD) networks (such as BB84), legitimate physical disturbances (fiber macro-bending, thermal fluctuations, detector dark counts) cause photon loss and error spikes that look superficially similar to an eavesdropper tapping the quantum link.
- **The Solution:** QuantumGuard AI provides an explainable channel surveillance architecture that models quantum physics, establishes calibrated baselines, and detects anomalous disturbances using a tri-engine hybrid approach (Rule-Based, Binomial Hypothesis Testing, and Unsupervised Isolation Forest) without jumping to unfounded conclusions.
- **Scientific Honesty:** The system distinguishes observable telemetry from hidden ground truth and generates explainable multi-hypothesis alerts.

---

## 2. 5-Minute Live Demonstration Walkthrough

### Step 1: Launch & Health Overview (1 Minute)
1. Launch the application:
   ```powershell
   cd quantumguard-ai\scripts
   .\run_backend.ps1
   ```
2. Open `http://127.0.0.1:8000` in the browser.
3. Show the **Overview Page**:
   - Point out the **Active Baseline** indicator: `Default Operational Telecom Baseline (v1.0.0)`.
   - Point out the **Live Channel Metrics**: Latest QBER, Photon Loss Rate, and Sifted Key Yield.
   - Show the green **ONLINE** status indicator confirming the SQLite database and FastAPI backend connection.

### Step 2: Demonstrate Legitimate Channel vs High Loss (1 Minute)
1. Click **Simulation Studio** in the navigation bar.
2. Select **Scenario 2: Normal Channel with Background Noise**.
   - Parameters: $N=1500$, Noise = $1.5\%$, Loss = $10\%$, Eve = $0\%$.
   - Click **Transmit Photons & Analyze Channel**.
   - Show that QBER is ~1.5%, status is **NORMAL**, and all three detectors agree that the channel is healthy.
3. Now select **Scenario 4: Severe Photon Attenuation (High Loss)**.
   - Parameters: $N=1500$, Loss = $85\%$, Noise = $1.5\%$, Eve = $0\%$.
   - Click **Transmit Photons & Analyze Channel**.
   - **Key Judge Talking Point:** *"Notice that photon loss reduced detections from 1500 down to ~225 pulses, but the observed QBER remained low (~1.5%). Our simulator correctly models attenuation as missing detections rather than artificial bit flips."*

### Step 3: Demonstrate Intercept-Resend Attack & Explainable Alert (1.5 Minutes)
1. Select **Scenario 6: Full Intercept-Resend Attack (Eve=100%)**.
   - Click **Transmit Photons & Analyze Channel**.
   - Observe the live metrics: QBER jumps to approximately **24.5% - 25.5%**.
   - **Key Scientific Talking Point:** *"Notice how the observed QBER closely matches the theoretical expectation of 25.0% for uniform random basis intercept-resend. Because QBER exceeds the 11.0% Shor-Preskill asymptotic security threshold, key distillation must be halted."*
2. Inspect the **Tri-Engine Detection Verdict**:
   - **Rule-Based:** Shor-Preskill threshold exceeded.
   - **Statistical:** Continuity-corrected binomial $z$-test rejected $H_0$ ($p < 10^{-6}$).
   - **ML Isolation Forest:** High multidimensional outlier isolation score.
3. Scroll to the **Interactive BB84 Visualizer**:
   - Filter by **"Eve Tapped"**: Show Eve measuring in a random basis and forwarding a replacement photon.
   - Filter by **"Errors"**: Show the exact pulses where conjugate measurements resulted in bit disagreements.
4. Show the **Explainable Alert Card**:
   - Point out the **Alternative Hypotheses Checklist**: Rather than blindly claiming "Eve is detected," the alert responsibly lists detector dark count saturation, thermal noise, and fiber damage alongside eavesdropping.

### Step 4: Demonstrate Statistical Caution on Small Samples (30 Seconds)
1. Select **Scenario 8: Insufficient Sample Size**.
   - Parameters: $N=45$, Loss = $80\%$.
   - Run the simulation.
   - Show that the detector returns **INSUFFICIENT DATA** with a wide Wilson confidence interval, refusing to produce an overconfident claim when data is scarce.

### Step 5: Independent Benchmark Evaluation (1 Minute)
1. Click **Benchmark & Eval** tab.
2. Click **Execute Benchmark**.
   - Point out the **Data Leakage Guard**: The benchmark generates strictly separate calibration, training, and held-out test datasets with independent seeds.
   - Show the **Fair Model Comparison Table**: Side-by-side Accuracy, Precision, Recall, F1-Score, False Positive Rate (FPR), and Confusion Matrices.
   - Review the **Scenario-by-Scenario Sensitivity Table** showing detection performance across all 10 standard conditions.

### Step 6: Audio Anomaly Detection Module Demonstration (1 Minute)
1. Click the **Audio Detection** tab in the navigation bar.
2. Note the **Architectural Segregation Notice**: Acoustic vibration and mechanical sounds are processed in a dedicated pipeline, strictly isolated from the BB84 quantum channel and optical QBER calculations.
3. Show **Single Audio Inspection & Prediction**:
   - Upload a test WAV file (or browse an existing catalog sample).
   - Click **"Listen to Audio"** to demonstrate in-browser streaming.
   - Point out the **Audio Waveform Envelope (Downsampled 120 bins)**.
   - Inspect the **18-Dimensional Feature Vector**: RMS Energy, Zero Crossing Rate, Spectral Centroid, Rolloff, Bandwidth, and 13 MFCC timbre coefficients.
   - Show the **Anomaly Score & Explanation**: If a sample has anomalous acoustic parameters, point out the natural language explanation and identified contributing deviations.
4. Switch to **Dataset Management**:
   - Show the total catalog inventory, breakdown of Normal vs. Anomalous recordings, and in-table playback.
   - Demonstrate the **ZIP Archive Importer** that safely unpacks folder hierarchies without path traversal risks.
5. Switch to **Model & Evaluation**:
   - Adjust the contamination rate slider and train the Isolation Forest.
   - Run the benchmark evaluation on labeled samples to show live Accuracy, Precision, Recall, F1-Score, and the $2\times 2$ Confusion Matrix.
6. Switch to **Analysis History**:
   - Click **Download Report CSV** to demonstrate audit compliance and data export.

---

## 3. Anticipated Faculty/Judge Questions & Answers

### Q1: "Why does Eve's intercept-resend attack produce ~25% QBER and not 50%?"
> **Answer:** In BB84, Alice and Bob only keep pulses where their measurement bases matched (the sifted key). When Eve intercepts, there is a 50% chance Eve randomly chose Alice's basis (producing 0% error) and a 50% chance Eve chose the conjugate basis (producing 50% error at Bob). Therefore:
> $$P(\text{error}) = (0.5 \times 0.0) + (0.5 \times 0.5) = 0.25 = 25.0\%$$

### Q2: "Can you prove that an elevated QBER is definitely caused by an attacker?"
> **Answer:** No, and in physical quantum optics, neither can hardware. Physical noise (thermal photons, detector dark counts, fiber bends) creates bit errors that are fundamentally indistinguishable at the physical layer from eavesdropping. That is why QuantumGuard AI provides **explainable multi-hypothesis alerts** with alternative causes rather than claiming definitive proof.

### Q3: "Why use a hybrid model instead of just training a deep neural network?"
> **Answer:** Quantum cryptography relies on physical laws and provable security limits (like the Shor-Preskill 11% threshold). A pure black-box deep neural network lacks explainability and can hallucinate security guarantees. Our hybrid approach pairs deterministic boundary checks with statistical binomial hypothesis tests and an unsupervised Isolation Forest for multi-metric anomaly detection.

### Q4: "Where is the data stored?"
> **Answer:** All simulation runs, baseline calibration versions, security alerts, benchmark evaluations, and audio dataset records are persisted locally in an ACID-compliant SQLite database with write-ahead logging (WAL), ensuring full traceability.

### Q5: "How does the Audio Anomaly Detection module work, and is it connected to QBER?"
> **Answer:** The Audio Anomaly Detection module is strictly segregated from the quantum optics simulator. It takes standard WAV recordings (e.g. from industrial machine monitoring like MIMII or ToyADMOS), extracts an 18-dimensional acoustic representation (RMS power, zero-crossing rate, spectral centroid, rolloff, bandwidth, and 13 MFCCs), and trains an unsupervised Isolation Forest on normal reference sounds. It detects acoustic anomalies via tree depth isolation and multi-sigma feature deviation without modifying BB84 physics.

