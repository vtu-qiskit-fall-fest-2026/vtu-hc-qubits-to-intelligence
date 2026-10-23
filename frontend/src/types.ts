// QuantumGuard AI - Frontend TypeScript Type Definitions

export interface SimulationConfig {
  scenario_id: string;
  scenario_name: string;
  num_pulses: number;
  noise_prob: number;
  loss_prob: number;
  eve_prob: number;
  test_bit_fraction: number;
  random_seed?: number | null;
  notes?: string;
}

export interface PulseDetail {
  pulse_index: number;
  alice_bit: number;
  alice_basis: string;
  alice_state: string;
  photon_lost: boolean;
  eve_intercepted: boolean;
  eve_basis?: string | null;
  eve_measured_bit?: number | null;
  bob_basis?: string | null;
  bob_detection: boolean;
  bob_measured_bit?: number | null;
  bases_match: boolean;
  is_sifted: boolean;
  is_test_bit: boolean;
  is_error?: boolean | null;
}

export interface SimulationMetrics {
  transmitted_pulses: number;
  detected_pulses: number;
  detection_rate: number;
  photon_loss_rate: number;
  sifted_bits_count: number;
  sifted_ratio: number;
  test_bits_count: number;
  candidate_key_bits_count: number;
  error_count: number;
  qber: number | null;
  qber_confidence_lower?: number | null;
  qber_confidence_upper?: number | null;
  confidence_interval_width?: number | null;
  sample_size_sufficient: boolean;
  theoretical_expected_qber?: number | null;
  simulation_duration_ms: number;
}

export interface SimulationRunResult {
  run_id: string;
  timestamp: string;
  config: SimulationConfig;
  metrics: SimulationMetrics;
  sample_pulses: PulseDetail[];
  ground_truth_label: string;
  ground_truth_category: string;
  scientific_disclaimer: string;
}

export interface ObservableFeatures {
  qber: number | null;
  detection_rate: number;
  photon_loss_rate: number;
  sifted_ratio: number;
  test_bits_count: number;
  error_count: number;
  ci_width?: number | null;
  sample_size_sufficient: boolean;
  qber_delta: number;
  qber_zscore: number;
  detection_rate_delta: number;
  loss_rate_delta: number;
}

export interface DetectorVerdict {
  detector_name: string;
  detector_type: string;
  is_anomaly: boolean;
  status: string;
  confidence_score: number;
  summary_message: string;
  trigger_reasons: string[];
  metrics_snapshot: Record<string, any>;
  statistical_details?: Record<string, any>;
}

export interface HybridDetectionResult {
  overall_status: string;
  is_anomaly: boolean;
  consensus_score: number;
  primary_reason: string;
  all_reasons: string[];
  individual_verdicts: Record<string, DetectorVerdict>;
  agreement_level: string;
}

export interface SecurityAlert {
  alert_id: string;
  run_id: string;
  timestamp: string;
  severity: "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "NORMAL" | "ANOMALY SUSPECTED" | "INSUFFICIENT DATA" | "INVESTIGATION REQUIRED";
  detector_type: string;
  observed_metrics: {
    qber: number | null;
    qber_percent: number | null;
    detection_rate_percent: number;
    photon_loss_rate_percent: number;
    sifted_bits_count: number;
    test_bits_count: number;
    error_count: number;
  };
  baseline_reference?: {
    baseline_name: string;
    baseline_version: string;
    mean_qber_percent: number;
    qber_upper_threshold_percent: number;
    expected_detection_rate_percent: number;
    loss_upper_threshold_percent: number;
    sensitivity: string;
  } | null;
  sample_size: number;
  confidence_interval?: {
    ci_lower_percent: number;
    ci_upper_percent: number;
    ci_width_percent?: number | null;
  } | null;
  test_or_rule_used: string;
  explanation: string;
  alternative_causes: string[];
  recommended_next_step: string;
  scientific_disclaimer: string;
  acknowledged: boolean;
}

