// QuantumGuard AI - Top Navigation Bar

import React from "react";
import {
  ShieldAlert,
  Activity,
  Cpu,
  LineChart,
  History,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Sliders,
  Volume2,
} from "lucide-react";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  unacknowledgedAlertCount: number;
  activeBaselineName?: string;
  baselineVersion?: string;
  isBackendHealthy: boolean;
  onOpenCalibrationModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  unacknowledgedAlertCount,
  activeBaselineName,
  baselineVersion,
  isBackendHealthy,
  onOpenCalibrationModal,
}) => {
  const navItems = [
    { id: "overview", label: "Overview", icon: Activity },
    { id: "simulation", label: "Simulation Studio", icon: Cpu },
    { id: "channel", label: "Channel Analysis", icon: LineChart },
    {
      id: "alerts",
      label: "Security Alerts",
      icon: ShieldAlert,
      badge: unacknowledgedAlertCount > 0 ? unacknowledgedAlertCount : undefined,
    },
    { id: "evaluation", label: "Benchmark & Eval", icon: CheckCircle2 },
    { id: "history", label: "Run History", icon: History },
    { id: "audio", label: "Audio Detection", icon: Volume2 },
  ];


  return (
    <header className="sticky top-0 z-50 bg-[#0b1329]/90 backdrop-blur-md border-b border-cyan-900/30 px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand Logo & Name */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab("overview")}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-600 p-[1px] shadow-lg shadow-cyan-500/20">
            <div className="w-full h-full bg-[#090d16] rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
                QuantumGuard AI
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/40">
                QKD Monitor
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Anomaly Detection for Quantum Communication Networks
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden lg:flex items-center space-x-1 bg-[#131e36]/70 p-1 rounded-xl border border-slate-800">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-500/10"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-cyan-400" : "text-slate-400"}`} />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Header Right Status Badges & Quick Action */}
        <div className="flex items-center space-x-3">
          {/* Active Baseline Status */}
          <div
            onClick={onOpenCalibrationModal}
            className="cursor-pointer group flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-[#131e36] hover:bg-[#182747] border border-cyan-900/40 hover:border-cyan-500/40 transition-all text-xs"
            title="Click to calibrate or modify baseline"
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400 group-hover:rotate-45 transition-transform" />
            <div className="text-left hidden md:block">
              <span className="text-[10px] uppercase text-slate-400 block font-mono">Active Baseline</span>
              <span className="text-cyan-300 font-medium truncate max-w-[140px] block">
                {activeBaselineName || "Default Telecom"} {baselineVersion ? `(v${baselineVersion})` : ""}
              </span>
            </div>
          </div>

          {/* Backend Connection Status Indicator */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-[#131e36] border border-slate-800 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                isBackendHealthy ? "bg-emerald-400 animate-ping" : "bg-rose-400"
              }`}
            />
            <span
              className={`text-[11px] font-mono ${
                isBackendHealthy ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {isBackendHealthy ? "ONLINE" : "OFFLINE"}
            </span>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Dropdown/Scroller */}
      <div className="lg:hidden flex items-center space-x-1 mt-3 overflow-x-auto pb-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex-shrink-0 flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
                isActive
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                  : "text-slate-400 bg-slate-900/60"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
              {item.badge !== undefined && (
                <span className="ml-1 px-1 rounded-full text-[9px] bg-rose-500 text-white font-bold">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
};
