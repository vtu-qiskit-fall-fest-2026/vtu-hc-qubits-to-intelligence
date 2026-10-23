// QuantumGuard AI - Executive Overview Page

import React from "react";
import {
  Activity,
  ShieldAlert,
  Cpu,
  Layers,
  ArrowRight,
  TrendingUp,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Volume2,
} from "lucide-react";
import { SimulationRunResult, SecurityAlert, BaselineCalibration, ScenarioPreset } from "../types";
import { AlertCard } from "../components/AlertCard";

interface OverviewPageProps {
  latestRun: SimulationRunResult | null;
  recentAlerts: SecurityAlert[];
  activeBaseline: BaselineCalibration | null;
  scenarios: ScenarioPreset[];
  onSelectScenario: (scenario: ScenarioPreset) => void;
  onNavigateTab: (tab: string) => void;
  onOpenCalibration: () => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  latestRun,
  recentAlerts,
  activeBaseline,
  scenarios,
  onSelectScenario,
  onNavigateTab,
  onOpenCalibration,
}) => {
  const latestMetrics = latestRun?.metrics;
  const qberPercent = latestMetrics?.qber !== null && latestMetrics?.qber !== undefined
    ? latestMetrics.qber * 100
    : null;

  return (
    <div className="space-y-8">
      {/* Top Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0f172a] via-[#131e36] to-[#0b1329] border border-cyan-900/40 p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800/50 text-cyan-300 text-xs font-mono">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>AI-POWERED QUANTUM COMMUNICATION CHANNEL SURVEILLANCE</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Distinguish Channel Noise from Eavesdropping with{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-indigo-300 bg-clip-text text-transparent">
              Explainable AI
            </span>
          </h1>

          <p className="text-sm text-slate-300 leading-relaxed">
            QuantumGuard AI simulates BB84 Quantum Key Distribution (QKD), extracts observable channel telemetry,
            calibrates empirical reference baselines, and detects anomalous disturbances using rule-based,
            statistical hypothesis testing, and unsupervised machine-learning engines.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={() => onNavigateTab("simulation")}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all"
            >
              <Cpu className="w-4 h-4" />
              <span>Launch Simulation Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onNavigateTab("evaluation")}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#131e36] hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-xs transition-colors"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Independent Benchmark Evaluation</span>
            </button>

            <button
              onClick={() => onNavigateTab("audio")}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#131e36] hover:bg-slate-800 border border-cyan-800/60 text-cyan-300 font-semibold text-xs transition-colors"
            >
              <Volume2 className="w-4 h-4 text-cyan-400" />
              <span>Audio Anomaly Module</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary KPI Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* QBER Card */}
        <div className="bg-[#131e36]/80 p-5 rounded-2xl border border-cyan-900/30 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="uppercase font-mono">Latest QBER</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span
              className={`text-3xl font-extrabold ${
                qberPercent === null
                  ? "text-slate-400"
                  : qberPercent > 11.0
                  ? "text-rose-400"
                  : qberPercent > 4.0
                  ? "text-amber-400"
                  : "text-emerald-400"
              }`}
            >
              {qberPercent !== null ? `${qberPercent.toFixed(2)}%` : "N/A"}
            </span>
            {activeBaseline && (
              <span className="text-xs text-slate-400 font-mono">
                limit: {(activeBaseline.qber_upper_threshold * 100).toFixed(1)}%
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400">
            {latestMetrics && latestMetrics.qber_confidence_lower != null && latestMetrics.qber_confidence_upper != null ? (
              <span className="text-cyan-400/90 font-mono">
                95% CI: [{(latestMetrics.qber_confidence_lower * 100).toFixed(1)}%,{" "}
                {(latestMetrics.qber_confidence_upper * 100).toFixed(1)}%]
              </span>
            ) : (
              "Shor-Preskill security limit: 11.0%"
            )}
          </p>
        </div>

        {/* Photon Loss Card */}
        <div className="bg-[#131e36]/80 p-5 rounded-2xl border border-cyan-900/30 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="uppercase font-mono">Photon Loss Rate</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-amber-400">
              {latestMetrics ? `${(latestMetrics.photon_loss_rate * 100).toFixed(1)}%` : "10.0%"}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              det: {latestMetrics ? `${(latestMetrics.detection_rate * 100).toFixed(1)}%` : "90.0%"}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Loss represents missing arrivals, NOT bit errors.
          </p>
        </div>

        {/* Sifted Key Yield Card */}
        <div className="bg-[#131e36]/80 p-5 rounded-2xl border border-cyan-900/30 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="uppercase font-mono">Sifted Key Yield</span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-indigo-300">
              {latestMetrics?.sifted_bits_count ?? 0}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              / {latestMetrics?.transmitted_pulses ?? 0} pulses
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            {latestMetrics?.test_bits_count ?? 0} test bits | {latestMetrics?.candidate_key_bits_count ?? 0} candidate key
          </p>
        </div>

        {/* Active Baseline Status Card */}
        <div className="bg-[#131e36]/80 p-5 rounded-2xl border border-cyan-900/30 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="uppercase font-mono">Active Baseline</span>
            <Sliders className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="space-y-1">
            <span className="text-base font-bold text-slate-200 block truncate">
              {activeBaseline?.name || "Default Telecom Fiber"}
            </span>
            <span className="text-xs text-cyan-400 font-mono block">
              v{activeBaseline?.version || "1.0.0"} | {activeBaseline?.sensitivity.toUpperCase() || "MEDIUM"} SENSITIVITY
            </span>
          </div>
          <button
            onClick={onOpenCalibration}
            className="text-[11px] text-cyan-300 hover:text-cyan-200 underline font-medium block pt-1"
          >
            Modify Baseline Calibration →
          </button>
        </div>
      </div>

      {/* Fast Scenario Selection Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">Preset Channel Simulation Scenarios</h3>
            <p className="text-xs text-slate-400">
              Select any pre-configured physical scenario to immediately launch in the simulator.
            </p>
          </div>
          <button
            onClick={() => onNavigateTab("simulation")}
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
          >
            <span>Custom Parameters</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scenarios.slice(0, 6).map((s) => {
            const isAnomaly = s.ground_truth === "anomaly";
            return (
              <div
                key={s.id}
                onClick={() => {
                  onSelectScenario(s);
                  onNavigateTab("simulation");
                }}
                className="group cursor-pointer bg-[#131e36]/60 hover:bg-[#182747] p-5 rounded-2xl border border-slate-800 hover:border-cyan-500/50 transition-all shadow-md space-y-3"
              >
                <div className="flex items-start justify-between">
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                      isAnomaly
                        ? "bg-rose-500/10 text-rose-300 border-rose-500/30"
                        : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                    }`}
                  >
                    {isAnomaly ? "ANOMALOUS / ATTACK" : "NORMAL / REFERENCE"}
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                </div>

                <div>
                  <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                    {s.name}
                  </h4>
                  <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                    {s.description}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-1 pt-2 border-t border-slate-800/80 text-[11px] font-mono text-slate-400">
                  <div>
                    <span className="block text-[9px] uppercase text-slate-500">Eve Tap</span>
                    <span className={s.config.eve_prob > 0 ? "text-purple-400 font-bold" : ""}>
                      {(s.config.eve_prob * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase text-slate-500">Noise</span>
                    <span className={s.config.noise_prob > 0.03 ? "text-amber-400 font-bold" : ""}>
                      {(s.config.noise_prob * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase text-slate-500">Loss</span>
                    <span className={s.config.loss_prob > 0.5 ? "text-amber-400 font-bold" : ""}>
                      {(s.config.loss_prob * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Alerts Feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            <h3 className="text-lg font-bold text-white">Latest Security Alerts</h3>
          </div>
          <button
            onClick={() => onNavigateTab("alerts")}
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
          >
            <span>View All Alerts ({recentAlerts.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentAlerts.length === 0 ? (
          <div className="p-8 text-center bg-[#131e36]/40 rounded-2xl border border-slate-800 text-slate-400 text-sm">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
            <p>No anomalous alerts detected. Channel operating within calibrated parameters.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentAlerts.slice(0, 2).map((alt) => (
              <AlertCard key={alt.alert_id} alert={alt} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
