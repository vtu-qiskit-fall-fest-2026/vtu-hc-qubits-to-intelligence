// QuantumGuard AI - Independent Benchmark Evaluation Page

import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  Play,
  RotateCcw,
  BarChart2,
  Table,
  ShieldCheck,
  AlertTriangle,
  Info,
  Clock,
  Sparkles,
} from "lucide-react";
import { BenchmarkEvaluationReport, DetectorMetrics } from "../types";
import { executeBenchmark, fetchLatestBenchmark } from "../api";

export const EvaluationPage: React.FC = () => {
  const [report, setReport] = useState<BenchmarkEvaluationReport | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [runsPerScenario, setRunsPerScenario] = useState<number>(4);
  const [baseSeed, setBaseSeed] = useState<number>(42);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load latest benchmark on mount
  useEffect(() => {
    fetchLatestBenchmark()
      .then((res) => {
        if (res.exists && res.report) {
          setReport(res.report);
        }
      })
      .catch((err) => console.error("Failed to load initial benchmark:", err));
  }, []);

  const handleRunBenchmark = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await executeBenchmark(runsPerScenario, baseSeed);
      setReport(res);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to execute independent benchmark evaluation.");
    } finally {
      setLoading(false);
    }
  };

  const detectors = report?.detector_metrics ? Object.entries(report.detector_metrics) : [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            <span>Independent Performance Benchmark & Model Evaluation</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Empirical validation of Rule-Based, Statistical, and Machine-Learning detectors across held-out scenarios without data leakage.
          </p>
        </div>

        {/* Benchmark Trigger Controls */}
        <div className="flex items-center space-x-3 bg-[#131e36] p-2 rounded-xl border border-slate-700 text-xs">
          <div className="flex items-center space-x-1">
            <span className="text-slate-400">Runs/Scenario:</span>
            <input
              type="number"
              min="2"
              max="10"
              value={runsPerScenario}
              onChange={(e) => setRunsPerScenario(Number(e.target.value))}
              className="w-14 bg-[#0b1329] border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-center"
            />
          </div>

          <button
            onClick={handleRunBenchmark}
            disabled={loading}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-600 hover:opacity-90 text-white font-bold disabled:opacity-50 transition-all cursor-pointer shadow-md shadow-emerald-500/20"
          >
            {loading ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
            <span>{loading ? "Running Benchmark..." : "Execute Benchmark"}</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-xs text-rose-300">
          {errorMsg}
        </div>
      )}

      {/* No Report State */}
      {!report && !loading && (
        <div className="p-12 text-center bg-[#131e36]/60 rounded-2xl border border-slate-800 text-slate-400 space-y-3">
          <Sparkles className="w-10 h-10 text-cyan-400 mx-auto" />
          <h4 className="text-base font-bold text-white">No Benchmark Executed Yet</h4>
          <p className="text-xs max-w-md mx-auto">
            Click "Execute Benchmark" above to generate independent held-out simulation batches and compute real precision, recall, and confusion matrices.
          </p>
        </div>
      )}

      {/* Report Dashboard */}
      {report && (
        <div className="space-y-8">
          {/* Metadata Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="bg-[#131e36]/80 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase text-slate-400 block">Evaluated Test Samples</span>
              <span className="text-lg font-bold text-cyan-400">{report.num_samples_evaluated} runs</span>
            </div>
            <div className="bg-[#131e36]/80 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase text-slate-400 block">Calibration Reference</span>
              <span className="text-lg font-bold text-indigo-400">{report.num_calibration_samples} runs</span>
            </div>
            <div className="bg-[#131e36]/80 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase text-slate-400 block">ML Unsupervised Train</span>
              <span className="text-lg font-bold text-purple-400">{report.num_training_samples} runs</span>
            </div>
            <div className="bg-[#131e36]/80 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase text-slate-400 block">Data Leakage Guard</span>
              <span className="text-base font-bold text-emerald-400">Strictly Isolated</span>
            </div>
          </div>

          {/* Model Comparison Table */}
          <div className="bg-[#131e36]/80 rounded-2xl border border-cyan-900/40 p-6 shadow-xl space-y-4">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <Table className="w-4 h-4 text-cyan-400" />
                  <span>Fair Detector Comparison on Held-Out Test Data</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Every detector evaluated simultaneously on identical, untouched simulation test batches.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#0b1329] text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3">Detector Engine</th>
                    <th className="p-3">Accuracy</th>
                    <th className="p-3">Precision</th>
                    <th className="p-3">Recall</th>
                    <th className="p-3">F1-Score</th>
                    <th className="p-3">FPR</th>
                    <th className="p-3">Confusion (TP / FP / TN / FN)</th>
                    <th className="p-3">Avg Latency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {detectors.map(([key, m]) => (
                    <tr key={key} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 font-bold text-slate-200">
                        {m.detector_name}
                        <span className="block text-[10px] text-slate-400 font-normal">{m.detector_type}</span>
                      </td>
                      <td className="p-3 font-bold text-cyan-300">
                        {(m.accuracy * 100).toFixed(1)}%
                      </td>
                      <td className="p-3">
                        {m.precision !== null ? `${(m.precision * 100).toFixed(1)}%` : "N/A"}
                      </td>
                      <td className="p-3">
                        {m.recall !== null ? `${(m.recall * 100).toFixed(1)}%` : "N/A"}
                      </td>
                      <td className="p-3 font-bold text-indigo-300">
                        {m.f1_score !== null ? `${(m.f1_score * 100).toFixed(1)}%` : "N/A"}
                      </td>
                      <td className="p-3 text-amber-400">
                        {m.false_positive_rate !== null ? `${(m.false_positive_rate * 100).toFixed(1)}%` : "N/A"}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-1 rounded bg-[#0b1329] border border-slate-800 text-slate-300">
                          {m.confusion_matrix.true_positives} TP / {m.confusion_matrix.false_positives} FP /{" "}
                          {m.confusion_matrix.true_negatives} TN / {m.confusion_matrix.false_negatives} FN
                        </span>
                      </td>
                      <td className="p-3 text-slate-400">
                        {m.avg_latency_ms} ms
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Scenario-by-Scenario Detection Breakdown */}
          <div className="bg-[#131e36]/80 rounded-2xl border border-cyan-900/40 p-6 shadow-xl space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <BarChart2 className="w-4 h-4 text-indigo-400" />
                <span>Scenario-by-Scenario Detection Sensitivity Breakdown</span>
              </h3>
              <p className="text-xs text-slate-400">
                Number of positive anomaly triggers per scenario across independent runs.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#0b1329] text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3">Scenario Name</th>
                    <th className="p-3">Ground Truth</th>
                    <th className="p-3">Samples</th>
                    <th className="p-3">Rule Hits</th>
                    <th className="p-3">Statistical Hits</th>
                    <th className="p-3">ML Hits</th>
                    <th className="p-3">Hybrid Hits</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {report.scenario_breakdowns.map((sb) => {
                    const isPositive = sb.ground_truth === "anomaly";
                    return (
                      <tr key={sb.scenario_id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-3 font-medium text-slate-200">{sb.scenario_name}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isPositive ? "bg-rose-950 text-rose-300" : "bg-emerald-950 text-emerald-300"
                            }`}
                          >
                            {sb.ground_truth.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3 text-slate-400">{sb.sample_count}</td>
                        <td className="p-3 text-cyan-300">{sb.rule_detected_count} / {sb.sample_count}</td>
                        <td className="p-3 text-indigo-300">{sb.stat_detected_count} / {sb.sample_count}</td>
                        <td className="p-3 text-purple-300">{sb.ml_detected_count} / {sb.sample_count}</td>
                        <td className="p-3 font-bold text-emerald-300">{sb.hybrid_detected_count} / {sb.sample_count}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Scientific Honesty & Limitations Card */}
          <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 space-y-3 text-xs text-slate-300">
            <h4 className="font-bold text-white uppercase text-xs tracking-wider flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>Scientific Research Honesty & Evaluation Limitations</span>
            </h4>
            <ul className="space-y-1.5 list-disc pl-5 leading-relaxed text-slate-400">
              <li>
                <strong className="text-slate-200">Synthetic Dataset Scope:</strong> These benchmark evaluations establish that the prototype functions as designed under modeled physics (Poisson/Bernoulli channel loss, depolarizing noise, intercept-resend attack). They do not prove real-world optical hardware security.
              </li>
              <li>
                <strong className="text-slate-200">No Unsubstantiated Superiority:</strong> The ML model (Isolation Forest) is evaluated strictly on its outlier scoring merits. It does not replace deterministic protocol boundaries (such as the Shor-Preskill 11% threshold).
              </li>
              <li>
                <strong className="text-slate-200">Leakage Prevention:</strong> Training sets strictly excluded ground-truth labels and hidden simulation parameters. All metrics reported above were computed from live prediction arrays.
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
