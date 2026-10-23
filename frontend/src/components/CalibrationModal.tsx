// QuantumGuard AI - Baseline Calibration Modal

import React, { useState } from "react";
import { Sliders, X, Check, AlertCircle, RefreshCw } from "lucide-react";
import { calibrateBaseline } from "../api";
import { BaselineCalibration } from "../types";

interface CalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCalibrationSuccess: (baseline: BaselineCalibration) => void;
}

export const CalibrationModal: React.FC<CalibrationModalProps> = ({
  isOpen,
  onClose,
  onCalibrationSuccess,
}) => {
  const [name, setName] = useState<string>("Standard Telecom Optical Fiber");
  const [version, setVersion] = useState<string>("1.1.0");
  const [numRuns, setNumRuns] = useState<number>(8);
  const [pulsesPerRun, setPulsesPerRun] = useState<number>(1500);
  const [noiseProb, setNoiseProb] = useState<number>(0.015);
  const [lossProb, setLossProb] = useState<number>(0.10);
  const [sensitivity, setSensitivity] = useState<string>("medium");

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const b = await calibrateBaseline({
        name,
        version,
        num_runs: Number(numRuns),
        num_pulses_per_run: Number(pulsesPerRun),
        noise_prob: Number(noiseProb),
        loss_prob: Number(lossProb),
        sensitivity,
      });
      onCalibrationSuccess(b);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to execute baseline calibration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#131e36] rounded-2xl border border-cyan-500/40 w-full max-w-lg p-6 shadow-2xl relative space-y-5">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2.5 border-b border-slate-800 pb-4">
          <div className="p-2 rounded-xl bg-cyan-950/80 text-cyan-400 border border-cyan-800/40">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Empirical Baseline Calibration</h3>
            <p className="text-xs text-slate-400">
              Calibrate empirical channel statistics from clean reference runs.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 block mb-1 font-medium">Baseline Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-[#0b1329] border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="text-slate-300 block mb-1 font-medium">Version Tag</label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                required
                className="w-full bg-[#0b1329] border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 block mb-1 font-medium">Number of Calibration Runs</label>
              <input
                type="number"
                min="3"
                max="30"
                value={numRuns}
                onChange={(e) => setNumRuns(Number(e.target.value))}
                className="w-full bg-[#0b1329] border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Recommended: 6 to 12 runs</span>
            </div>
            <div>
              <label className="text-slate-300 block mb-1 font-medium">Pulses per Run</label>
              <input
                type="number"
                min="500"
                max="5000"
                step="250"
                value={pulsesPerRun}
                onChange={(e) => setPulsesPerRun(Number(e.target.value))}
                className="w-full bg-[#0b1329] border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 block mb-1 font-medium">
                Reference Channel Noise: {(noiseProb * 100).toFixed(1)}%
              </label>
              <input
                type="range"
                min="0.0"
                max="0.05"
                step="0.005"
                value={noiseProb}
                onChange={(e) => setNoiseProb(parseFloat(e.target.value))}
                className="w-full accent-cyan-400"
              />
            </div>
            <div>
              <label className="text-slate-300 block mb-1 font-medium">
                Reference Photon Loss: {(lossProb * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0.0"
                max="0.40"
                step="0.05"
                value={lossProb}
                onChange={(e) => setLossProb(parseFloat(e.target.value))}
                className="w-full accent-cyan-400"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-300 block mb-1 font-medium">Anomaly Sensitivity Multiplier</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "low", label: "Low (4σ)", desc: "Fewer false alarms" },
                { id: "medium", label: "Medium (3σ)", desc: "Standard 99.7% Gaussian" },
                { id: "high", label: "High (2σ)", desc: "Triggers on subtle shift" },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSensitivity(s.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    sensitivity === s.id
                      ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300"
                      : "bg-[#0b1329] border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <span className="font-bold block">{s.label}</span>
                  <span className="text-[10px] opacity-75">{s.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold hover:opacity-90 disabled:opacity-50"
            >
              {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
              <span>{loading ? "Calibrating..." : "Execute Calibration"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
