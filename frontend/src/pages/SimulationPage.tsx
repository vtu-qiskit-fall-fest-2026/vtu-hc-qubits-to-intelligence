// QuantumGuard AI - Simulation Studio Page

import React, { useState } from "react";
import {
  Cpu,
  Play,
  RotateCcw,
  Sparkles,
  Sliders,
  ShieldAlert,
  Info,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  HelpCircle,
} from "lucide-react";
import {
  ScenarioPreset,
  SimulationConfig,
  SimulationRunResult,
  ObservableFeatures,
  HybridDetectionResult,
  SecurityAlert,
} from "../types";
import { executeSimulation } from "../api";
import { BB84Visualizer } from "../components/BB84Visualizer";
import { AlertCard } from "../components/AlertCard";

interface SimulationPageProps {
  scenarios: ScenarioPreset[];
  selectedScenario: ScenarioPreset | null;
  onSimulationComplete: (run: SimulationRunResult, alert: SecurityAlert | null) => void;
}

export const SimulationPage: React.FC<SimulationPageProps> = ({
  scenarios,
  selectedScenario,
  onSimulationComplete,
}) => {
  // Config state
  const [scenarioId, setScenarioId] = useState<string>(selectedScenario?.id || "normal_background_noise");
  const [numPulses, setNumPulses] = useState<number>(selectedScenario?.config.num_pulses || 1500);
  const [noiseProb, setNoiseProb] = useState<number>(selectedScenario?.config.noise_prob || 0.015);
  const [lossProb, setLossProb] = useState<number>(selectedScenario?.config.loss_prob || 0.10);
  const [eveProb, setEveProb] = useState<number>(selectedScenario?.config.eve_prob || 0.0);
  const [testFraction, setTestFraction] = useState<number>(selectedScenario?.config.test_bit_fraction || 0.5);
  const [seed, setSeed] = useState<string>("");

  // Execution state
  const [loading, setLoading] = useState<boolean>(false);
  const [currentResult, setCurrentResult] = useState<{
    run: SimulationRunResult;
    features: ObservableFeatures;
    detection: HybridDetectionResult;
    alert: SecurityAlert | null;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Handle Preset Selection
  const handleScenarioChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sId = e.target.value;
    setScenarioId(sId);
    const preset = scenarios.find((s) => s.id === sId);
    if (preset) {
      setNumPulses(preset.config.num_pulses);
      setNoiseProb(preset.config.noise_prob);
      setLossProb(preset.config.loss_prob);
      setEveProb(preset.config.eve_prob);
      setTestFraction(preset.config.test_bit_fraction);
    }
  };

  // Run Simulation
  const handleRun = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const activePreset = scenarios.find((s) => s.id === scenarioId);
      const res = await executeSimulation({
        scenario_id: scenarioId,
        scenario_name: activePreset?.name || "Custom Run",
        num_pulses: Number(numPulses),
        noise_prob: Number(noiseProb),
        loss_prob: Number(lossProb),
        eve_prob: Number(eveProb),
        test_bit_fraction: Number(testFraction),
        random_seed: seed.trim() !== "" ? parseInt(seed, 10) : undefined,
      });

      setCurrentResult(res);
      onSimulationComplete(res.run, res.alert);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to execute simulation.");
    } finally {
      setLoading(false);
    }
  };

  const latestMetrics = currentResult?.run.metrics;
  const qberPercent = latestMetrics?.qber !== null && latestMetrics?.qber !== undefined
    ? latestMetrics.qber * 100
    : null;

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
            <Cpu className="w-6 h-6 text-cyan-400" />
            <span>BB84 Simulation & Channel Disturbance Studio</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure physical quantum parameters, simulate state transmission, and analyze observable channel metrics.
          </p>
        </div>
      </div>

      {/* Control Configuration Panel */}
      <div className="bg-[#131e36]/80 rounded-2xl border border-cyan-900/40 p-6 shadow-xl space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Preset Selector */}
          <div className="lg:col-span-1 space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
              Scenario Preset
            </label>
            <select
              value={scenarioId}
              onChange={handleScenarioChange}
              className="w-full bg-[#0b1329] border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-medium"
            >
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.ground_truth === "anomaly" ? "Anomaly" : "Normal"})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
              {scenarios.find((s) => s.id === scenarioId)?.description}
            </p>
          </div>

          {/* Sliders Grid */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Number of Pulses */}
            <div className="bg-[#0b1329]/60 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-300 font-medium">Transmitted Pulses</span>
                <span className="text-cyan-400 font-mono font-bold">{numPulses}</span>
              </div>
              <input
                type="range"
                min="100"
                max="5000"
                step="100"
                value={numPulses}
                onChange={(e) => setNumPulses(Number(e.target.value))}
                className="w-full accent-cyan-400"
              />
              <span className="text-[10px] text-slate-400 block">Min 1000 recommended for 95% statistical power</span>
            </div>

            {/* Eve Intercept Probability */}
            <div className="bg-[#0b1329]/60 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-300 font-medium">Eve Intercept-Resend</span>
                <span className={`font-mono font-bold ${eveProb > 0 ? "text-purple-400" : "text-slate-400"}`}>
                  {(eveProb * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={eveProb}
                onChange={(e) => setEveProb(parseFloat(e.target.value))}
                className="w-full accent-purple-400"
              />
              <span className="text-[10px] text-slate-400 block">
                Expected QBER = ~{(0.25 * eveProb * 100).toFixed(1)}% in ideal channel
              </span>
            </div>

            {/* Background Noise Probability */}
            <div className="bg-[#0b1329]/60 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-300 font-medium">Channel Thermal/Phase Noise</span>
                <span className={`font-mono font-bold ${noiseProb > 0.04 ? "text-amber-400" : "text-slate-300"}`}>
                  {(noiseProb * 100).toFixed(1)}%
                </span>
              </div>
              <input
                type="range"
                min="0.0"
                max="0.15"
                step="0.005"
                value={noiseProb}
                onChange={(e) => setNoiseProb(parseFloat(e.target.value))}
                className="w-full accent-amber-400"
              />
              <span className="text-[10px] text-slate-400 block">Typical telecom baseline is ~1.5%</span>
            </div>

            {/* Photon Loss Probability */}
            <div className="bg-[#0b1329]/60 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-300 font-medium">Photon Loss / Fiber Attenuation</span>
                <span className={`font-mono font-bold ${lossProb > 0.6 ? "text-amber-400" : "text-slate-300"}`}>
                  {(lossProb * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0.0"
                max="0.95"
                step="0.05"
                value={lossProb}
                onChange={(e) => setLossProb(parseFloat(e.target.value))}
                className="w-full accent-amber-400"
              />
              <span className="text-[10px] text-slate-400 block">Reduces Bob detections without bit flipping</span>
            </div>

            {/* Test Bit Fraction */}
            <div className="bg-[#0b1329]/60 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-300 font-medium">Test Bit Disclosed Fraction</span>
                <span className="text-indigo-400 font-mono font-bold">{(testFraction * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.10"
                max="0.80"
                step="0.05"
                value={testFraction}
                onChange={(e) => setTestFraction(parseFloat(e.target.value))}
                className="w-full accent-indigo-400"
              />
              <span className="text-[10px] text-slate-400 block">Fraction of sifted key sacrificed for QBER</span>
            </div>

            {/* Random Seed */}
            <div className="bg-[#0b1329]/60 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-300 font-medium">Random Seed (Optional)</span>
                <span className="text-slate-400 font-mono">{seed.trim() || "Random"}</span>
              </div>
              <input
                type="number"
                placeholder="Leave blank for random"
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                className="w-full bg-[#0b1329] border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 font-mono text-xs"
              />
              <span className="text-[10px] text-slate-400 block">Ensure reproducible bit-for-bit results</span>
            </div>
          </div>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-xs text-rose-300">
            {errorMsg}
          </div>
        )}

        {/* Action Button */}
        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            onClick={handleRun}
            disabled={loading}
            className="flex items-center space-x-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-600 hover:opacity-95 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 disabled:opacity-50 transition-all cursor-pointer"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
            <span>{loading ? "Simulating BB84 Quantum Link..." : "Transmit Photons & Analyze Channel"}</span>
          </button>
        </div>
      </div>

      {/* Results Section */}
      {currentResult && (
        <div className="space-y-6">
          {/* Scientific Disclaimer Pill */}
          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-[11px] text-slate-400 italic">
            {currentResult.run.scientific_disclaimer}
          </div>

          {/* Anomaly Detection Verdict Card */}
          <div className="bg-[#131e36]/90 rounded-2xl border border-cyan-900/40 p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] uppercase font-mono text-slate-400 block">
                  Tri-Engine Hybrid Anomaly Assessment
                </span>
                <div className="flex items-center space-x-2.5 mt-1">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      currentResult.detection.overall_status === "INVESTIGATION REQUIRED"
                        ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                        : currentResult.detection.overall_status === "ANOMALY SUSPECTED"
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                        : currentResult.detection.overall_status === "INSUFFICIENT DATA"
                        ? "bg-sky-500/20 text-sky-300 border-sky-500/40"
                        : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    }`}
                  >
                    STATUS: {currentResult.detection.overall_status}
                  </span>
                  <span className="text-xs text-slate-300 font-mono">
                    Consensus Score: {currentResult.detection.consensus_score} ({currentResult.detection.agreement_level})
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-mono text-slate-400 block">Simulation Latency</span>
                <span className="text-xs font-mono text-cyan-400">
                  {currentResult.run.metrics.simulation_duration_ms} ms
                </span>
              </div>
            </div>

            {/* Individual Detector Verdicts Side-by-Side */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* 1. Rule-Based Detector */}
              <div className="bg-[#0b1329]/70 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">Rule-Based Detector</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      currentResult.detection.individual_verdicts.rule_based.is_anomaly
                        ? "bg-rose-950 text-rose-300"
                        : "bg-emerald-950 text-emerald-300"
                    }`}
                  >
                    {currentResult.detection.individual_verdicts.rule_based.is_anomaly ? "ANOMALY" : "NORMAL"}
                  </span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  {currentResult.detection.individual_verdicts.rule_based.summary_message}
                </p>
              </div>

              {/* 2. Statistical Detector */}
              <div className="bg-[#0b1329]/70 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">Statistical Hypothesis (H0)</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      currentResult.detection.individual_verdicts.statistical.is_anomaly
                        ? "bg-rose-950 text-rose-300"
                        : "bg-emerald-950 text-emerald-300"
                    }`}
                  >
                    {currentResult.detection.individual_verdicts.statistical.is_anomaly ? "REJECT H0" : "ACCEPT H0"}
                  </span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  {currentResult.detection.individual_verdicts.statistical.summary_message}
                </p>
                {currentResult.detection.individual_verdicts.statistical.statistical_details?.z_score && (
                  <span className="text-[10px] text-cyan-400 block font-mono">
                    z-score: {currentResult.detection.individual_verdicts.statistical.statistical_details.z_score}
                  </span>
                )}
              </div>

              {/* 3. ML Isolation Forest */}
              <div className="bg-[#0b1329]/70 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">ML Isolation Forest</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      currentResult.detection.individual_verdicts.machine_learning.is_anomaly
                        ? "bg-rose-950 text-rose-300"
                        : "bg-emerald-950 text-emerald-300"
                    }`}
                  >
                    {currentResult.detection.individual_verdicts.machine_learning.is_anomaly ? "OUTLIER" : "INLIER"}
                  </span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  {currentResult.detection.individual_verdicts.machine_learning.summary_message}
                </p>
                <span className="text-[10px] text-slate-400 block font-mono">
                  Outlier score: {currentResult.detection.individual_verdicts.machine_learning.confidence_score}
                </span>
              </div>
            </div>
          </div>

          {/* Generated Explainable Alert (if anomalous or investigation required) */}
          {currentResult.alert && currentResult.alert.status !== "NORMAL" && (
            <AlertCard alert={currentResult.alert} />
          )}

          {/* Interactive BB84 Visualizer */}
          <BB84Visualizer
            pulses={currentResult.run.sample_pulses}
            totalTransmitted={currentResult.run.metrics.transmitted_pulses}
            detectedCount={currentResult.run.metrics.detected_pulses}
            siftedCount={currentResult.run.metrics.sifted_bits_count}
            testBitsCount={currentResult.run.metrics.test_bits_count}
            errorCount={currentResult.run.metrics.error_count}
            qberPercent={qberPercent}
          />
        </div>
      )}
    </div>
  );
};
