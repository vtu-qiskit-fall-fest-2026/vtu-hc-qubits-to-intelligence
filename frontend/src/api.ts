// QuantumGuard AI - Frontend API Client

import {
  ScenarioPreset,
  SimulationConfig,
  SimulationRunResult,
  ObservableFeatures,
  HybridDetectionResult,
  SecurityAlert,
  BaselineCalibration,
  BenchmarkEvaluationReport,
  ChannelTrendPoint,
} from "./types";

const API_BASE = "/api";

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errMsg = `API error (${res.status} ${res.statusText})`;
    try {
      const data = await res.json();
      if (data.detail) errMsg = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
    } catch {
      // ignore
    }
    throw new Error(errMsg);
  }
  return res.json();
}

export async function fetchHealth(): Promise<{
  status: string;
  service: string;
  version: string;
  database_connected: boolean;
  active_baseline: string | null;
  baseline_version: string | null;
  total_runs_recorded: number;
  ml_detector_trained: boolean;
}> {
  const res = await fetch(`${API_BASE}/health`);
  return handleResponse(res);
}

export async function fetchScenarios(): Promise<ScenarioPreset[]> {
  const res = await fetch(`${API_BASE}/simulator/scenarios`);
  return handleResponse(res);
}

export async function executeSimulation(config: Partial<SimulationConfig>): Promise<{
  run: SimulationRunResult;
  features: ObservableFeatures;
  detection: HybridDetectionResult;
  alert: SecurityAlert | null;
  active_baseline_id: string | null;
}> {
  const res = await fetch(`${API_BASE}/simulator/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  return handleResponse(res);
}

export async function fetchRunDetails(runId: string): Promise<SimulationRunResult> {
  const res = await fetch(`${API_BASE}/simulator/runs/${runId}`);
  return handleResponse(res);
}

export async function calibrateBaseline(params: {
  name: string;
  version: string;
  num_runs: number;
  num_pulses_per_run: number;
  noise_prob: number;
  loss_prob: number;
  sensitivity: string;
}): Promise<BaselineCalibration> {
  const res = await fetch(`${API_BASE}/baseline/calibrate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return handleResponse(res);
}

export async function fetchActiveBaseline(): Promise<{
  active: boolean;
  baseline?: BaselineCalibration;
  message?: string;
}> {
  const res = await fetch(`${API_BASE}/baseline/active`);
  return handleResponse(res);
}

export async function fetchBaselineHistory(): Promise<BaselineCalibration[]> {
  const res = await fetch(`${API_BASE}/baseline/history`);
  return handleResponse(res);
}

export async function fetchAlerts(statusFilter?: string): Promise<SecurityAlert[]> {
  const url = statusFilter ? `${API_BASE}/alerts?status=${encodeURIComponent(statusFilter)}` : `${API_BASE}/alerts`;
  const res = await fetch(url);
  return handleResponse(res);
}

export async function acknowledgeAlert(alertId: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/alerts/${alertId}/acknowledge`, {
    method: "POST",
  });
  return handleResponse(res);
}

export async function fetchHistoryRuns(limit: number = 50, scenarioId?: string): Promise<any[]> {
  const url = scenarioId
    ? `${API_BASE}/history/runs?limit=${limit}&scenario_id=${encodeURIComponent(scenarioId)}`
    : `${API_BASE}/history/runs?limit=${limit}`;
  const res = await fetch(url);
  return handleResponse(res);
}

export async function fetchChannelTrends(limit: number = 30): Promise<{ count: number; data: ChannelTrendPoint[] }> {
  const res = await fetch(`${API_BASE}/history/channel-trends?limit=${limit}`);
  return handleResponse(res);
}

export async function executeBenchmark(runsPerScenario: number = 5, baseSeed: number = 42): Promise<BenchmarkEvaluationReport> {
  const res = await fetch(`${API_BASE}/evaluation/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ runs_per_scenario: runsPerScenario, base_seed: baseSeed }),
  });
  return handleResponse(res);
}

export async function fetchLatestBenchmark(): Promise<{ exists: boolean; report?: BenchmarkEvaluationReport; message?: string }> {
  const res = await fetch(`${API_BASE}/evaluation/latest`);
  return handleResponse(res);
}

