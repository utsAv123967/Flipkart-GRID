"use client"

import { MapPin, Clock, Car, AlertTriangle, CheckCircle, Shield, Camera, User } from "lucide-react"

function maskVehicleNumber(vn?: string): string {
  if (!vn) return "—"
  const parts = vn.split("-")
  if (parts.length >= 4) return `${parts[0]}-${parts[1]}-**-**${parts[3].slice(-2)}`
  return vn.slice(0, 4) + "****" + vn.slice(-2)
}

interface ViolationCardProps {
  violation: {
    violation_id: string
    timestamp: string
    location_name: string
    zone_id?: string
    violation_label?: string
    violation_type?: string
    vehicle_type?: string
    vehicle_number?: string
    pics_score: number
    severity: string
    severity_color: string
    is_resolved: boolean
    police_station?: string
    junction_name?: string
    device_id?: string
    created_by_id?: string
    created_datetime?: string
    closed_datetime?: string
  }
  onResolve?: (id: string) => void
  compact?: boolean
  animated?: boolean
}

export default function ViolationCard({ violation, onResolve, compact = false, animated = true }: ViolationCardProps) {
  const timeStr = (() => {
    try {
      const d = new Date(violation.timestamp)
      return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
    } catch {
      return "—"
    }
  })()

  const severityClasses: Record<string, string> = {
    Critical: "severity-bg-critical severity-critical",
    Severe: "severity-bg-severe severity-severe",
    High: "severity-bg-high severity-high",
    Moderate: "severity-bg-moderate severity-moderate",
    Low: "severity-bg-low severity-low",
  }

  const barColors: Record<string, string> = {
    Critical: "#ef4444",
    Severe: "#f97316",
    High: "#eab308",
    Moderate: "#22c55e",
    Low: "#06b6d4",
  }

  if (compact) {
    return (
      <div className={`glass-card p-3 flex items-center gap-3 ${animated ? "animate-slide-in-right" : ""}`}>
        <div
          className="w-1 h-10 rounded-full flex-shrink-0"
          style={{ background: barColors[violation.severity] || "#06b6d4" }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{violation.location_name}</p>
          <div className="flex items-center gap-2">
            <p className="text-xs text-[#7a8ba8]">{violation.violation_label || violation.violation_type}</p>
            {violation.vehicle_number && (
              <span className="text-[10px] text-cyan-400/60 font-mono">{maskVehicleNumber(violation.vehicle_number)}</span>
            )}
          </div>
        </div>
        <div
          className={`text-xs font-bold px-2 py-1 rounded-md border ${severityClasses[violation.severity] || ""}`}
        >
          {violation.pics_score?.toFixed(1)}
        </div>
        <span className="text-[11px] text-[#7a8ba8] flex-shrink-0">{timeStr}</span>
      </div>
    )
  }

  return (
    <div className={`glass-card glass-card-hover relative overflow-hidden ${animated ? "animate-slide-in-up" : ""}`}>
      {/* Severity bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ background: barColors[violation.severity] || "#06b6d4" }}
      />

      <div className="p-4 pl-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
              <span className="text-sm font-semibold text-white truncate">{violation.location_name}</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-[#7a8ba8] flex-wrap">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> {timeStr}
              </span>
              <span className="flex items-center gap-1">
                <Car className="w-3 h-3" /> {violation.vehicle_type || "—"}
              </span>
              {violation.vehicle_number && (
                <span className="text-cyan-400/70 font-mono text-[10px]">
                  {maskVehicleNumber(violation.vehicle_number)}
                </span>
              )}
              {violation.device_id ? (
                <span className="flex items-center gap-1 text-emerald-400/70">
                  <Camera className="w-3 h-3" /> {violation.device_id}
                </span>
              ) : violation.created_by_id ? (
                <span className="flex items-center gap-1 text-amber-400/70">
                  <User className="w-3 h-3" /> {violation.created_by_id}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <div
              className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                severityClasses[violation.severity] || ""
              }`}
            >
              PICS {violation.pics_score?.toFixed(1)}
            </div>
            <span className="text-[10px] font-medium" style={{ color: barColors[violation.severity] }}>
              {violation.severity}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              <span className="text-xs text-[#7a8ba8]">{violation.violation_label || violation.violation_type}</span>
            </div>
            {violation.police_station && (
              <span className="flex items-center gap-1 text-[10px] text-[#7a8ba8]/60">
                <Shield className="w-2.5 h-2.5" /> {violation.police_station}
              </span>
            )}
          </div>

          {violation.is_resolved ? (
            <span className="flex items-center gap-1 text-xs text-emerald-400">
              <CheckCircle className="w-3 h-3" /> Resolved
            </span>
          ) : (
            onResolve && (
              <button
                onClick={() => onResolve(violation.violation_id)}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-medium transition-colors px-2 py-1 rounded hover:bg-cyan-400/10"
              >
                Mark Resolved
              </button>
            )
          )}
        </div>
      </div>
    </div>
  )
}