export interface BaselineCalibration {
  baseline_id: string;
  name: string;
  version: string;
  created_at: string;
  calibration_scenario: string;
  num_runs: number;
  total_transmitted_pulses: number;
  total_test_bits: number;
  mean_qber: number;
  std_qber: number;
  min_qber: number;
  max_qber: number;
  mean_detection_rate: number;
  std_detection_rate: number;
  mean_loss_rate: number;
  std_loss_rate: number;
  sensitivity: string;
  qber_upper_threshold: number;
  detection_rate_lower_threshold: number;
  loss_rate_upper_threshold: number;
  is_sufficient: boolean;
  is_stable: boolean;
  warning_messages: string[];
  is_active: boolean;
}

export interface ConfusionMatrix {
  true_positives: number;
  false_positives: number;
  true_negatives: number;
  false_negatives: number;
  total_samples: number;
}

export interface DetectorMetrics {
  detector_name: string;
  detector_type: string;
  precision: number | null;
  recall: number | null;
  f1_score: number | null;
  false_positive_rate: number | null;
  accuracy: number;
  confusion_matrix: ConfusionMatrix;
  avg_latency_ms: number;
}

export interface ScenarioEvaluationSummary {
  scenario_id: string;
  scenario_name: string;
  ground_truth: string;
  sample_count: number;
  rule_detected_count: number;
  stat_detected_count: number;
  ml_detected_count: number;
  hybrid_detected_count: number;
}

export interface BenchmarkEvaluationReport {
  eval_id: string;
  timestamp: string;
  num_samples_evaluated: number;
  num_calibration_samples: number;
  num_training_samples: number;
  detector_metrics: Record<string, DetectorMetrics>;
  scenario_breakdowns: ScenarioEvaluationSummary[];
  baseline_id_used: string;
  evaluation_notes: string;
}

export interface ScenarioPreset {
  id: string;
  name: string;
  description: string;
  config: SimulationConfig;
  ground_truth: string;
  is_reference: boolean;
}

export interface ChannelTrendPoint {
  run_id: string;
  timestamp: string;
  scenario_name: string;
  qber_percent: number | null;
  detection_rate_percent: number;
  photon_loss_rate_percent: number;
  sifted_bits_count: number;
  test_bits_count: number;
  ground_truth: string;
}

// ==========================================
// Audio Anomaly Detection Types
// ==========================================

export interface AudioFeatures {
  rms_energy: number;
  zero_crossing_rate: number;
  spectral_centroid: number;
  spectral_rolloff: number;
  spectral_bandwidth: number;
  mfccs: number[];
  waveform_preview: number[];
}

export interface AudioSampleMetadata {
  file_id: string;
  filename: string;
  filepath: string;
  file_size_bytes: number;
  duration_sec: number;
  sample_rate: number;
  channels: number;
  category: "normal" | "anomalous" | "unlabeled" | string;
  uploaded_at: string;
  features?: AudioFeatures | null;
}

export interface AudioAnomalyPrediction {
  file_id: string;
  filename: string;
  timestamp: string;
  is_anomaly: boolean;
  status: "NORMAL" | "ANOMALY DETECTED" | "INSUFFICIENT DATA" | string;
  anomaly_score: number;
  threshold_used: number;
  features: AudioFeatures;
  explanation: string;
  contributing_factors: string[];
  ground_truth?: string | null;
  scientific_disclaimer: string;
}

export interface AudioDatasetStats {
  total_files: number;
  normal_samples: number;
  anomalous_samples: number;
  unlabeled_samples: number;
  total_duration_sec: number;
  avg_sample_rate: number;
  is_model_trained: boolean;
  trained_sample_count: number;
  model_trained_at?: string | null;
}

export interface AudioEvaluationMetrics {
  accuracy: number;
  precision: number | null;
  recall: number | null;
  f1_score: number | null;
  false_positive_rate: number | null;
  confusion_matrix: {
    tp: number;
    fp: number;
    tn: number;
    fn: number;
  };
  evaluated_samples_count: number;
  notes: string;
}

export interface AudioAnalysisHistoryRecord {
  analysis_id: string;
  file_id: string;
  filename: string;
  timestamp: string;
  is_anomaly: boolean;
  status: string;
  anomaly_score: number;
  threshold_used: number;
  explanation: string;
  ground_truth: string | null;
  features: Record<string, any>;
}