export async function reanalyzeRun(runId: string): Promise<{
  run_id: string;
  features: ObservableFeatures;
  detection: HybridDetectionResult;
  alert: SecurityAlert | null;
  baseline_used: string | null;
}> {
  const res = await fetch(`${API_BASE}/detection/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ run_id: runId }),
  });
  return handleResponse(res);
}

// ==========================================
// Audio Anomaly Detection API Endpoints
// ==========================================

import type {
  AudioFeatures,
  AudioSampleMetadata,
  AudioAnomalyPrediction,
  AudioDatasetStats,
  AudioEvaluationMetrics,
  AudioAnalysisHistoryRecord,
} from "./types";

export async function uploadAudioFile(
  file: File,
  category: string = "unlabeled",
  autoAnalyze: boolean = true,
  threshold: number = 0.50
): Promise<{ sample: AudioSampleMetadata; prediction: AudioAnomalyPrediction | null }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("category", category);
  formData.append("auto_analyze", String(autoAnalyze));
  formData.append("threshold", String(threshold));

  const res = await fetch(`${API_BASE}/audio/upload`, {
    method: "POST",
    body: formData,
  });
  return handleResponse(res);
}

export async function uploadZipDataset(file: File): Promise<{
  total_extracted: number;
  total_registered: number;
  message: string;
}> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/audio/dataset/upload-zip`, {
    method: "POST",
    body: formData,
  });
  return handleResponse(res);
}

export async function uploadMultipleAudioFiles(
  files: File[],
  category: string = "unlabeled"
): Promise<{ uploaded_count: number; message: string }> {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }
  formData.append("category", category);

  const res = await fetch(`${API_BASE}/audio/dataset/upload-files`, {
    method: "POST",
    body: formData,
  });
  return handleResponse(res);
}

export async function fetchAudioDatasetStats(): Promise<AudioDatasetStats> {
  const res = await fetch(`${API_BASE}/audio/dataset/stats`);
  return handleResponse(res);
}

export async function fetchAudioDatasetFiles(
  category?: string,
  limit: number = 100
): Promise<AudioSampleMetadata[]> {
  const query = new URLSearchParams();
  if (category && category !== "all") query.append("category", category);
  query.append("limit", String(limit));

  const res = await fetch(`${API_BASE}/audio/dataset/files?${query.toString()}`);
  return handleResponse(res);
}

export function getAudioStreamUrl(fileId: string): string {
  return `${API_BASE}/audio/files/${encodeURIComponent(fileId)}/stream`;
}

export async function trainAudioModel(contamination: number = 0.05): Promise<{
  success: boolean;
  message: string;
  trained_samples_count: number;
  trained_at: string;
}> {
  const formData = new FormData();
  formData.append("contamination", String(contamination));

  const res = await fetch(`${API_BASE}/audio/model/train`, {
    method: "POST",
    body: formData,
  });
  return handleResponse(res);
}

export async function evaluateAudioModel(threshold: number = 0.50): Promise<AudioEvaluationMetrics> {
  const formData = new FormData();
  formData.append("threshold", String(threshold));

  const res = await fetch(`${API_BASE}/audio/model/evaluate`, {
    method: "POST",
    body: formData,
  });
  return handleResponse(res);
}

export async function analyzeAudioFile(
  fileId: string,
  threshold: number = 0.50
): Promise<AudioAnomalyPrediction> {
  const res = await fetch(
    `${API_BASE}/audio/analyze/${encodeURIComponent(fileId)}?threshold=${encodeURIComponent(threshold)}`,
    {
      method: "POST",
    }
  );
  return handleResponse(res);
}

export async function fetchAudioHistory(limit: number = 50): Promise<AudioAnalysisHistoryRecord[]> {
  const res = await fetch(`${API_BASE}/audio/history?limit=${limit}`);
  return handleResponse(res);
}

export function getAudioExportCsvUrl(): string {
  return `${API_BASE}/audio/history/export-csv`;
}

export async function deleteAudioFile(fileId: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/audio/dataset/files/${encodeURIComponent(fileId)}`, {
    method: "DELETE",
  });
  return handleResponse(res);
}

export async function clearAudioDataset(): Promise<{ success: boolean; cleared_count: number; message: string }> {
  const res = await fetch(`${API_BASE}/audio/dataset/clear`, {
    method: "DELETE",
  });
  return handleResponse(res);
}

