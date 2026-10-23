// QuantumGuard AI - Interactive BB84 Quantum Transmission Visualizer

import React, { useState } from "react";
import { PulseDetail } from "../types";
import { Eye, ShieldX, Key, Check, X, Filter, Sparkles, HelpCircle } from "lucide-react";

interface BB84VisualizerProps {
  pulses: PulseDetail[];
  totalTransmitted: number;
  detectedCount: number;
  siftedCount: number;
  testBitsCount: number;
  errorCount: number;
  qberPercent: number | null;
}

export const BB84Visualizer: React.FC<BB84VisualizerProps> = ({
  pulses,
  totalTransmitted,
  detectedCount,
  siftedCount,
  testBitsCount,
  errorCount,
  qberPercent,
}) => {
  const [filterMode, setFilterMode] = useState<"all" | "sifted" | "test" | "error" | "eve">("all");
  const [page, setPage] = useState<number>(0);
  const pageSize = 12;

  // Filter pulses based on selected tab
  const filteredPulses = pulses.filter((p) => {
    if (filterMode === "sifted") return p.is_sifted;
    if (filterMode === "test") return p.is_test_bit;
    if (filterMode === "error") return p.is_error === true;
    if (filterMode === "eve") return p.eve_intercepted;
    return true;
  });

  const totalPages = Math.ceil(filteredPulses.length / pageSize) || 1;
  const currentPulses = filteredPulses.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className="bg-[#131e36]/80 rounded-2xl border border-cyan-900/30 p-6 shadow-xl space-y-6">
      {/* Visualizer Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-bold text-slate-100">
              Interactive BB84 Quantum Channel Protocol Visualizer
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Pulse-by-pulse single photon inspection showing Alice encoding, Eve intercept-resend, Bob measurement, and sifting reconciliation.
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center space-x-1.5 bg-[#0b1329] p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => { setFilterMode("all"); setPage(0); }}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filterMode === "all" ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            All Pulses ({pulses.length})
          </button>
          <button
            onClick={() => { setFilterMode("sifted"); setPage(0); }}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filterMode === "sifted" ? "bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/40" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Sifted ({pulses.filter((p) => p.is_sifted).length})
          </button>
          <button
            onClick={() => { setFilterMode("test"); setPage(0); }}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filterMode === "test" ? "bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Test Bits ({pulses.filter((p) => p.is_test_bit).length})
          </button>
          <button
            onClick={() => { setFilterMode("error"); setPage(0); }}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filterMode === "error" ? "bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Errors ({pulses.filter((p) => p.is_error === true).length})
          </button>
          <button
            onClick={() => { setFilterMode("eve"); setPage(0); }}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filterMode === "eve" ? "bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Eve Tapped ({pulses.filter((p) => p.eve_intercepted).length})
          </button>
        </div>
      </div>

      {/* Protocol Pipeline Statistics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-[#0b1329]/60 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] uppercase font-mono text-slate-400 block">1. Transmitted</span>
          <span className="text-base font-bold text-slate-200">{totalTransmitted} pulses</span>
        </div>
        <div className="bg-[#0b1329]/60 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] uppercase font-mono text-slate-400 block">2. Detected (Bob)</span>
          <span className="text-base font-bold text-cyan-400">{detectedCount}</span>
        </div>
        <div className="bg-[#0b1329]/60 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] uppercase font-mono text-slate-400 block">3. Sifted (Match)</span>
          <span className="text-base font-bold text-indigo-400">{siftedCount}</span>
        </div>
        <div className="bg-[#0b1329]/60 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] uppercase font-mono text-slate-400 block">4. Test Disclosed</span>
          <span className="text-base font-bold text-amber-400">{testBitsCount}</span>
        </div>
        <div className="bg-[#0b1329]/60 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] uppercase font-mono text-slate-400 block">5. Bit Errors</span>
          <span className="text-base font-bold text-rose-400">{errorCount}</span>
        </div>
        <div className="bg-[#0b1329]/60 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] uppercase font-mono text-slate-400 block">6. Observed QBER</span>
          <span className={`text-base font-bold ${qberPercent !== null && qberPercent > 11.0 ? "text-rose-400" : "text-emerald-400"}`}>
            {qberPercent !== null ? `${qberPercent.toFixed(2)}%` : "N/A"}
          </span>
        </div>
      </div>

      {/* Pulse Table / Cards */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-[#0b1329] text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
            <tr>
              <th className="p-3">#</th>
              <th className="p-3">Alice Bit & Basis</th>
              <th className="p-3">Photon State</th>
              <th className="p-3">Channel Transit & Eve</th>
              <th className="p-3">Bob Basis & Bit</th>
              <th className="p-3">Bases Match?</th>
              <th className="p-3">Sifting Role</th>
              <th className="p-3">Error Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {currentPulses.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-slate-400 italic">
                  No pulses match the selected filter.
                </td>
              </tr>
            ) : (
              currentPulses.map((p) => {
                const basisColor = p.alice_basis === "+" ? "text-cyan-400" : "text-purple-400";
                return (
                  <tr key={p.pulse_index} className="hover:bg-slate-800/30 transition-colors">
                    {/* Index */}
                    <td className="p-3 text-slate-400 font-bold">{p.pulse_index + 1}</td>

                    {/* Alice Bit & Basis */}
                    <td className="p-3">
                      <span className="px-2 py-1 rounded bg-[#0b1329] border border-slate-800 text-slate-200">
                        Bit <span className="font-bold text-white">{p.alice_bit}</span> ({p.alice_basis === "+" ? "Rect +" : "Diag ×"})
                      </span>
                    </td>

                    {/* Quantum State */}
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded font-bold text-sm bg-slate-900 border border-slate-800 ${basisColor}`}>
                        {p.alice_state}
                      </span>
                    </td>

                    {/* Channel & Eve */}
                    <td className="p-3">
                      {p.photon_lost ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 text-[11px]">
                          <ShieldX className="w-3 h-3 text-slate-400" />
                          <span>Photon Lost</span>
                        </span>
                      ) : p.eve_intercepted ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800/50 text-[11px]">
                          <Eye className="w-3 h-3 text-purple-400 animate-pulse" />
                          <span>Eve Tapped ({p.eve_basis}, bit={p.eve_measured_bit})</span>
                        </span>
                      ) : (
                        <span className="text-emerald-400 text-[11px] inline-flex items-center space-x-1">
                          <Check className="w-3 h-3" />
                          <span>Clear Channel</span>
                        </span>
                      )}
                    </td>

                    {/* Bob Detection & Measurement */}
                    <td className="p-3">
                      {p.bob_detection ? (
                        <span className="px-2 py-1 rounded bg-[#0b1329] border border-slate-800 text-slate-200">
                          Measured <span className="font-bold text-white">{p.bob_measured_bit}</span> ({p.bob_basis === "+" ? "Rect +" : "Diag ×"})
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">No Detection</span>
                      )}
                    </td>

                    {/* Bases Match */}
                    <td className="p-3">
                      {p.bob_detection ? (
                        p.bases_match ? (
                          <span className="px-2 py-0.5 rounded text-[11px] bg-emerald-950/70 text-emerald-300 border border-emerald-800/50">
                            MATCH ({p.alice_basis} == {p.bob_basis})
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[11px] bg-slate-800/80 text-slate-400">
                            MISMATCH (Discarded)
                          </span>
                        )
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Sifting Role */}
                    <td className="p-3">
                      {p.is_test_bit ? (
                        <span className="px-2 py-0.5 rounded text-[11px] bg-amber-950/80 text-amber-300 border border-amber-800/50 font-bold">
                          🧪 Disclosed Test Bit
                        </span>
                      ) : p.is_sifted ? (
                        <span className="px-2 py-0.5 rounded text-[11px] bg-indigo-950/80 text-indigo-300 border border-indigo-800/50 inline-flex items-center space-x-1 font-bold">
                          <Key className="w-3 h-3" />
                          <span>Candidate Raw Key</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Error Status */}
                    <td className="p-3">
                      {p.is_test_bit ? (
                        p.is_error ? (
                          <span className="px-2 py-0.5 rounded text-[11px] bg-rose-950 text-rose-300 border border-rose-800 font-bold inline-flex items-center space-x-1">
                            <X className="w-3 h-3" />
                            <span>BIT ERROR</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[11px] bg-emerald-950 text-emerald-300 border border-emerald-800 inline-flex items-center space-x-1">
                            <Check className="w-3 h-3" />
                            <span>Correct</span>
                          </span>
                        )
                      ) : (
                        <span className="text-slate-400 text-[10px]">Undisclosed</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800">
          <span>
            Showing {page * pageSize + 1} - {Math.min((page + 1) * pageSize, filteredPulses.length)} of {filteredPulses.length} pulses
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 rounded-lg bg-[#0b1329] border border-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800"
            >
              Previous
            </button>
            <span className="font-mono text-cyan-400">
              Page {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="px-3 py-1.5 rounded-lg bg-[#0b1329] border border-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
