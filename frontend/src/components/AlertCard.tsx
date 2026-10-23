// QuantumGuard AI - Explainable Security Alert Card Component

import React, { useState } from "react";
import { SecurityAlert } from "../types";
import {
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileSearch,
  Check,
} from "lucide-react";
import { acknowledgeAlert } from "../api";

interface AlertCardProps {
  alert: SecurityAlert;
  onViewRun?: (runId: string) => void;
  onAlertAcknowledged?: (alertId: string) => void;
}

export const AlertCard: React.FC<AlertCardProps> = ({
  alert,
  onViewRun,
  onAlertAcknowledged,
}) => {
  const [expanded, setExpanded] = useState<boolean>(true);
  const [isAcknowledged, setIsAcknowledged] = useState<boolean>(alert.acknowledged);
  const [loadingAck, setLoadingAck] = useState<boolean>(false);

  const handleAck = async () => {
    try {
      setLoadingAck(true);
      await acknowledgeAlert(alert.alert_id);
      setIsAcknowledged(true);
      if (onAlertAcknowledged) onAlertAcknowledged(alert.alert_id);
    } catch (err) {
      console.error("Failed to acknowledge alert:", err);
    } finally {
      setLoadingAck(false);
    }
  };

  // Severity styling
  const severityStyles = {
    CRITICAL: {
      border: "border-rose-500/50",
      bg: "bg-rose-950/20",
      badge: "bg-rose-500/20 text-rose-300 border-rose-500/40",
      icon: ShieldAlert,
      iconColor: "text-rose-400",
    },
    HIGH: {
      border: "border-amber-500/50",
      bg: "bg-amber-950/20",
      badge: "bg-amber-500/20 text-amber-300 border-amber-500/40",
      icon: AlertTriangle,
      iconColor: "text-amber-400",
    },
    MEDIUM: {
      border: "border-yellow-500/40",
      bg: "bg-yellow-950/20",
      badge: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
      icon: AlertTriangle,
      iconColor: "text-yellow-400",
    },
    LOW: {
      border: "border-sky-500/30",
      bg: "bg-sky-950/20",
      badge: "bg-sky-500/20 text-sky-300 border-sky-500/40",
      icon: Info,
      iconColor: "text-sky-400",
    },
    INFO: {
      border: "border-slate-700",
      bg: "bg-slate-900/30",
      badge: "bg-slate-800 text-slate-300 border-slate-700",
      icon: CheckCircle2,
      iconColor: "text-emerald-400",
    },
  }[alert.severity] || {
    border: "border-slate-800",
    bg: "bg-slate-900/40",
    badge: "bg-slate-800 text-slate-300 border-slate-700",
    icon: Info,
    iconColor: "text-slate-400",
  };

  const SeverityIcon = severityStyles.icon;

  return (
    <div
      className={`rounded-2xl border ${severityStyles.border} ${severityStyles.bg} p-5 shadow-lg transition-all space-y-4`}
    >
      {/* Alert Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center space-x-3">
          <div className="p-2 rounded-xl bg-[#0b1329] border border-slate-800">
            <SeverityIcon className={`w-5 h-5 ${severityStyles.iconColor}`} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${severityStyles.badge}`}>
                {alert.severity}
              </span>
              <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-[#0b1329] border border-slate-800 text-slate-300">
                {alert.status}
              </span>
              <span className="text-xs text-slate-400 font-mono hidden md:inline">
                ID: {alert.alert_id}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              Timestamp: {new Date(alert.timestamp).toLocaleString()} | Detector: {alert.detector_type.toUpperCase()}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          {onViewRun && (
            <button
              onClick={() => onViewRun(alert.run_id)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#0b1329] hover:bg-slate-800 border border-slate-800 text-xs text-cyan-300 transition-colors"
            >
              <FileSearch className="w-3.5 h-3.5" />
              <span>Trace Run</span>
            </button>
          )}

          {!isAcknowledged ? (
            <button
              onClick={handleAck}
              disabled={loadingAck}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-xs text-emerald-300 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{loadingAck ? "Saving..." : "Acknowledge"}</span>
            </button>
          ) : (
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-800/40">
              ✓ Acknowledged
            </span>
          )}

          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg bg-[#0b1329] border border-slate-800 text-slate-400 hover:text-white"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Explanation Banner */}
      <div className="bg-[#0b1329]/80 p-3.5 rounded-xl border border-slate-800 text-sm text-slate-200">
        <p className="font-medium">{alert.explanation}</p>
        <p className="text-xs text-slate-400 mt-1">
          <span className="font-semibold text-slate-300">Method used:</span> {alert.test_or_rule_used}
        </p>
      </div>

      {/* Expandable Evidence & Alternative Hypotheses */}
      {expanded && (
        <div className="space-y-4 pt-2">
          {/* Quantitative Metrics Comparison */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="bg-[#0b1329]/60 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase">Observed QBER</span>
              <span className="text-base font-bold text-white">
                {alert.observed_metrics.qber_percent !== null ? `${alert.observed_metrics.qber_percent}%` : "Unavailable"}
              </span>
              {alert.confidence_interval?.ci_lower_percent !== undefined && (
                <span className="text-[10px] text-cyan-400 block mt-0.5">
                  95% CI: [{alert.confidence_interval.ci_lower_percent}%, {alert.confidence_interval.ci_upper_percent}%]
                </span>
              )}
            </div>

            <div className="bg-[#0b1329]/60 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase">Baseline QBER Limit</span>
              <span className="text-base font-bold text-slate-300">
                {alert.baseline_reference?.qber_upper_threshold_percent !== undefined
                  ? `${alert.baseline_reference.qber_upper_threshold_percent}%`
                  : "N/A"}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Mean: {alert.baseline_reference?.mean_qber_percent ?? 0}%
              </span>
            </div>

            <div className="bg-[#0b1329]/60 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase">Photon Loss Rate</span>
              <span className="text-base font-bold text-amber-400">
                {alert.observed_metrics.photon_loss_rate_percent}%
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Detection: {alert.observed_metrics.detection_rate_percent}%
              </span>
            </div>

            <div className="bg-[#0b1329]/60 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase">Test Sample Size</span>
              <span className="text-base font-bold text-indigo-400">
                {alert.sample_size} bits
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Errors: {alert.observed_metrics.error_count}
              </span>
            </div>
          </div>

          {/* Alternative Possible Causes (Multi-Hypothesis Reasoning) */}
          <div className="bg-[#0b1329]/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <h5 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center space-x-1.5">
              <span>Alternative Plausible Explanations (Differential Diagnosis)</span>
            </h5>
            <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-4">
              {alert.alternative_causes.map((cause, idx) => (
                <li key={idx} className="leading-relaxed">
                  {cause}
                </li>
              ))}
            </ul>
          </div>

          {/* Recommended Investigation Steps */}
          <div className="bg-[#0b1329]/60 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
            <h5 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
              Recommended Operator Action
            </h5>
            <p className="text-xs text-slate-200 leading-relaxed font-mono">
              {alert.recommended_next_step}
            </p>
          </div>

          {/* Scientific Disclaimer */}
          <div className="text-[11px] text-slate-400 italic bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/80">
            {alert.scientific_disclaimer}
          </div>
        </div>
      )}
    </div>
  );
};
