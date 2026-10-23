// QuantumGuard AI - Security Alerts Investigation Center

import React, { useState } from "react";
import { ShieldAlert, Filter, CheckCircle2, AlertTriangle, Info, RefreshCw } from "lucide-react";
import { SecurityAlert } from "../types";
import { AlertCard } from "../components/AlertCard";

interface AlertsPageProps {
  alerts: SecurityAlert[];
  onRefreshAlerts: () => void;
  onViewRun: (runId: string) => void;
}

export const AlertsPage: React.FC<AlertsPageProps> = ({
  alerts,
  onRefreshAlerts,
  onViewRun,
}) => {
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [hideAcknowledged, setHideAcknowledged] = useState<boolean>(false);

  // Filter alerts
  const filteredAlerts = alerts.filter((a) => {
    if (hideAcknowledged && a.acknowledged) return false;
    if (filterSeverity !== "all" && a.severity !== filterSeverity) return false;
    if (filterStatus !== "all" && a.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
            <ShieldAlert className="w-6 h-6 text-rose-400" />
            <span>Explainable Security Alerts Center</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Investigate multi-hypothesis channel alerts with statistical evidence, baseline thresholds, and alternative causes.
          </p>
        </div>

        <button
          onClick={onRefreshAlerts}
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-[#131e36] hover:bg-slate-800 border border-slate-700 text-xs text-slate-200 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
          <span>Refresh Alerts</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#131e36]/80 p-4 rounded-2xl border border-cyan-900/40 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-1.5">
            <Filter className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-400 font-medium">Severity:</span>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="bg-[#0b1329] border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1 focus:outline-none"
            >
              <option value="all">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
              <option value="INFO">Info</option>
            </select>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-slate-400 font-medium">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-[#0b1329] border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="INVESTIGATION REQUIRED">Investigation Required</option>
              <option value="ANOMALY SUSPECTED">Anomaly Suspected</option>
              <option value="INSUFFICIENT DATA">Insufficient Data</option>
              <option value="NORMAL">Normal</option>
            </select>
          </div>

          <label className="flex items-center space-x-2 cursor-pointer text-slate-300">
            <input
              type="checkbox"
              checked={hideAcknowledged}
              onChange={(e) => setHideAcknowledged(e.target.checked)}
              className="rounded bg-[#0b1329] border-slate-700 text-cyan-500 focus:ring-0"
            />
            <span>Hide Acknowledged</span>
          </label>
        </div>

        <div className="text-xs font-mono text-slate-400">
          Showing {filteredAlerts.length} of {alerts.length} alerts
        </div>
      </div>

      {/* Alert Cards Feed */}
      {filteredAlerts.length === 0 ? (
        <div className="p-12 text-center bg-[#131e36]/40 rounded-2xl border border-slate-800 text-slate-400 space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto opacity-70" />
          <h4 className="text-base font-bold text-slate-300">No Alerts Match Your Filters</h4>
          <p className="text-xs max-w-md mx-auto">
            Either all alerts have been acknowledged or no anomalies have occurred under the selected criteria.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAlerts.map((alt) => (
            <AlertCard
              key={alt.alert_id}
              alert={alt}
              onViewRun={onViewRun}
              onAlertAcknowledged={onRefreshAlerts}
            />
          ))}
        </div>
      )}
    </div>
  );
};
