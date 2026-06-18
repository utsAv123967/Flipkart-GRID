"use client"

import { MapPin, AlertTriangle, TrendingUp, Building2, TrainFront, Home } from "lucide-react"

interface ZoneCardProps {
  zone: {
    zone_id: string
    zone_name: string
    zone_type: string
    description: string
    total_violations: number
    avg_pics: number
    max_pics: number
    congestion_index: number
    risk_level: string
    critical_count: number
    severe_count: number
    unresolved_count: number
  }
  onClick?: () => void
  selected?: boolean
}

const TYPE_ICONS: Record<string, any> = {
  commercial: Building2,
  transit: TrainFront,
  residential: Home,
}

const RISK_COLORS: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  Critical: {
    bg: "rgba(239, 68, 68, 0.08)",
    text: "#ef4444",
    border: "rgba(239, 68, 68, 0.2)",
    glow: "rgba(239, 68, 68, 0.1)",
  },
  High: {
    bg: "rgba(249, 115, 22, 0.08)",
    text: "#f97316",
    border: "rgba(249, 115, 22, 0.2)",
    glow: "rgba(249, 115, 22, 0.1)",
  },
  Moderate: {
    bg: "rgba(234, 179, 8, 0.08)",
    text: "#eab308",
    border: "rgba(234, 179, 8, 0.2)",
    glow: "rgba(234, 179, 8, 0.1)",
  },
  Low: {
    bg: "rgba(6, 182, 212, 0.08)",
    text: "#06b6d4",
    border: "rgba(6, 182, 212, 0.2)",
    glow: "rgba(6, 182, 212, 0.1)",
  },
}

export default function ZoneCard({ zone, onClick, selected = false }: ZoneCardProps) {
  const TypeIcon = TYPE_ICONS[zone.zone_type] || MapPin
  const riskStyle = RISK_COLORS[zone.risk_level] || RISK_COLORS.Low

  const congestionPercent = Math.min(100, zone.congestion_index)

  return (
    <div
      onClick={onClick}
      className={`glass-card glass-card-hover p-4 cursor-pointer relative overflow-hidden transition-all duration-300 ${
        selected ? "ring-1 ring-cyan-400/40" : ""
      }`}
    >
      {/* Risk glow */}
      {zone.risk_level === "Critical" && (
        <div
          className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl pointer-events-none"
          style={{ background: riskStyle.glow }}
        />
      )}

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: riskStyle.bg, border: `1px solid ${riskStyle.border}` }}
            >
              <TypeIcon className="w-4 h-4" style={{ color: riskStyle.text }} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">{zone.zone_name}</h3>
              <span className="text-[10px] text-[#7a8ba8] uppercase tracking-wider">{zone.zone_type}</span>
            </div>
          </div>
          <div
            className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md"
            style={{
              background: riskStyle.bg,
              color: riskStyle.text,
              border: `1px solid ${riskStyle.border}`,
            }}
          >
            {zone.risk_level}
          </div>
        </div>

        {/* Congestion Bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-[#7a8ba8] uppercase tracking-wider">Congestion Index</span>
            <span className="text-xs font-bold" style={{ color: riskStyle.text }}>
              {zone.congestion_index.toFixed(1)}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{
                width: `${congestionPercent}%`,
                background: `linear-gradient(90deg, ${riskStyle.text}80, ${riskStyle.text})`,
              }}
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center">
            <p className="text-lg font-bold text-white">{zone.total_violations}</p>
            <p className="text-[10px] text-[#7a8ba8]">Violations</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold" style={{ color: riskStyle.text }}>
              {zone.avg_pics.toFixed(1)}
            </p>
            <p className="text-[10px] text-[#7a8ba8]">Avg PICS</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-amber-400">{zone.unresolved_count}</p>
            <p className="text-[10px] text-[#7a8ba8]">Unresolved</p>
          </div>
        </div>

        {/* Critical/Severe counts */}
        {(zone.critical_count > 0 || zone.severe_count > 0) && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
            {zone.critical_count > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-red-400">
                <AlertTriangle className="w-3 h-3" /> {zone.critical_count} critical
              </span>
            )}
            {zone.severe_count > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-orange-400">
                <TrendingUp className="w-3 h-3" /> {zone.severe_count} severe
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
