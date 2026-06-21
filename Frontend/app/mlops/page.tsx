"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Brain,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Loader2,
  Download,
  Clock,
  Cpu,
  HardDrive,
  Layers,
  Target,
  Activity,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  Zap,
} from "lucide-react"

const API_BASE = "http://localhost:8000"

interface ModelStatus {
  status: string
  model_type?: string
  last_updated?: string
  file_size?: string
  filepath?: string
  features?: string[]
  target?: string
  training_status?: {
    status: string
    error?: string | null
    champion_model?: string
    xgb_rmse?: number
    rf_rmse?: number
    last_completed?: string
    start_time?: string
  }
}

type UploadState = "idle" | "dragging" | "validating" | "uploading" | "training" | "success" | "error"

export default function MLOpsPage() {
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null)
  const [uploadState, setUploadState] = useState<UploadState>("idle")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadMessage, setUploadMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  // ── Fetch model status ──
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/model-status`)
      const data: ModelStatus = await res.json()
      setModelStatus(data)

      // If training just succeeded, update upload state
      if (data.training_status?.status === "success" && uploadState === "training") {
        setUploadState("success")
        setUploadMessage(
          `Training complete! Champion: ${data.training_status.champion_model}  ·  ` +
          `XGB RMSE: ${data.training_status.xgb_rmse?.toFixed(4)}  ·  ` +
          `RF RMSE: ${data.training_status.rf_rmse?.toFixed(4)}`
        )
        if (pollRef.current) clearInterval(pollRef.current)
      }
      if (data.training_status?.status === "failed" && uploadState === "training") {
        setUploadState("error")
        setErrorMessage(data.training_status.error || "Unknown training error.")
        if (pollRef.current) clearInterval(pollRef.current)
      }
    } catch {
      // Backend may not be running
    }
  }, [uploadState])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  // ── Drag & Drop ──
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (uploadState === "idle" || uploadState === "success" || uploadState === "error") {
      setUploadState("dragging")
    }
  }
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (uploadState === "dragging") setUploadState("idle")
  }
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileSelect(file)
  }

  // ── File Select / Validate ──
  const handleFileSelect = (file: File) => {
    setErrorMessage("")
    setUploadMessage("")

    if (!file.name.endsWith(".csv")) {
      setUploadState("error")
      setErrorMessage("Invalid file type. Only .csv files are accepted.")
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      setUploadState("error")
      setErrorMessage("File too large. Maximum size is 50 MB.")
      return
    }

    setSelectedFile(file)
    setUploadState("validating")

    // Quick client-side validation
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const firstLine = text.split("\n")[0]?.toLowerCase() || ""
      const headers = firstLine.split(",").map((h) => h.trim().replace(/"/g, ""))
      const required = ["hour", "day_of_week", "is_weekend", "vehicle_type"]
      const missing = required.filter((r) => !headers.includes(r))

      if (missing.length > 0) {
        setUploadMessage(
          `⚠️ Missing columns: ${missing.join(", ")}. The backend will auto-generate these, but for best results include them.`
        )
      } else {
        setUploadMessage("✓ CSV validated — all required columns found.")
      }
      setUploadState("idle")
    }
    reader.readAsText(file.slice(0, 2048)) // read first 2KB for header check
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
  }

  // ── Upload & Train ──
  const handleUpload = async () => {
    if (!selectedFile) return
    setUploadState("uploading")
    setErrorMessage("")
    setUploadMessage("Uploading CSV to server...")

    try {
      const formData = new FormData()
      formData.append("file", selectedFile)

      const res = await fetch(`${API_BASE}/api/upload-training-data`, {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || "Upload failed")
      }

      const data = await res.json()
      setUploadState("training")
      setUploadMessage(data.message || "Training started in background...")

      // Start polling for training status
      pollRef.current = setInterval(fetchStatus, 3000)
    } catch (err: any) {
      setUploadState("error")
      setErrorMessage(err.message || "Upload failed. Is the backend running?")
    }
  }

  // ── Generate & download sample CSV ──
  const generateSampleCSV = () => {
    const vehicleTypes = ["CAR", "SUV", "LORRY", "BUS", "AUTO", "TWO_WHEELER"]
    const rows = ["hour,day_of_week,is_weekend,vehicle_type,target_impact"]
    for (let i = 0; i < 200; i++) {
      const hour = Math.floor(Math.random() * 24)
      const dow = Math.floor(Math.random() * 7)
      const isWeekend = dow >= 5 ? 1 : 0
      const vt = vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)]
      const impact = (Math.random() * 10).toFixed(2)
      rows.push(`${hour},${dow},${isWeekend},${vt},${impact}`)
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "sample_training_data.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Reset ──
  const resetUpload = () => {
    setUploadState("idle")
    setSelectedFile(null)
    setUploadMessage("")
    setErrorMessage("")
    if (fileInputRef.current) fileInputRef.current.value = ""
    fetchStatus()
  }

  // ── Status helpers ──
  const trainingStatus = modelStatus?.training_status?.status || "idle"

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "text-emerald-400"
      case "training": return "text-amber-400"
      case "success": return "text-emerald-400"
      case "failed": return "text-red-400"
      default: return "text-[#7a8ba8]"
    }
  }

  const getStatusDot = (status: string) => {
    switch (status) {
      case "active": return "bg-emerald-400"
      case "training": return "bg-amber-400 animate-pulse"
      case "success": return "bg-emerald-400"
      case "failed": return "bg-red-400"
      default: return "bg-[#7a8ba8]"
    }
  }

  return (
    <div className="p-6 flex flex-col gap-6 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Brain className="w-7 h-7 text-purple-400" />
            Model Retraining — MLOps Dashboard
          </h1>
          <p className="text-sm text-[#7a8ba8] mt-1">
            Upload new training data to retrain and hot-swap the active ML pipeline
          </p>
        </div>
        <button
          onClick={() => { fetchStatus() }}
          className="glass-card px-3 py-2 flex items-center gap-2 text-[#7a8ba8] hover:text-cyan-400 hover:border-cyan-400/30 transition-all cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">Refresh Status</span>
        </button>
      </div>

      {/* ── Row 1: Model Status Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-in-up">
        {/* Active Model */}
        <div className="glass-card glass-card-hover p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-[#7a8ba8] uppercase tracking-wider">Active Model</span>
            <Cpu className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-xl font-bold text-white">
            {modelStatus?.model_type || "—"}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <div className={`w-2 h-2 rounded-full ${getStatusDot(modelStatus?.status || "idle")}`} />
            <span className={`text-xs font-medium ${getStatusColor(modelStatus?.status || "idle")}`}>
              {modelStatus?.status === "active" ? "Active & Serving" : "Inactive"}
            </span>
          </div>
        </div>

        {/* Last Updated */}
        <div className="glass-card glass-card-hover p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-[#7a8ba8] uppercase tracking-wider">Last Updated</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-lg font-bold text-white">
            {modelStatus?.last_updated || "—"}
          </p>
          <p className="text-xs text-[#7a8ba8] mt-1">Model file timestamp</p>
        </div>

        {/* File Size */}
        <div className="glass-card glass-card-hover p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-[#7a8ba8] uppercase tracking-wider">Pipeline Size</span>
            <HardDrive className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xl font-bold text-white">
            {modelStatus?.file_size || "—"}
          </p>
          <p className="text-xs text-[#7a8ba8] mt-1">Serialized .pkl file</p>
        </div>

        {/* Training Status */}
        <div className="glass-card glass-card-hover p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-[#7a8ba8] uppercase tracking-wider">Training Status</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <p className={`text-xl font-bold capitalize ${getStatusColor(trainingStatus)}`}>
            {trainingStatus}
          </p>
          {modelStatus?.training_status?.champion_model && (
            <p className="text-xs text-[#7a8ba8] mt-1">
              Champion: {modelStatus.training_status.champion_model}
            </p>
          )}
        </div>
      </div>

      {/* ── Row 2: Upload + Info ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1">
        {/* Upload Card (spans 2 cols) */}
        <div className="lg:col-span-2 glass-card p-6 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-cyan-400" />
              Upload Training Data
            </h2>
            {(uploadState === "success" || uploadState === "error" || selectedFile) && (
              <button
                onClick={resetUpload}
                className="text-[10px] text-[#7a8ba8] hover:text-white transition-colors uppercase tracking-wider font-semibold cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>

          {/* Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => {
              if (uploadState !== "uploading" && uploadState !== "training") {
                fileInputRef.current?.click()
              }
            }}
            className={`relative flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-10 transition-all duration-300 cursor-pointer ${
              uploadState === "dragging"
                ? "border-cyan-400/60 bg-cyan-400/5 scale-[1.01]"
                : uploadState === "success"
                ? "border-emerald-400/40 bg-emerald-400/5"
                : uploadState === "error"
                ? "border-red-400/40 bg-red-400/5"
                : uploadState === "training"
                ? "border-amber-400/40 bg-amber-400/5"
                : "border-white/10 bg-white/[0.02] hover:border-cyan-400/30 hover:bg-cyan-400/[0.03]"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleInputChange}
              className="hidden"
            />

            {uploadState === "training" ? (
              <>
                <div className="relative">
                  <Loader2 className="w-12 h-12 text-amber-400 animate-spin" />
                  <Sparkles className="w-5 h-5 text-amber-400 absolute -top-1 -right-1 animate-pulse" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-amber-400">Model Race in Progress...</p>
                  <p className="text-xs text-[#7a8ba8] mt-1">XGBoost vs Random Forest — best RMSE wins</p>
                </div>
              </>
            ) : uploadState === "uploading" ? (
              <>
                <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
                <p className="text-sm font-semibold text-cyan-400">Uploading to server...</p>
              </>
            ) : uploadState === "success" ? (
              <>
                <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                <div className="text-center">
                  <p className="text-sm font-semibold text-emerald-400">Hot-Swap Complete!</p>
                  <p className="text-xs text-[#7a8ba8] mt-1">New model is now active and serving predictions</p>
                </div>
              </>
            ) : uploadState === "error" ? (
              <>
                <XCircle className="w-12 h-12 text-red-400" />
                <div className="text-center">
                  <p className="text-sm font-semibold text-red-400">Error</p>
                  <p className="text-xs text-red-400/70 mt-1">{errorMessage}</p>
                </div>
              </>
            ) : (
              <>
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(139, 92, 246, 0.15))" }}
                >
                  <FileSpreadsheet className="w-8 h-8 text-cyan-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-white">
                    {selectedFile ? selectedFile.name : "Drop CSV file here or click to browse"}
                  </p>
                  <p className="text-xs text-[#7a8ba8] mt-1">
                    {selectedFile
                      ? `${(selectedFile.size / 1024).toFixed(1)} KB — ready to upload`
                      : "Supports .csv up to 50 MB"}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Validation Message */}
          {uploadMessage && (
            <div
              className={`px-4 py-3 rounded-lg text-xs font-medium animate-fade-in ${
                uploadState === "success"
                  ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20"
                  : uploadState === "training"
                  ? "bg-amber-400/10 text-amber-400 border border-amber-400/20"
                  : uploadMessage.startsWith("✓")
                  ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20"
                  : "bg-amber-400/10 text-amber-400 border border-amber-400/20"
              }`}
            >
              {uploadMessage}
            </div>
          )}

          {/* Upload Button */}
          {selectedFile && (uploadState === "idle" || uploadState === "validating") && (
            <button
              onClick={handleUpload}
              className="py-3 rounded-xl font-semibold text-sm text-white transition-all flex items-center justify-center gap-2 cursor-pointer"
              style={{
                background: "linear-gradient(135deg, #8b5cf6, #06b6d4)",
                boxShadow: "0 4px 20px rgba(139, 92, 246, 0.25)",
              }}
            >
              <Zap className="w-4 h-4" />
              Start Retraining Pipeline
            </button>
          )}
        </div>

        {/* Right Sidebar: Info + Sample Generator */}
        <div className="flex flex-col gap-4">
          {/* Required Format Card */}
          <div className="glass-card p-5">
            <h3 className="text-xs font-bold text-[#7a8ba8] uppercase tracking-wider mb-4 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              Required CSV Format
            </h3>
            <div className="space-y-2">
              {(modelStatus?.features || ["hour", "day_of_week", "is_weekend", "vehicle_type"]).map(
                (feature) => (
                  <div
                    key={feature}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span className="text-xs font-mono text-white">{feature}</span>
                    <span className="text-[10px] text-[#7a8ba8] ml-auto">required</span>
                  </div>
                )
              )}
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                <span className="text-xs font-mono text-white">
                  {modelStatus?.target || "target_impact"}
                </span>
                <span className="text-[10px] text-amber-400 ml-auto">optional</span>
              </div>
            </div>
            <p className="text-[10px] text-[#7a8ba8] mt-3 leading-relaxed">
              If <span className="text-amber-400 font-mono">target_impact</span> is missing, the
              backend will auto-generate synthetic targets for training.
            </p>
          </div>

          {/* Sample Data Generator */}
          <div className="glass-card p-5">
            <h3 className="text-xs font-bold text-[#7a8ba8] uppercase tracking-wider mb-3 flex items-center gap-2">
              <Target className="w-3.5 h-3.5 text-cyan-400" />
              Quick Start
            </h3>
            <p className="text-xs text-[#7a8ba8] mb-4 leading-relaxed">
              Generate a sample CSV with 200 rows of correctly formatted mock training data to test
              the retraining pipeline.
            </p>
            <button
              onClick={generateSampleCSV}
              className="w-full py-2.5 rounded-lg font-semibold text-xs text-white transition-all flex items-center justify-center gap-2 cursor-pointer hover:brightness-110"
              style={{
                background: "linear-gradient(135deg, #06b6d4, #0891b2)",
                boxShadow: "0 4px 16px rgba(6, 182, 212, 0.2)",
              }}
            >
              <Download className="w-3.5 h-3.5" />
              Download Sample CSV
            </button>
          </div>

          {/* How It Works */}
          <div className="glass-card p-5 flex-1">
            <h3 className="text-xs font-bold text-[#7a8ba8] uppercase tracking-wider mb-4 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              How It Works
            </h3>
            <div className="space-y-3">
              {[
                { step: "1", label: "Upload CSV", desc: "Send training data to backend" },
                { step: "2", label: "Model Race", desc: "XGBoost vs Random Forest" },
                { step: "3", label: "RMSE Gate", desc: "Best model on 20% test split wins" },
                { step: "4", label: "Hot-Swap", desc: "Champion replaces active pipeline" },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-3">
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                    style={{
                      background: "linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(6, 182, 212, 0.3))",
                    }}
                  >
                    {item.step}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">{item.label}</p>
                    <p className="text-[10px] text-[#7a8ba8]">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 3: Last Training Results (if available) ── */}
      {modelStatus?.training_status?.champion_model && (
        <div className="glass-card p-5 animate-fade-in">
          <h3 className="text-xs font-bold text-[#7a8ba8] uppercase tracking-wider mb-4 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            Last Training Results
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white/[0.03] rounded-lg p-4 border border-white/5">
              <p className="text-[10px] text-[#7a8ba8] uppercase tracking-wider mb-1">Champion</p>
              <p className="text-lg font-bold text-emerald-400">
                {modelStatus.training_status.champion_model}
              </p>
            </div>
            <div className="bg-white/[0.03] rounded-lg p-4 border border-white/5">
              <p className="text-[10px] text-[#7a8ba8] uppercase tracking-wider mb-1">XGBoost RMSE</p>
              <p className="text-lg font-bold text-cyan-400">
                {modelStatus.training_status.xgb_rmse?.toFixed(4) || "—"}
              </p>
            </div>
            <div className="bg-white/[0.03] rounded-lg p-4 border border-white/5">
              <p className="text-[10px] text-[#7a8ba8] uppercase tracking-wider mb-1">Random Forest RMSE</p>
              <p className="text-lg font-bold text-purple-400">
                {modelStatus.training_status.rf_rmse?.toFixed(4) || "—"}
              </p>
            </div>
            <div className="bg-white/[0.03] rounded-lg p-4 border border-white/5">
              <p className="text-[10px] text-[#7a8ba8] uppercase tracking-wider mb-1">Completed At</p>
              <p className="text-sm font-bold text-white">
                {modelStatus.training_status.last_completed || "—"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
