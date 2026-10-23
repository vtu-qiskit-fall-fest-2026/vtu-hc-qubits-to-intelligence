// QuantumGuard AI - Channel Analysis & Telemetry Trends

import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  AreaChart,
  Area,
} from "recharts";
import {
  TrendingUp,
  Activity,
  Layers,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Info,
} from "lucide-react";
import { fetchChannelTrends } from "../api";
import { ChannelTrendPoint, BaselineCalibration } from "../types";

interface ChannelAnalysisPageProps {
  activeBaseline: BaselineCalibration | null;
}

export const ChannelAnalysisPage: React.FC<ChannelAnalysisPageProps> = ({
  activeBaseline,
}) => {
  const [trendData, setTrendData] = useState<ChannelTrendPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [limit, setLimit] = useState<number>(20);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchChannelTrends(limit);
      setTrendData(res.data);
    } catch (err) {
      console.error("Failed to load channel trends:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [limit]);

  // Format data for Recharts
  const chartPoints = trendData.map((d, idx) => ({
    index: idx + 1,
    runId: d.run_id,
    scenario: d.scenario_name,
    qber: d.qber_percent ?? 0,
    loss: d.photon_loss_rate_percent,
    detection: d.detection_rate_percent,
    sifted: d.sifted_bits_count,
    groundTruth: d.ground_truth,
    baselineLimit: activeBaseline ? activeBaseline.qber_upper_threshold * 100 : 8.0,
    shorPreskillLimit: 11.0,
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
            <TrendingUp className="w-6 h-6 text-cyan-400" />
            <span>Quantum Channel Telemetry & Statistical Trends</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Historical progression of QBER, photon attenuation, and receiver detection across sequential runs.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-400">Sample window:</span>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="bg-[#131e36] border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
          >
            <option value={10}>Last 10 Runs</option>
            <option value={20}>Last 20 Runs</option>
            <option value={40}>Last 40 Runs</option>
          </select>
          <button
            onClick={loadData}
            className="p-1.5 rounded-lg bg-[#131e36] hover:bg-slate-800 text-slate-300 border border-slate-700"
            title="Refresh trends"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Chart 1: QBER Trend vs Baseline Thresholds */}
      <div className="bg-[#131e36]/80 rounded-2xl border border-cyan-900/40 p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>QBER Progression vs Calibrated Baseline & Shor-Preskill Boundary</span>
            </h3>
            <p className="text-xs text-slate-400">
              Yellow line marks calibrated baseline limit. Red line marks the 11.0% Shor-Preskill asymptotic security threshold.
            </p>
          </div>
        </div>

        <div className="h-72 w-full pt-2">
          {chartPoints.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">
              No historical run points available yet. Execute simulations to populate trends.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartPoints} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="index" stroke="#64748b" tick={{ fontSize: 11 }} label={{ value: "Run Sequence", position: "insideBottomRight", offset: -5, fill: "#64748b", fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} domain={[0, 30]} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0b1329", borderColor: "#1e293b", borderRadius: "12px", fontSize: "12px" }}
                  formatter={(value: any, name: any) => [`${value}%`, name]}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                <ReferenceLine
                  y={11.0}
                  label={{ value: "Shor-Preskill Security Limit (11%)", fill: "#f43f5e", fontSize: 10, position: "top" }}
                  stroke="#f43f5e"
                  strokeDasharray="4 4"
                />
                {activeBaseline && (
                  <ReferenceLine
                    y={activeBaseline.qber_upper_threshold * 100}
                    label={{ value: `Baseline Limit (${(activeBaseline.qber_upper_threshold * 100).toFixed(1)}%)`, fill: "#f59e0b", fontSize: 10, position: "insideBottomLeft" }}
                    stroke="#f59e0b"
                    strokeDasharray="3 3"
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="qber"
                  name="Observed QBER (%)"
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#38bdf8" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Chart 2: Photon Loss vs Detection Rate */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Loss vs Detection */}
        <div className="bg-[#131e36]/80 rounded-2xl border border-cyan-900/40 p-6 shadow-xl space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>Photon Attenuation vs Receiver Detection</span>
            </h3>
            <p className="text-xs text-slate-400">
              Validates that photon loss drops detection counts without creating false bit errors.
            </p>
          </div>

          <div className="h-64 w-full pt-2">
            {chartPoints.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">
                No telemetry available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartPoints} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="index" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0b1329", borderColor: "#1e293b", borderRadius: "12px", fontSize: "12px" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                  <Area
                    type="monotone"
                    dataKey="detection"
                    name="Detection Rate (%)"
                    stroke="#06b6d4"
                    fill="#06b6d4"
                    fillOpacity={0.2}
                  />
                  <Area
                    type="monotone"
                    dataKey="loss"
                    name="Photon Loss Rate (%)"
                    stroke="#f59e0b"
                    fill="#f59e0b"
                    fillOpacity={0.15}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Diagnostic Guide & Differential Reasoning */}
        <div className="bg-[#131e36]/80 rounded-2xl border border-cyan-900/40 p-6 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Info className="w-4 h-4 text-indigo-400" />
              <span>Scientific Anomaly Diagnostics Guide</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              In real fiber-optic quantum channels, distinct physical mechanisms produce characteristic telemetry signatures:
            </p>

            <div className="space-y-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-[#0b1329] border border-slate-800">
                <span className="font-bold text-cyan-300 block">High Loss + Normal QBER:</span>
                <span className="text-slate-400 text-[11px]">
                  Physical fiber bending, connector insertion loss, or dirty optical splices. No evidence of eavesdropping.
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-[#0b1329] border border-slate-800">
                <span className="font-bold text-amber-300 block">Normal Loss + Elevated QBER (4% - 9%):</span>
                <span className="text-slate-400 text-[11px]">
                  Could be thermal noise, laser polarization drift, detector dark counts, or partial intercept-resend (Eve ~ 25%).
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-[#0b1329] border border-slate-800">
                <span className="font-bold text-rose-300 block">QBER &gt; 11% (Shor-Preskill Excursion):</span>
                <span className="text-slate-400 text-[11px]">
                  Severe attack (e.g. Full Intercept-Resend yields ~25%) or complete optical failure. Key distillation must abort.
                </span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-cyan-950/40 rounded-xl border border-cyan-800/40 text-[11px] text-cyan-300">
            QuantumGuard AI never equates elevated QBER with definitive proof of an adversary, maintaining scientific rigor.
          </div>
        </div>
      </div>
    </div>
  );
};
