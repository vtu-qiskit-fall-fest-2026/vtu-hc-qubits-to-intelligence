// QuantumGuard AI - Run History & Persistence Drilldown Page

import React, { useEffect, useState } from "react";
import {
  History,
  Search,
  Filter,
  FileSearch,
  RefreshCw,
  X,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCw,
} from "lucide-react";
import { fetchHistoryRuns, fetchRunDetails, reanalyzeRun } from "../api";
import { SimulationRunResult, PulseDetail } from "../types";
import { BB84Visualizer } from "../components/BB84Visualizer";
import { AlertCard } from "../components/AlertCard";

export const HistoryPage: React.FC = () => {
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [scenarioFilter, setScenarioFilter] = useState<string>("all");
  const [selectedRun, setSelectedRun] = useState<SimulationRunResult | null>(null);
  const [modalLoading, setModalLoading] = useState<boolean>(false);
  const [reanalyzeLoading, setReanalyzeLoading] = useState<boolean>(false);
  const [reanalyzeAlert, setReanalyzeAlert] = useState<any>(null);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const data = await fetchHistoryRuns(100);
      setRuns(data);
    } catch (err) {
      console.error("Failed to load history runs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleInspectRun = async (runId: string) => {
    try {
      setModalLoading(true);
      setReanalyzeAlert(null);
      const run = await fetchRunDetails(runId);
      setSelectedRun(run);
    } catch (err) {
      console.error("Failed to fetch run details:", err);
    } finally {
      setModalLoading(false);
    }
  };

  const handleReanalyze = async () => {
    if (!selectedRun) return;
    try {
      setReanalyzeLoading(true);
      const res = await reanalyzeRun(selectedRun.run_id);
      setReanalyzeAlert(res.alert);
    } catch (err) {
      console.error("Failed to re-analyze run:", err);
    } finally {
      setReanalyzeLoading(false);
    }
  };

  // Filter runs
  const filteredRuns = runs.filter((r) => {
    if (scenarioFilter !== "all" && r.scenario_id !== scenarioFilter) return false;
    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      return (
        r.run_id.toLowerCase().includes(term) ||
        r.scenario_name.toLowerCase().includes(term)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
            <History className="w-6 h-6 text-cyan-400" />
            <span>Persistent Simulation & Channel History</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Browse and inspect all past simulation runs preserved in the local SQLite database.
          </p>
        </div>

        <button
          onClick={loadHistory}
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-[#131e36] hover:bg-slate-800 border border-slate-700 text-xs text-slate-200 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh History</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#131e36]/80 p-4 rounded-2xl border border-cyan-900/40 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by Run ID or scenario..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#0b1329] border border-slate-700 text-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:border-cyan-500 w-64"
            />
          </div>

          <div className="flex items-center space-x-1.5">
            <Filter className="w-4 h-4 text-cyan-400" />
            <select
              value={scenarioFilter}
              onChange={(e) => setScenarioFilter(e.target.value)}
              className="bg-[#0b1329] border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
            >
              <option value="all">All Scenarios</option>
              <option value="ideal_normal">Ideal Channel</option>
              <option value="normal_background_noise">Normal with Background Noise</option>
              <option value="high_channel_noise">High Channel Noise</option>
              <option value="high_photon_loss">High Photon Loss</option>
              <option value="partial_eve">Partial Intercept-Resend</option>
              <option value="full_eve">Full Intercept-Resend</option>
              <option value="combined_disturbance">Combined Disturbance</option>
            </select>
          </div>
        </div>

        <div className="font-mono text-slate-400">
          Total Persisted Runs: {filteredRuns.length}
        </div>
      </div>

      {/* Historical Runs Table */}
      <div className="bg-[#131e36]/80 rounded-2xl border border-cyan-900/40 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#0b1329] text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3">Run ID</th>
                <th className="p-3">Timestamp</th>
                <th className="p-3">Scenario</th>
                <th className="p-3">QBER</th>
                <th className="p-3">Loss Rate</th>
                <th className="p-3">Detection Rate</th>
                <th className="p-3">Sifted Bits</th>
                <th className="p-3">Test Bits</th>
                <th className="p-3">Ground Truth</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredRuns.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-slate-400 italic">
                    No runs found in database matching criteria.
                  </td>
                </tr>
              ) : (
                filteredRuns.map((r) => {
                  const qberP = r.qber !== null ? (r.qber * 100).toFixed(2) : "N/A";
                  const isAnomaly = r.ground_truth_label === "anomaly";
                  return (
                    <tr key={r.run_id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 font-bold text-cyan-400">{r.run_id}</td>
                      <td className="p-3 text-slate-400">
                        {new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="p-3 text-slate-200 font-medium">{r.scenario_name}</td>
                      <td className="p-3 font-bold">
                        <span
                          className={
                            r.qber !== null && r.qber > 0.11
                              ? "text-rose-400"
                              : r.qber !== null && r.qber > 0.04
                              ? "text-amber-400"
                              : "text-emerald-400"
                          }
                        >
                          {qberP !== "N/A" ? `${qberP}%` : "N/A"}
                        </span>
                      </td>
                      <td className="p-3 text-amber-300">{(r.photon_loss_rate * 100).toFixed(1)}%</td>
                      <td className="p-3 text-cyan-300">{(r.detection_rate * 100).toFixed(1)}%</td>
                      <td className="p-3 text-slate-300">{r.sifted_bits_count}</td>
                      <td className="p-3 text-slate-300">{r.test_bits_count}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isAnomaly ? "bg-rose-950 text-rose-300" : "bg-emerald-950 text-emerald-300"
                          }`}
                        >
                          {r.ground_truth_label.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleInspectRun(r.run_id)}
                          className="px-2.5 py-1 rounded bg-[#0b1329] hover:bg-slate-800 border border-slate-700 text-cyan-300 hover:text-white transition-colors"
                        >
                          Inspect →
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drilldown Modal */}
      {selectedRun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#131e36] rounded-2xl border border-cyan-500/40 w-full max-w-4xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => setSelectedRun(null)}
              className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="border-b border-slate-800 pb-4">
              <span className="text-[10px] uppercase font-mono text-cyan-400 block">Simulation Run Inspection</span>
              <div className="flex flex-wrap items-center justify-between gap-3 mt-1">
                <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                  <span>{selectedRun.config.scenario_name}</span>
                  <span className="text-xs font-mono text-slate-400">({selectedRun.run_id})</span>
                </h3>

                <button
                  onClick={handleReanalyze}
                  disabled={reanalyzeLoading}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${reanalyzeLoading ? "animate-spin" : ""}`} />
                  <span>Re-Analyze with Current Baseline</span>
                </button>
              </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="bg-[#0b1329] p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">Observed QBER</span>
                <span className="text-base font-bold text-cyan-400">
                  {selectedRun.metrics.qber !== null ? `${(selectedRun.metrics.qber * 100).toFixed(2)}%` : "N/A"}
                </span>
                {selectedRun.metrics.qber_confidence_lower != null && selectedRun.metrics.qber_confidence_upper != null && (
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    CI: [{(selectedRun.metrics.qber_confidence_lower * 100).toFixed(1)}%,{" "}
                    {(selectedRun.metrics.qber_confidence_upper * 100).toFixed(1)}%]
                  </span>
                )}
              </div>

              <div className="bg-[#0b1329] p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">Photon Loss Rate</span>
                <span className="text-base font-bold text-amber-400">
                  {(selectedRun.metrics.photon_loss_rate * 100).toFixed(1)}%
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Detection: {(selectedRun.metrics.detection_rate * 100).toFixed(1)}%
                </span>
              </div>

              <div className="bg-[#0b1329] p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">Sifted / Test Bits</span>
                <span className="text-base font-bold text-indigo-400">
                  {selectedRun.metrics.sifted_bits_count} / {selectedRun.metrics.test_bits_count}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Raw Key: {selectedRun.metrics.candidate_key_bits_count} bits
                </span>
              </div>

              <div className="bg-[#0b1329] p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">Bit Errors</span>
                <span className="text-base font-bold text-rose-400">
                  {selectedRun.metrics.error_count}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Sample Sufficient: {selectedRun.metrics.sample_size_sufficient ? "Yes" : "No"}
                </span>
              </div>
            </div>

            {/* Reanalyze Alert Output */}
            {reanalyzeAlert && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400">Re-Analysis Alert Verdict:</h4>
                <AlertCard alert={reanalyzeAlert} />
              </div>
            )}

            {/* BB84 Pulse Visualizer */}
            <BB84Visualizer
              pulses={selectedRun.sample_pulses}
              totalTransmitted={selectedRun.metrics.transmitted_pulses}
              detectedCount={selectedRun.metrics.detected_pulses}
              siftedCount={selectedRun.metrics.sifted_bits_count}
              testBitsCount={selectedRun.metrics.test_bits_count}
              errorCount={selectedRun.metrics.error_count}
              qberPercent={selectedRun.metrics.qber !== null ? selectedRun.metrics.qber * 100 : null}
            />
          </div>
        </div>
      )}
    </div>
  );
};
