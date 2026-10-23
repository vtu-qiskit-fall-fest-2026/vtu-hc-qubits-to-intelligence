// QuantumGuard AI - Main Application Component

import React, { useEffect, useState } from "react";
import { Navbar } from "./components/Navbar";
import { CalibrationModal } from "./components/CalibrationModal";
import { OverviewPage } from "./pages/OverviewPage";
import { SimulationPage } from "./pages/SimulationPage";
import { ChannelAnalysisPage } from "./pages/ChannelAnalysisPage";
import { AlertsPage } from "./pages/AlertsPage";
import { EvaluationPage } from "./pages/EvaluationPage";
import { HistoryPage } from "./pages/HistoryPage";
import { AudioAnomalyPage } from "./pages/AudioAnomalyPage";
import {
  fetchHealth,
  fetchScenarios,
  fetchActiveBaseline,
  fetchAlerts,
} from "./api";
import {
  ScenarioPreset,
  SimulationRunResult,
  SecurityAlert,
  BaselineCalibration,
} from "./types";

export function App() {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [isBackendHealthy, setIsBackendHealthy] = useState<boolean>(true);
  const [activeBaseline, setActiveBaseline] = useState<BaselineCalibration | null>(null);
  const [scenarios, setScenarios] = useState<ScenarioPreset[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<ScenarioPreset | null>(null);
  const [latestRun, setLatestRun] = useState<SimulationRunResult | null>(null);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [isCalibrationOpen, setIsCalibrationOpen] = useState<boolean>(false);

  // Load initial global state
  const loadSystemState = async () => {
    try {
      const health = await fetchHealth();
      setIsBackendHealthy(health.status === "healthy");

      const scList = await fetchScenarios();
      setScenarios(scList);
      if (scList.length > 0 && !selectedScenario) {
        setSelectedScenario(scList[1] || scList[0]);
      }

      const bRes = await fetchActiveBaseline();
      if (bRes.active && bRes.baseline) {
        setActiveBaseline(bRes.baseline);
      }

      const alertList = await fetchAlerts();
      setAlerts(alertList);
    } catch (err) {
      console.error("Initial system state load error:", err);
      setIsBackendHealthy(false);
    }
  };

  useEffect(() => {
    loadSystemState();
    // Periodic poll every 15s for status updates
    const timer = setInterval(loadSystemState, 15000);
    return () => clearInterval(timer);
  }, []);

  const unacknowledgedCount = alerts.filter((a) => !a.acknowledged).length;

  const handleSimulationComplete = (run: SimulationRunResult, alert: SecurityAlert | null) => {
    setLatestRun(run);
    if (alert) {
      setAlerts((prev) => [alert, ...prev.filter((a) => a.alert_id !== alert.alert_id)]);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        unacknowledgedAlertCount={unacknowledgedCount}
        activeBaselineName={activeBaseline?.name}
        baselineVersion={activeBaseline?.version}
        isBackendHealthy={isBackendHealthy}
        onOpenCalibrationModal={() => setIsCalibrationOpen(true)}
      />

      {/* Main Content View */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === "overview" && (
          <OverviewPage
            latestRun={latestRun}
            recentAlerts={alerts}
            activeBaseline={activeBaseline}
            scenarios={scenarios}
            onSelectScenario={(s) => setSelectedScenario(s)}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onOpenCalibration={() => setIsCalibrationOpen(true)}
          />
        )}

        {activeTab === "simulation" && (
          <SimulationPage
            scenarios={scenarios}
            selectedScenario={selectedScenario}
            onSimulationComplete={handleSimulationComplete}
          />
        )}

        {activeTab === "channel" && (
          <ChannelAnalysisPage activeBaseline={activeBaseline} />
        )}

        {activeTab === "alerts" && (
          <AlertsPage
            alerts={alerts}
            onRefreshAlerts={() => fetchAlerts().then(setAlerts)}
            onViewRun={(runId) => {
              setActiveTab("history");
            }}
          />
        )}

        {activeTab === "evaluation" && <EvaluationPage />}

        {activeTab === "history" && <HistoryPage />}

        {activeTab === "audio" && <AudioAnomalyPage />}
      </main>

      {/* Calibration Modal */}
      <CalibrationModal
        isOpen={isCalibrationOpen}
        onClose={() => setIsCalibrationOpen(false)}
        onCalibrationSuccess={(b) => {
          setActiveBaseline(b);
          fetchAlerts().then(setAlerts);
        }}
      />

      {/* Bottom Footer */}
      <footer className="border-t border-slate-900 bg-[#070b12] py-6 px-6 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-300">QuantumGuard AI</span>
            <span>—</span>
            <span>AI-Powered Anomaly Detection for Quantum Communication Networks</span>
          </div>
          <div className="flex items-center space-x-4 text-[11px] font-mono">
            <span>BB84 QKD Simulation</span>
            <span>•</span>
            <span>Hypothesis Testing</span>
            <span>•</span>
            <span>Isolation Forest ML</span>
            <span>•</span>
            <span>Research Prototype</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
