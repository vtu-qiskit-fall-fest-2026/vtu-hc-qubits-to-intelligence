// QuantumGuard AI - Audio Anomaly Detection Page
// Fully segregated audio acoustic anomaly detection, dataset management, and evaluation

import React, { useState, useEffect, useRef } from "react";
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  Upload,
  FileAudio,
  FolderArchive,
  Layers,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Download,
  RefreshCw,
  Sliders,
  Info,
  ExternalLink,
  Database,
  Sparkles,
  ShieldAlert,
  FileSpreadsheet,
  Cpu,
  BarChart3,
} from "lucide-react";
import {
  AudioSampleMetadata,
  AudioAnomalyPrediction,
  AudioDatasetStats,
  AudioEvaluationMetrics,
  AudioAnalysisHistoryRecord,
} from "../types";
import {
  uploadAudioFile,
  uploadZipDataset,
  uploadMultipleAudioFiles,
  fetchAudioDatasetStats,
  fetchAudioDatasetFiles,
  getAudioStreamUrl,
  trainAudioModel,
  evaluateAudioModel,
  analyzeAudioFile,
  fetchAudioHistory,
  getAudioExportCsvUrl,
  deleteAudioFile,
  clearAudioDataset,
} from "../api";

export const AudioAnomalyPage: React.FC = () => {
  // Navigation sub-tab within Audio module
  const [activeSubTab, setActiveSubTab] = useState<"inspect" | "dataset" | "model" | "history" | "resources">("inspect");

  // Dataset State
  const [datasetStats, setDatasetStats] = useState<AudioDatasetStats | null>(null);
  const [datasetFiles, setDatasetFiles] = useState<AudioSampleMetadata[]>([]);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
  const [isLoadingDataset, setIsLoadingDataset] = useState<boolean>(false);

  // Single File Inspection & Prediction State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [inspectionSample, setInspectionSample] = useState<AudioSampleMetadata | null>(null);
  const [inspectionPrediction, setInspectionPrediction] = useState<AudioAnomalyPrediction | null>(null);
  const [isUploadingSingle, setIsUploadingSingle] = useState<boolean>(false);
  const [uploadCategory, setUploadCategory] = useState<string>("unlabeled");
  const [detectionThreshold, setDetectionThreshold] = useState<number>(0.50);

  // Audio Playback
  const [playingFileId, setPlayingFileId] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Batch / ZIP Upload State
  const [isUploadingBatch, setIsUploadingBatch] = useState<boolean>(false);
  const [batchCategory, setBatchCategory] = useState<string>("normal");
  const [zipUploadMessage, setZipUploadMessage] = useState<string | null>(null);

  // Model Training & Evaluation State
  const [contamination, setContamination] = useState<number>(0.05);
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [trainMessage, setTrainMessage] = useState<string | null>(null);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [evalMetrics, setEvalMetrics] = useState<AudioEvaluationMetrics | null>(null);

  // History State
  const [historyList, setHistoryList] = useState<AudioAnalysisHistoryRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  // Status / Error alerts
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  // Load dataset stats & file inventory
  const refreshDataset = async () => {
    setIsLoadingDataset(true);
    try {
      const stats = await fetchAudioDatasetStats();
      setDatasetStats(stats);
      const files = await fetchAudioDatasetFiles(selectedCategoryFilter);
      setDatasetFiles(files);
    } catch (err: any) {
      console.error("Failed to load audio dataset:", err);
    } finally {
      setIsLoadingDataset(false);
    }
  };

  // Load analysis history
  const refreshHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const hist = await fetchAudioHistory(50);
      setHistoryList(hist);
    } catch (err: any) {
      console.error("Failed to load audio history:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    refreshDataset();
  }, [selectedCategoryFilter]);

  useEffect(() => {
    if (activeSubTab === "history") {
      refreshHistory();
    }
  }, [activeSubTab]);

  // Audio Playback helper
  const handleTogglePlay = (fileId: string) => {
    if (!audioPlayerRef.current) return;

    if (playingFileId === fileId) {
      audioPlayerRef.current.pause();
      setPlayingFileId(null);
    } else {
      audioPlayerRef.current.src = getAudioStreamUrl(fileId);
      audioPlayerRef.current
        .play()
        .then(() => setPlayingFileId(fileId))
        .catch((e) => {
          console.error("Playback error:", e);
          setPlayingFileId(null);
        });
    }
  };

  // Handle single file upload & analyze
  const handleSingleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".wav")) {
      setFeedback({ type: "error", message: "Only uncompressed WAV audio files (.wav) are currently supported." });
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setFeedback({ type: "error", message: "Audio file exceeds maximum allowed size of 50 MB." });
      return;
    }

    setSelectedFile(file);
    setIsUploadingSingle(true);
    setFeedback({ type: "info", message: `Processing and extracting features from ${file.name}...` });

    try {
      const res = await uploadAudioFile(file, uploadCategory, true, detectionThreshold);
      setInspectionSample(res.sample);
      setInspectionPrediction(res.prediction);
      setFeedback({ type: "success", message: `Successfully analyzed ${file.name}!` });
      refreshDataset();
    } catch (err: any) {
      setFeedback({ type: "error", message: `Upload failed: ${err.message}` });
    } finally {
      setIsUploadingSingle(false);
    }
  };

  // Analyze an existing file from the catalog
  const handleAnalyzeCatalogFile = async (fileId: string) => {
    try {
      setFeedback({ type: "info", message: "Running acoustic anomaly detector..." });
      const pred = await analyzeAudioFile(fileId, detectionThreshold);
      setInspectionPrediction(pred);
      const foundSample = datasetFiles.find((f) => f.file_id === fileId);
      if (foundSample) {
        setInspectionSample(foundSample);
      }
      setActiveSubTab("inspect");
      setFeedback({ type: "success", message: `Analysis complete for ${pred.filename}` });
    } catch (err: any) {
      setFeedback({ type: "error", message: `Analysis failed: ${err.message}` });
    }
  };

  // Handle ZIP dataset upload
  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".zip")) {
      setFeedback({ type: "error", message: "Please upload a valid .zip archive." });
      return;
    }

    setIsUploadingBatch(true);
    setZipUploadMessage("Extracting archive and computing acoustic features for each sample...");

    try {
      const res = await uploadZipDataset(file);
      setFeedback({
        type: "success",
        message: `Imported ${res.total_registered} audio recordings from ${file.name}!`,
      });
      setZipUploadMessage(null);
      refreshDataset();
    } catch (err: any) {
      setFeedback({ type: "error", message: `ZIP upload failed: ${err.message}` });
      setZipUploadMessage(null);
    } finally {
      setIsUploadingBatch(false);
      e.target.value = "";
    }
  };

  // Handle batch file upload
  const handleBatchFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList: File[] = [];
    for (let i = 0; i < files.length; i++) {
      if (files[i].name.toLowerCase().endsWith(".wav")) {
        fileList.push(files[i]);
      }
    }

    if (fileList.length === 0) {
      setFeedback({ type: "error", message: "No valid .wav files selected." });
      return;
    }

    setIsUploadingBatch(true);
    try {
      const res = await uploadMultipleAudioFiles(fileList, batchCategory);
      setFeedback({ type: "success", message: res.message });
      refreshDataset();
    } catch (err: any) {
      setFeedback({ type: "error", message: `Batch upload failed: ${err.message}` });
    } finally {
      setIsUploadingBatch(false);
      e.target.value = "";
    }
  };

  // Handle Model Training
  const handleTrainModel = async () => {
    setIsTraining(true);
    setTrainMessage("Fitting Isolation Forest on normal acoustic feature space...");
    try {
      const res = await trainAudioModel(contamination);
      setFeedback({ type: "success", message: res.message });
      setTrainMessage(null);
      refreshDataset();
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message });
      setTrainMessage(null);
    } finally {
      setIsTraining(false);
    }
  };

  // Handle Model Evaluation
  const handleEvaluateModel = async () => {
    setIsEvaluating(true);
    try {
      const metrics = await evaluateAudioModel(detectionThreshold);
      setEvalMetrics(metrics);
      setFeedback({ type: "success", message: "Dataset evaluation metrics updated." });
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message });
    } finally {
      setIsEvaluating(false);
    }
  };

  // Delete individual file
  const handleDeleteFile = async (fileId: string) => {
    try {
      await deleteAudioFile(fileId);
      setFeedback({ type: "info", message: "Audio sample removed from dataset." });
      if (inspectionSample?.file_id === fileId) {
        setInspectionSample(null);
        setInspectionPrediction(null);
      }
      refreshDataset();
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message });
    }
  };

  // Clear entire dataset
  const handleClearDataset = async () => {
    if (!window.confirm("Are you sure you want to remove ALL audio samples from the dataset? This cannot be undone.")) {
      return;
    }
    try {
      const res = await clearAudioDataset();
      setFeedback({ type: "info", message: res.message });
      setInspectionSample(null);
      setInspectionPrediction(null);
      refreshDataset();
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message });
    }
  };

  return (
    <div className="space-y-8">
      {/* Hidden HTML5 Audio Element for Playback */}
      <audio
        ref={audioPlayerRef}
        onEnded={() => setPlayingFileId(null)}
        onError={() => setPlayingFileId(null)}
        className="hidden"
      />

      {/* Top Hero Banner & Scientific Boundary Notice */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0b1329] via-[#101b38] to-[#12192e] border border-cyan-800/40 p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 -mb-20 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-950/90 border border-cyan-700/50 text-cyan-300 text-xs font-mono">
            <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>AUDIO ANOMALY DETECTION ENGINE</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Acoustic Signal Processing &{" "}
            <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
              Unsupervised Anomaly Detection
            </span>
          </h1>

          <p className="text-sm text-slate-300 leading-relaxed">
            Upload single or batched industrial and acoustic recordings in WAV format. Extract physical sound features—including
            RMS energy, zero-crossing rate, spectral centroid, rolloff, bandwidth, and 13 Mel-Frequency Cepstral Coefficients (MFCCs)—and
            score anomalous acoustic deviations using an Isolation Forest statistical boundary.
          </p>

          {/* Architectural Separation Notice */}
          <div className="flex items-start space-x-3 p-3.5 rounded-xl bg-slate-900/80 border border-amber-500/30 text-xs text-amber-200/90">
            <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-amber-300 font-mono uppercase mr-1">
                Architectural Segregation Notice:
              </span>
              This module operates exclusively on audio/acoustic waveforms and machine vibration datasets (e.g., MIMII, ToyADMOS).
              Acoustic features are strictly isolated from the BB84 quantum channel simulator and optical QBER calculations.
            </div>
          </div>
        </div>
      </div>

      {/* Global Alert Notification Feedback */}
      {feedback && (
        <div
          className={`flex items-center justify-between px-4 py-3 rounded-xl border text-xs font-medium transition-all ${
            feedback.type === "success"
              ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
              : feedback.type === "error"
              ? "bg-rose-950/60 border-rose-500/40 text-rose-300"
              : "bg-cyan-950/60 border-cyan-500/40 text-cyan-300"
          }`}
        >
          <div className="flex items-center space-x-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : feedback.type === "error" ? (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            ) : (
              <Info className="w-4 h-4 text-cyan-400" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-200 text-xs px-2 py-0.5 rounded"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Primary KPI Status Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-[#131e36]/80 p-4 rounded-xl border border-cyan-900/30 shadow space-y-1">
          <span className="text-[10px] uppercase font-mono text-slate-400">Total Samples</span>
          <div className="text-xl font-bold text-white">{datasetStats?.total_files ?? 0}</div>
        </div>
        <div className="bg-[#131e36]/80 p-4 rounded-xl border border-emerald-900/30 shadow space-y-1">
          <span className="text-[10px] uppercase font-mono text-emerald-400">Normal Files</span>
          <div className="text-xl font-bold text-emerald-400">{datasetStats?.normal_samples ?? 0}</div>
        </div>
        <div className="bg-[#131e36]/80 p-4 rounded-xl border border-rose-900/30 shadow space-y-1">
          <span className="text-[10px] uppercase font-mono text-rose-400">Anomalous Files</span>
          <div className="text-xl font-bold text-rose-400">{datasetStats?.anomalous_samples ?? 0}</div>
        </div>
        <div className="bg-[#131e36]/80 p-4 rounded-xl border border-slate-800 shadow space-y-1">
          <span className="text-[10px] uppercase font-mono text-slate-400">Unlabeled</span>
          <div className="text-xl font-bold text-slate-300">{datasetStats?.unlabeled_samples ?? 0}</div>
        </div>
        <div className="bg-[#131e36]/80 p-4 rounded-xl border border-cyan-900/30 shadow space-y-1">
          <span className="text-[10px] uppercase font-mono text-slate-400">Total Duration</span>
          <div className="text-xl font-bold text-cyan-300">
            {datasetStats?.total_duration_sec ? `${datasetStats.total_duration_sec.toFixed(1)}s` : "0.0s"}
          </div>
        </div>
        <div className="bg-[#131e36]/80 p-4 rounded-xl border border-indigo-900/30 shadow space-y-1">
          <span className="text-[10px] uppercase font-mono text-indigo-300">ML Model Status</span>
          <div className="text-xs font-semibold">
            {datasetStats?.is_model_trained ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Trained ({datasetStats.trained_sample_count})
              </span>
            ) : (
              <span className="text-amber-400 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Untrained
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        {[
          { id: "inspect", label: "Inspect & Predict", icon: Sparkles },
          { id: "dataset", label: "Dataset Management", icon: Database },
          { id: "model", label: "Model & Evaluation", icon: Cpu },
          { id: "history", label: "Analysis History", icon: FileSpreadsheet },
          { id: "resources", label: "Benchmark Datasets", icon: ExternalLink },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-cyan-400" : "text-slate-400"}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* SUB-TAB 1: SINGLE AUDIO INSPECTION & PREDICTION */}
      {/* ======================================================== */}
      {activeSubTab === "inspect" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Upload & Controls Column */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-[#131e36]/90 border border-cyan-900/40 rounded-2xl p-6 shadow-xl space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Upload className="w-4 h-4 text-cyan-400" />
                    Upload Audio Sample
                  </h2>
                  <span className="text-[10px] font-mono uppercase text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                    WAV Format
                  </span>
                </div>

                <p className="text-xs text-slate-300">
                  Select a single uncompressed WAV file (up to 50 MB) to inspect its acoustic properties and score anomaly likelihood.
                </p>

                {/* Upload Zone */}
                <div className="border-2 border-dashed border-cyan-900/60 hover:border-cyan-500/60 rounded-xl p-6 text-center bg-[#090d16]/60 transition-colors">
                  <input
                    type="file"
                    id="audio-single-upload"
                    accept=".wav"
                    onChange={handleSingleFileUpload}
                    disabled={isUploadingSingle}
                    className="hidden"
                  />
                  <label
                    htmlFor="audio-single-upload"
                    className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                  >
                    <div className="w-12 h-12 rounded-full bg-cyan-950/80 border border-cyan-700/50 flex items-center justify-center text-cyan-400">
                      <FileAudio className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-semibold text-cyan-300">
                      {isUploadingSingle ? "Processing Audio Signal..." : "Click to browse WAV file"}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Mono / Stereo, up to 192 kHz sample rate
                    </span>
                  </label>
                </div>

                {/* File Classification & Threshold Config */}
                <div className="space-y-4 pt-2 border-t border-slate-800 text-xs">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Known Category (Ground Truth):</label>
                    <select
                      value={uploadCategory}
                      onChange={(e) => setUploadCategory(e.target.value)}
                      className="w-full bg-[#090d16] border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="unlabeled">Unlabeled (Testing / Field Sample)</option>
                      <option value="normal">Normal (Baseline acoustic reference)</option>
                      <option value="anomalous">Anomalous (Known acoustic defect / fault)</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-slate-300 font-medium">Anomaly Decision Threshold:</label>
                      <span className="font-mono text-cyan-400 font-bold">{detectionThreshold.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min={0.10}
                      max={0.90}
                      step={0.05}
                      value={detectionThreshold}
                      onChange={(e) => setDetectionThreshold(parseFloat(e.target.value))}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-0.5">
                      <span>0.10 (High Sensitivity)</span>
                      <span>0.50 (Balanced)</span>
                      <span>0.90 (Conservative)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Analysis & Waveform Output Column */}
            <div className="lg:col-span-7 space-y-6">
              {inspectionSample ? (
                <div className="bg-[#131e36]/90 border border-cyan-900/40 rounded-2xl p-6 shadow-xl space-y-6">
                  {/* Header & Playback */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <FileAudio className="w-5 h-5 text-cyan-400" />
                        <h3 className="text-base font-bold text-white truncate max-w-sm">
                          {inspectionSample.filename}
                        </h3>
                      </div>
                      <div className="flex items-center space-x-3 text-xs text-slate-400 font-mono">
                        <span>{inspectionSample.duration_sec}s</span>
                        <span>•</span>
                        <span>{inspectionSample.sample_rate} Hz</span>
                        <span>•</span>
                        <span>{(inspectionSample.file_size_bytes / 1024).toFixed(1)} KB</span>
                        <span>•</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                            inspectionSample.category === "normal"
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                              : inspectionSample.category === "anomalous"
                              ? "bg-rose-950 text-rose-400 border border-rose-800"
                              : "bg-slate-800 text-slate-300"
                          }`}
                        >
                          {inspectionSample.category}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleTogglePlay(inspectionSample.file_id)}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-bold text-xs shadow-lg transition-all ${
                        playingFileId === inspectionSample.file_id
                          ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30"
                          : "bg-cyan-500 hover:bg-cyan-400 text-black shadow-cyan-500/20"
                      }`}
                    >
                      {playingFileId === inspectionSample.file_id ? (
                        <>
                          <Pause className="w-4 h-4" />
                          <span>Pause Audio</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-current" />
                          <span>Listen to Audio</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Waveform Visualization */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span className="font-semibold flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-cyan-400" />
                        Audio Waveform Envelope (Downsampled 120 bins)
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        Normalized Amplitude [-1.0, 1.0]
                      </span>
                    </div>
                    <div className="h-28 bg-[#090d16] rounded-xl border border-slate-800 p-2 flex items-center gap-[2px] overflow-hidden">
                      {inspectionSample.features?.waveform_preview &&
                      inspectionSample.features.waveform_preview.length > 0 ? (
                        inspectionSample.features.waveform_preview.map((val, idx) => {
                          const heightPct = Math.max(4, Math.min(100, Math.abs(val) * 100));
                          const isHighEnergy = Math.abs(val) > 0.6;
                          return (
                            <div
                              key={idx}
                              className="flex-1 rounded-sm transition-all"
                              style={{
                                height: `${heightPct}%`,
                                backgroundColor: isHighEnergy ? "#f43f5e" : "#06b6d4",
                                opacity: 0.85,
                              }}
                              title={`Bin ${idx + 1}: ${val.toFixed(3)}`}
                            />
                          );
                        })
                      ) : (
                        <div className="w-full text-center text-xs text-slate-500 font-mono">
                          Waveform preview unavailable
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Anomaly Prediction Result Box */}
                  {inspectionPrediction && (
                    <div
                      className={`p-5 rounded-2xl border ${
                        inspectionPrediction.is_anomaly
                          ? "bg-rose-950/30 border-rose-600/50 text-rose-100"
                          : inspectionPrediction.status === "INSUFFICIENT DATA"
                          ? "bg-amber-950/30 border-amber-600/50 text-amber-100"
                          : "bg-emerald-950/30 border-emerald-600/50 text-emerald-100"
                      } space-y-4`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {inspectionPrediction.is_anomaly ? (
                            <ShieldAlert className="w-5 h-5 text-rose-400" />
                          ) : (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          )}
                          <span className="text-sm font-bold uppercase tracking-wider">
                            Verdict: {inspectionPrediction.status}
                          </span>
                        </div>
                        <div className="text-xs font-mono">
                          Threshold: <span className="text-white">{inspectionPrediction.threshold_used.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Anomaly Score Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-mono">
                          <span>Anomaly Score (Normalized Outlier Index):</span>
                          <span className="font-bold text-white text-sm">
                            {(inspectionPrediction.anomaly_score * 100).toFixed(1)}% ({inspectionPrediction.anomaly_score.toFixed(3)})
                          </span>
                        </div>
                        <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden border border-slate-700">
                          <div
                            className={`h-full transition-all duration-500 rounded-full ${
                              inspectionPrediction.is_anomaly
                                ? "bg-gradient-to-r from-amber-500 to-rose-600"
                                : "bg-gradient-to-r from-emerald-500 to-cyan-500"
                            }`}
                            style={{ width: `${Math.min(100, Math.max(5, inspectionPrediction.anomaly_score * 100))}%` }}
                          />
                        </div>
                      </div>

                      {/* Explanation Text */}
                      <p className="text-xs leading-relaxed text-slate-200">
                        {inspectionPrediction.explanation}
                      </p>

                      {/* Contributing Factors */}
                      {inspectionPrediction.contributing_factors.length > 0 && (
                        <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                          <span className="text-[11px] font-mono uppercase text-slate-300 font-bold block">
                            Key Influencing Acoustic Factors:
                          </span>
                          <ul className="space-y-1 text-xs">
                            {inspectionPrediction.contributing_factors.map((f, i) => (
                              <li key={i} className="flex items-start gap-1.5 text-slate-300">
                                <span className="text-cyan-400 font-bold">•</span>
                                <span>{f}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Scientific Disclaimer */}
                      <div className="p-3 bg-slate-900/70 rounded-xl text-[11px] text-slate-400 font-mono border border-slate-800 leading-normal">
                        <span className="text-amber-400 font-semibold block mb-0.5">Scientific Disclaimer:</span>
                        {inspectionPrediction.scientific_disclaimer}
                      </div>
                    </div>
                  )}

                  {/* Extracted Acoustic Feature Matrix */}
                  {inspectionSample.features && (
                    <div className="space-y-3 pt-2">
                      <h4 className="text-xs font-bold uppercase font-mono text-cyan-300 flex items-center gap-1.5">
                        <BarChart3 className="w-4 h-4" />
                        Extracted Acoustic Feature Vector (18 Dimensions)
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                        <div className="bg-[#090d16] p-3 rounded-xl border border-slate-800">
                          <span className="text-slate-400 block text-[10px] uppercase font-mono">RMS Energy</span>
                          <span className="text-white font-mono font-bold text-sm">
                            {inspectionSample.features.rms_energy.toFixed(5)}
                          </span>
                        </div>
                        <div className="bg-[#090d16] p-3 rounded-xl border border-slate-800">
                          <span className="text-slate-400 block text-[10px] uppercase font-mono">Zero Crossing Rate</span>
                          <span className="text-white font-mono font-bold text-sm">
                            {inspectionSample.features.zero_crossing_rate.toFixed(5)}
                          </span>
                        </div>
                        <div className="bg-[#090d16] p-3 rounded-xl border border-slate-800">
                          <span className="text-slate-400 block text-[10px] uppercase font-mono">Spectral Centroid</span>
                          <span className="text-white font-mono font-bold text-sm">
                            {inspectionSample.features.spectral_centroid.toFixed(1)} Hz
                          </span>
                        </div>
                        <div className="bg-[#090d16] p-3 rounded-xl border border-slate-800">
                          <span className="text-slate-400 block text-[10px] uppercase font-mono">Spectral Rolloff</span>
                          <span className="text-white font-mono font-bold text-sm">
                            {inspectionSample.features.spectral_rolloff.toFixed(1)} Hz
                          </span>
                        </div>
                        <div className="bg-[#090d16] p-3 rounded-xl border border-slate-800">
                          <span className="text-slate-400 block text-[10px] uppercase font-mono">Spectral Bandwidth</span>
                          <span className="text-white font-mono font-bold text-sm">
                            {inspectionSample.features.spectral_bandwidth.toFixed(1)} Hz
                          </span>
                        </div>
                        <div className="bg-[#090d16] p-3 rounded-xl border border-slate-800">
                          <span className="text-slate-400 block text-[10px] uppercase font-mono">MFCC Timbre Coeffs</span>
                          <span className="text-cyan-400 font-mono font-bold text-sm">
                            {inspectionSample.features.mfccs.length} bands
                          </span>
                        </div>
                      </div>

                      {/* MFCC Coefficient Pill Visualizer */}
                      <div className="bg-[#090d16] p-3 rounded-xl border border-slate-800 space-y-1.5">
                        <span className="text-[10px] font-mono uppercase text-slate-400 block">
                          Mel-Frequency Cepstral Coefficients (MFCC 1–13):
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {inspectionSample.features.mfccs.map((val, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700 text-[10px] font-mono text-slate-300"
                            >
                              c{idx + 1}: <strong className="text-cyan-300">{val.toFixed(2)}</strong>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-[#131e36]/40 border border-slate-800/60 rounded-2xl p-12 text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-slate-800/60 flex items-center justify-center mx-auto text-slate-500">
                    <FileAudio className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-bold text-slate-300">No Audio Sample Selected</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Upload a WAV recording using the upload panel on the left, or pick any existing sample from the
                    <strong> Dataset Management</strong> tab to visualize its acoustic features.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 2: DATASET MANAGEMENT */}
      {/* ======================================================== */}
      {activeSubTab === "dataset" && (
        <div className="space-y-6">
          {/* Dataset Upload Action Bar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Batch Files Upload */}
            <div className="bg-[#131e36]/90 border border-cyan-900/40 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center space-x-2">
                <FileAudio className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Batch Upload WAV Files</h3>
              </div>
              <p className="text-xs text-slate-300">
                Select multiple WAV audio files to catalog them into the training or validation collection.
              </p>
              <div className="flex items-center space-x-3">
                <select
                  value={batchCategory}
                  onChange={(e) => setBatchCategory(e.target.value)}
                  className="bg-[#090d16] border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"
                >
                  <option value="normal">Category: Normal</option>
                  <option value="anomalous">Category: Anomalous</option>
                  <option value="unlabeled">Category: Unlabeled</option>
                </select>
                <input
                  type="file"
                  id="batch-wav-upload"
                  accept=".wav"
                  multiple
                  onChange={handleBatchFilesUpload}
                  disabled={isUploadingBatch}
                  className="hidden"
                />
                <label
                  htmlFor="batch-wav-upload"
                  className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                    isUploadingBatch
                      ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                      : "bg-cyan-600 hover:bg-cyan-500 text-white"
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  <span>{isUploadingBatch ? "Uploading..." : "Select Multiple WAVs"}</span>
                </label>
              </div>
            </div>

            {/* ZIP Archive Upload */}
            <div className="bg-[#131e36]/90 border border-cyan-900/40 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center space-x-2">
                <FolderArchive className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Import Dataset from ZIP Archive</h3>
              </div>
              <p className="text-xs text-slate-300">
                Safely unpack a ZIP containing structured folders (e.g. <code>normal/*.wav</code>, <code>anomaly/*.wav</code>).
              </p>
              <div className="flex items-center space-x-3">
                <input
                  type="file"
                  id="zip-upload"
                  accept=".zip"
                  onChange={handleZipUpload}
                  disabled={isUploadingBatch}
                  className="hidden"
                />
                <label
                  htmlFor="zip-upload"
                  className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                    isUploadingBatch
                      ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-500 text-white"
                  }`}
                >
                  <FolderArchive className="w-4 h-4" />
                  <span>{isUploadingBatch ? "Unpacking Archive..." : "Select .ZIP Dataset File"}</span>
                </label>
              </div>
              {zipUploadMessage && (
                <div className="text-[11px] font-mono text-cyan-300 animate-pulse">{zipUploadMessage}</div>
              )}
            </div>
          </div>

          {/* Dataset Inventory Table */}
          <div className="bg-[#131e36]/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <h3 className="text-base font-bold text-white">Audio Catalog Inventory</h3>
                <span className="px-2 py-0.5 rounded text-xs font-mono bg-cyan-950 text-cyan-400 border border-cyan-800">
                  {datasetFiles.length} Samples
                </span>
              </div>

              {/* Filtering & Clear Actions */}
              <div className="flex items-center space-x-2">
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="bg-[#090d16] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                >
                  <option value="all">Filter: All Categories</option>
                  <option value="normal">Normal Only</option>
                  <option value="anomalous">Anomalous Only</option>
                  <option value="unlabeled">Unlabeled Only</option>
                </select>

                <button
                  onClick={refreshDataset}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  title="Refresh catalog"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>

                {datasetFiles.length > 0 && (
                  <button
                    onClick={handleClearDataset}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-800/60 text-rose-300 text-xs font-semibold transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear All</span>
                  </button>
                )}
              </div>
            </div>

            {/* Table */}
            {isLoadingDataset ? (
              <div className="text-center py-8 text-xs text-slate-400 font-mono">Loading audio catalog...</div>
            ) : datasetFiles.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs space-y-2">
                <p>No audio files found matching filter.</p>
                <p className="text-slate-500">
                  Upload individual recordings or a ZIP archive to populate the dataset.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#090d16] text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Filename</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Duration</th>
                      <th className="py-2.5 px-3">Sample Rate</th>
                      <th className="py-2.5 px-3">Size</th>
                      <th className="py-2.5 px-3">Preview</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {datasetFiles.map((f) => (
                      <tr key={f.file_id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-3 font-medium text-slate-200 flex items-center gap-2">
                          <FileAudio className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                          <span className="truncate max-w-[200px]" title={f.filename}>
                            {f.filename}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                              f.category === "normal"
                                ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                                : f.category === "anomalous"
                                ? "bg-rose-950 text-rose-400 border border-rose-800"
                                : "bg-slate-800 text-slate-300"
                            }`}
                          >
                            {f.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-300">{f.duration_sec}s</td>
                        <td className="py-2.5 px-3 font-mono text-slate-400">{f.sample_rate} Hz</td>
                        <td className="py-2.5 px-3 font-mono text-slate-400">
                          {(f.file_size_bytes / 1024).toFixed(1)} KB
                        </td>
                        <td className="py-2.5 px-3">
                          <button
                            onClick={() => handleTogglePlay(f.file_id)}
                            className={`p-1.5 rounded-lg border transition-all ${
                              playingFileId === f.file_id
                                ? "bg-rose-500/20 text-rose-400 border-rose-500/50"
                                : "bg-slate-800 text-slate-300 border-slate-700 hover:text-cyan-400"
                            }`}
                            title={playingFileId === f.file_id ? "Pause" : "Play"}
                          >
                            {playingFileId === f.file_id ? (
                              <Pause className="w-3.5 h-3.5" />
                            ) : (
                              <Play className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 text-right space-x-2">
                          <button
                            onClick={() => handleAnalyzeCatalogFile(f.file_id)}
                            className="px-2.5 py-1 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60 hover:bg-cyan-900 transition-colors text-[11px] font-semibold"
                          >
                            Analyze
                          </button>
                          <button
                            onClick={() => handleDeleteFile(f.file_id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-400 transition-colors"
                            title="Delete file"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 3: MODEL TRAINING & EVALUATION */}
      {/* ======================================================== */}
      {activeSubTab === "model" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Model Training Box */}
            <div className="bg-[#131e36]/90 border border-cyan-900/40 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="flex items-center space-x-2">
                <Cpu className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Unsupervised Isolation Forest Trainer</h3>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Fit an Isolation Forest on the 18-dimensional acoustic feature space of all <strong>Normal</strong> recordings.
                The model learns the empirical baseline distribution and measures the average path length required to isolate
                unseen samples.
              </p>

              <div className="space-y-3 p-4 bg-[#090d16] rounded-xl border border-slate-800 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Available Normal Samples:</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    {datasetStats?.normal_samples ?? 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Minimum Required:</span>
                  <span className="font-mono text-slate-400">3 samples</span>
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-slate-300">Expected Contamination Rate:</span>
                    <span className="font-mono text-cyan-400 font-bold">{contamination.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0.01}
                    max={0.20}
                    step={0.01}
                    value={contamination}
                    onChange={(e) => setContamination(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-500 font-mono">
                    Proportion of outliers anticipated in reference data (default: 0.05)
                  </span>
                </div>
              </div>

              <button
                onClick={handleTrainModel}
                disabled={isTraining || (datasetStats?.normal_samples ?? 0) < 3}
                className={`w-full flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg ${
                  isTraining || (datasetStats?.normal_samples ?? 0) < 3
                    ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
                    : "bg-cyan-500 hover:bg-cyan-400 text-black shadow-cyan-500/20"
                }`}
              >
                <Cpu className="w-4 h-4" />
                <span>
                  {isTraining
                    ? "Fitting Acoustic Model..."
                    : `Train Model on ${datasetStats?.normal_samples ?? 0} Normal Recordings`}
                </span>
              </button>

              {trainMessage && (
                <div className="text-[11px] font-mono text-cyan-300 animate-pulse text-center">
                  {trainMessage}
                </div>
              )}
            </div>

            {/* Model Evaluation Box */}
            <div className="bg-[#131e36]/90 border border-cyan-900/40 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Dataset Benchmark Evaluation</h3>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Test the active Isolation Forest model against all labeled samples in the dataset (Normal vs Anomalous)
                to assess classification accuracy, precision, recall, and false positive rates.
              </p>

              <div className="space-y-3 p-4 bg-[#090d16] rounded-xl border border-slate-800 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Labeled Test Pool:</span>
                  <span className="font-mono font-bold text-cyan-400 text-sm">
                    {(datasetStats?.normal_samples ?? 0) + (datasetStats?.anomalous_samples ?? 0)} samples
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Decision Threshold:</span>
                  <span className="font-mono text-white">{detectionThreshold.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={handleEvaluateModel}
                disabled={isEvaluating || !datasetStats?.is_model_trained}
                className={`w-full flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg ${
                  isEvaluating || !datasetStats?.is_model_trained
                    ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20"
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {isEvaluating
                    ? "Evaluating Predictions..."
                    : !datasetStats?.is_model_trained
                    ? "Model Not Trained Yet"
                    : "Run Evaluation on Labeled Samples"}
                </span>
              </button>
            </div>
          </div>

          {/* Evaluation Metrics Display */}
          {evalMetrics && (
            <div className="bg-[#131e36]/90 border border-emerald-900/40 rounded-2xl p-6 shadow-xl space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  Evaluation Scorecard ({evalMetrics.evaluated_samples_count} Samples)
                </h3>
                <span className="text-xs font-mono text-slate-400">{evalMetrics.notes}</span>
              </div>

              {/* Metrics Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-[#090d16] p-4 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-slate-400">Accuracy</span>
                  <div className="text-2xl font-bold text-cyan-400">
                    {(evalMetrics.accuracy * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="bg-[#090d16] p-4 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-slate-400">Precision</span>
                  <div className="text-2xl font-bold text-emerald-400">
                    {evalMetrics.precision !== null ? `${(evalMetrics.precision * 100).toFixed(1)}%` : "N/A"}
                  </div>
                </div>
                <div className="bg-[#090d16] p-4 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-slate-400">Recall</span>
                  <div className="text-2xl font-bold text-indigo-400">
                    {evalMetrics.recall !== null ? `${(evalMetrics.recall * 100).toFixed(1)}%` : "N/A"}
                  </div>
                </div>
                <div className="bg-[#090d16] p-4 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-slate-400">F1 Score</span>
                  <div className="text-2xl font-bold text-purple-400">
                    {evalMetrics.f1_score !== null ? `${(evalMetrics.f1_score * 100).toFixed(1)}%` : "N/A"}
                  </div>
                </div>
                <div className="bg-[#090d16] p-4 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-slate-400">False Positive Rate</span>
                  <div className="text-2xl font-bold text-amber-400">
                    {evalMetrics.false_positive_rate !== null
                      ? `${(evalMetrics.false_positive_rate * 100).toFixed(1)}%`
                      : "N/A"}
                  </div>
                </div>
              </div>

              {/* Confusion Matrix */}
              <div className="space-y-3">
                <span className="text-xs font-mono uppercase font-bold text-slate-300">
                  Confusion Matrix Breakdown:
                </span>
                <div className="grid grid-cols-2 gap-3 max-w-md text-xs font-mono">
                  <div className="bg-[#090d16] p-4 rounded-xl border border-emerald-900/40 text-center space-y-1">
                    <span className="text-slate-400 text-[10px]">True Positives (TP)</span>
                    <div className="text-xl font-bold text-emerald-400">
                      {evalMetrics.confusion_matrix.tp}
                    </div>
                    <span className="text-[10px] text-slate-500">Correctly Flagged Anomaly</span>
                  </div>
                  <div className="bg-[#090d16] p-4 rounded-xl border border-rose-900/40 text-center space-y-1">
                    <span className="text-slate-400 text-[10px]">False Positives (FP)</span>
                    <div className="text-xl font-bold text-rose-400">
                      {evalMetrics.confusion_matrix.fp}
                    </div>
                    <span className="text-[10px] text-slate-500">Normal Flagged as Anomaly</span>
                  </div>
                  <div className="bg-[#090d16] p-4 rounded-xl border border-rose-900/40 text-center space-y-1">
                    <span className="text-slate-400 text-[10px]">False Negatives (FN)</span>
                    <div className="text-xl font-bold text-rose-400">
                      {evalMetrics.confusion_matrix.fn}
                    </div>
                    <span className="text-[10px] text-slate-500">Anomaly Missed as Normal</span>
                  </div>
                  <div className="bg-[#090d16] p-4 rounded-xl border border-emerald-900/40 text-center space-y-1">
                    <span className="text-slate-400 text-[10px]">True Negatives (TN)</span>
                    <div className="text-xl font-bold text-emerald-400">
                      {evalMetrics.confusion_matrix.tn}
                    </div>
                    <span className="text-[10px] text-slate-500">Correctly Identified Normal</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 4: ANALYSIS HISTORY */}
      {/* ======================================================== */}
      {activeSubTab === "history" && (
        <div className="bg-[#131e36]/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-cyan-400" />
                Audio Anomaly Prediction Audit Log
              </h3>
              <p className="text-xs text-slate-400">
                Persistent audit trail of previous audio anomaly evaluations and feature extractions.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={refreshHistory}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Refresh history"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              <a
                href={getAudioExportCsvUrl()}
                download="audio_anomaly_analysis_report.csv"
                className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/20 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Download Report CSV</span>
              </a>
            </div>
          </div>

          {isLoadingHistory ? (
            <div className="text-center py-8 text-xs text-slate-400 font-mono">Loading history records...</div>
          ) : historyList.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No previous audio analyses recorded yet. Upload and analyze audio files to generate audit logs.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#090d16] text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Filename</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Anomaly Score</th>
                    <th className="py-2.5 px-3">Threshold</th>
                    <th className="py-2.5 px-3">Ground Truth</th>
                    <th className="py-2.5 px-3">Summary Explanation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {historyList.map((h) => (
                    <tr key={h.analysis_id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">
                        {new Date(h.timestamp).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-200 truncate max-w-[160px]" title={h.filename}>
                        {h.filename}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                            h.is_anomaly
                              ? "bg-rose-950 text-rose-400 border border-rose-800"
                              : "bg-emerald-950 text-emerald-400 border border-emerald-800"
                          }`}
                        >
                          {h.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-white">
                        {(h.anomaly_score * 100).toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-400">{h.threshold_used.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-[11px] font-mono text-slate-400">
                        {h.ground_truth || "N/A"}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 truncate max-w-[280px]" title={h.explanation}>
                        {h.explanation}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 5: BENCHMARK DATASETS & RESOURCES */}
      {/* ======================================================== */}
      {activeSubTab === "resources" && (
        <div className="space-y-6">
          <div className="bg-[#131e36]/90 border border-cyan-900/40 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-cyan-400" />
              Standard Public Acoustic Anomaly Datasets
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              To benchmark machine vibration and anomalous sound detection algorithms against peer-reviewed research baselines,
              you can download subsets of standard open datasets and import their WAV files or ZIP archives into QuantumGuard AI.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* MIMII Dataset */}
            <div className="bg-[#131e36]/80 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                    Industrial Sound
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">16 kHz WAV</span>
                </div>
                <h4 className="text-base font-bold text-white">MIMII Dataset</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  <strong>Malfunctioning Industrial Machine Investigation and Inspection.</strong> Contains audio recordings of
                  four industrial machine types: valves, pumps, fans, and slide rails operated under both normal and abnormal conditions
                  with background factory noise.
                </p>
                <div className="text-[11px] text-slate-400 font-mono space-y-1">
                  <div>• Structure: <code>normal/*.wav</code> & <code>abnormal/*.wav</code></div>
                  <div>• Zenodo DOI: 10.5281/zenodo.3678171</div>
                </div>
              </div>
              <a
                href="https://zenodo.org/records/3678171"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center space-x-2 px-4 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold transition-colors"
              >
                <span>Visit MIMII on Zenodo</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* ToyADMOS Dataset */}
            <div className="bg-[#131e36]/80 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-800">
                    Miniature Machinery
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">48 kHz WAV</span>
                </div>
                <h4 className="text-base font-bold text-white">ToyADMOS Dataset</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Dataset designed for anomalous sound detection in miniature toy machines (conveyors, cars, and trains).
                  Provides over 540 hours of normal operational sound and diverse deliberate anomaly scenarios.
                </p>
                <div className="text-[11px] text-slate-400 font-mono space-y-1">
                  <div>• Sub-tasks: ToyCar, ToyConveyor, ToyTrain</div>
                  <div>• Hosted: GitHub / DCASE Challenge</div>
                </div>
              </div>
              <a
                href="https://github.com/YumaKoizumi/ToyADMOS-dataset"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-semibold transition-colors"
              >
                <span>Visit ToyADMOS GitHub</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* FSD50K Dataset */}
            <div className="bg-[#131e36]/80 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-purple-950 text-purple-400 border border-purple-800">
                    Acoustic Event
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">44.1 kHz WAV</span>
                </div>
                <h4 className="text-base font-bold text-white">FSD50K Dataset</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  <strong>Freesound Dataset 50K.</strong> An open dataset of human-labeled sound events containing 51,197 audio
                  clips across 200 AudioSet sound classes. Useful for cross-domain acoustic disturbance modeling.
                </p>
                <div className="text-[11px] text-slate-400 font-mono space-y-1">
                  <div>• 50,000+ audio clips</div>
                  <div>• Ground-truth AudioSet ontology tags</div>
                </div>
              </div>
              <a
                href="https://fsannotator.upf.edu/fsd/downloads/"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center space-x-2 px-4 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 text-xs font-semibold transition-colors"
              >
                <span>Visit FSD50K Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Quick Guide on Importing */}
          <div className="bg-[#131e36]/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Info className="w-4 h-4 text-cyan-400" />
              How to Import External Benchmark Audio Files
            </h4>
            <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-300">
              <li>Download a sample archive or ZIP subset from any of the links above.</li>
              <li>Ensure the audio samples are in standard uncompressed <strong>.wav</strong> format.</li>
              <li>
                Optionally arrange files in folders named <code>normal</code> and <code>anomalous</code> (or <code>abnormal</code>),
                then compress into a ZIP archive.
              </li>
              <li>
                Go to the <strong>Dataset Management</strong> tab and use the <strong>Import Dataset from ZIP Archive</strong> button.
                The application will automatically tag each sample and extract all acoustic features.
              </li>
              <li>
                Navigate to <strong>Model & Evaluation</strong> to train your model and generate accuracy/confusion metrics.
              </li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};
