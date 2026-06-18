"use client"

import { useState, useEffect } from "react"
import {
  BarChart3,
  TrendingUp,
  Clock,
  PieChart as PieChartIcon,
  Calendar,
  Layers,
  Timer,
  UserX,
  Camera,
  Shield,
  User,
} from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"

const API_BASE = "http://localhost:8000"

const PIE_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#8b5cf6", "#ec4899", "#64748b"]

interface TrendData {
  timestamp: string
  label: string
  violation_count: number
  avg_pics: number
  critical_count: number
}

interface TypeDist {
  type: string
  count: number
}

interface PeakHour {
  day: string
  hour: number
  count: number
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<"24h" | "7d" | "30d">("24h")
  const [trendData, setTrendData] = useState<TrendData[]>([])
  const [typeDist, setTypeDist] = useState<TypeDist[]>([])
  const [vehicleDist, setVehicleDist] = useState<TypeDist[]>([])
  const [peakHours, setPeakHours] = useState<PeakHour[]>([])
  const [totalViolations, setTotalViolations] = useState(0)
  const [resolutionStats, setResolutionStats] = useState<any>(null)
  const [repeatOffenders, setRepeatOffenders] = useState<any[]>([])
  const [detectionSources, setDetectionSources] = useState<any>(null)
  const [stationPerf, setStationPerf] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`${API_BASE}/api/analytics/trends?period=${period}`)
      .then((r) => r.json())
      .then((data) => {
        setTrendData(data.trend_data || [])
        setTypeDist(data.type_distribution || [])
        setVehicleDist(data.vehicle_distribution || [])
        setPeakHours(data.peak_hours || [])
        setTotalViolations(data.total_violations || 0)
        setResolutionStats(data.resolution_stats || null)
        setRepeatOffenders(data.repeat_offenders || [])
        setDetectionSources(data.detection_sources || null)
        setStationPerf(data.station_performance || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [period])

  // Build peak hour grid data
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  const hours = Array.from({ length: 24 }, (_, i) => i)
  const peakMap = new Map<string, number>()
  peakHours.forEach((p) => peakMap.set(`${p.day}-${p.hour}`, p.count))
  const maxPeakCount = Math.max(1, ...peakHours.map((p) => p.count))

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="glass-card p-3 text-xs">
          <p className="text-white font-semibold mb-1">{label}</p>
          {payload.map((p: any, i: number) => (
            <p key={i} style={{ color: p.color }} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
              {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="p-6 flex flex-col gap-6 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <BarChart3 className="w-7 h-7 text-cyan-400" />
            Analytics Dashboard
          </h1>
          <p className="text-sm text-[#7a8ba8] mt-1">
            Violation trends, PICS distribution, and temporal patterns
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-1 glass-card p-1">
          {(["24h", "7d", "30d"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`text-xs px-4 py-2 rounded-lg transition-all font-medium ${
                period === p
                  ? "bg-cyan-400/15 text-cyan-400"
                  : "text-[#7a8ba8] hover:text-white hover:bg-white/5"
              }`}
            >
              {p === "24h" ? "24 Hours" : p === "7d" ? "7 Days" : "30 Days"}
            </button>
          ))}
        </div>
      </div>

      {/* Summary stat */}
      <div className="glass-card px-5 py-3 flex items-center gap-4">
        <Layers className="w-4 h-4 text-cyan-400" />
        <span className="text-sm text-[#7a8ba8]">Total violations in period:</span>
        <span className="text-lg font-bold text-white">{totalViolations}</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="w-8 h-8 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Row 1: Violation Trend + PICS Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Violations Over Time */}
            <div className="glass-card p-5">
              <h3 className="text-xs font-bold text-[#7a8ba8] uppercase tracking-wider mb-4 flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                Violations Over Time
              </h3>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="violationGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: "#7a8ba8" }}
                      axisLine={{ stroke: "rgba(255,255,255,0.05)" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#7a8ba8" }}
                      axisLine={{ stroke: "rgba(255,255,255,0.05)" }}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="violation_count"
                      name="Violations"
                      stroke="#06b6d4"
                      strokeWidth={2}
                      fill="url(#violationGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* PICS Score Trend */}
            <div className="glass-card p-5">
              <h3 className="text-xs font-bold text-[#7a8ba8] uppercase tracking-wider mb-4 flex items-center gap-2">
                <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
                Average PICS Score
              </h3>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: "#7a8ba8" }}
                      axisLine={{ stroke: "rgba(255,255,255,0.05)" }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 10]}
                      tick={{ fontSize: 10, fill: "#7a8ba8" }}
                      axisLine={{ stroke: "rgba(255,255,255,0.05)" }}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="avg_pics" name="Avg PICS" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Row 2: Violation Types + Vehicle Types */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Violation Type Distribution */}
            <div className="glass-card p-5">
              <h3 className="text-xs font-bold text-[#7a8ba8] uppercase tracking-wider mb-4 flex items-center gap-2">
                <PieChartIcon className="w-3.5 h-3.5 text-purple-400" />
                Violation Types
              </h3>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={typeDist}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      dataKey="count"
                      nameKey="type"
                      strokeWidth={0}
                    >
                      {typeDist.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "rgba(14, 20, 33, 0.95)",
                        border: "1px solid rgba(34, 211, 238, 0.15)",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Legend
                      formatter={(value) => <span style={{ color: "#7a8ba8", fontSize: "11px" }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Vehicle Type Distribution */}
            <div className="glass-card p-5">
              <h3 className="text-xs font-bold text-[#7a8ba8] uppercase tracking-wider mb-4 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-green-400" />
                Vehicle Types
              </h3>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={vehicleDist} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 10, fill: "#7a8ba8" }}
                      axisLine={{ stroke: "rgba(255,255,255,0.05)" }}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="type"
                      tick={{ fontSize: 10, fill: "#7a8ba8" }}
                      axisLine={{ stroke: "rgba(255,255,255,0.05)" }}
                      tickLine={false}
                      width={90}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Row 3: Resolution Stats + Detection Sources */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Resolution Time KPIs */}
            <div className="glass-card p-5">
              <h3 className="text-xs font-bold text-[#7a8ba8] uppercase tracking-wider mb-4 flex items-center gap-2">
                <Timer className="w-3.5 h-3.5 text-cyan-400" />
                Resolution Time Analysis
              </h3>
              {resolutionStats && (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/[0.03] rounded-lg p-3 text-center border border-white/5">
                      <p className="text-2xl font-bold text-amber-400">{resolutionStats.avg_resolution_mins}</p>
                      <p className="text-[10px] text-[#7a8ba8] uppercase">Avg Mins</p>
                    </div>
                    <div className="bg-white/[0.03] rounded-lg p-3 text-center border border-white/5">
                      <p className="text-2xl font-bold text-cyan-400">{resolutionStats.median_resolution_mins}</p>
                      <p className="text-[10px] text-[#7a8ba8] uppercase">Median Mins</p>
                    </div>
                    <div className="bg-white/[0.03] rounded-lg p-3 text-center border border-white/5">
                      <p className="text-2xl font-bold text-emerald-400">{resolutionStats.resolved_count}</p>
                      <p className="text-[10px] text-[#7a8ba8] uppercase">Resolved</p>
                    </div>
                    <div className="bg-white/[0.03] rounded-lg p-3 text-center border border-white/5">
                      <p className="text-2xl font-bold text-red-400">{resolutionStats.unresolved_count}</p>
                      <p className="text-[10px] text-[#7a8ba8] uppercase">Unresolved</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#7a8ba8]">
                    <span>Range: {resolutionStats.min_mins}m — {resolutionStats.max_mins}m</span>
                  </div>
                </div>
              )}
            </div>

            {/* Detection Source */}
            <div className="glass-card p-5">
              <h3 className="text-xs font-bold text-[#7a8ba8] uppercase tracking-wider mb-4 flex items-center gap-2">
                <Camera className="w-3.5 h-3.5 text-emerald-400" />
                Detection Source
              </h3>
              {detectionSources && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                          <Camera className="w-3 h-3" /> Camera
                        </span>
                        <span className="text-sm font-bold text-white">{detectionSources.camera} ({detectionSources.camera_pct}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-400 transition-all duration-700" style={{ width: `${detectionSources.camera_pct}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="flex items-center gap-1.5 text-xs text-amber-400">
                          <User className="w-3 h-3" /> Manual
                        </span>
                        <span className="text-sm font-bold text-white">{detectionSources.manual} ({detectionSources.manual_pct}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full bg-amber-400 transition-all duration-700" style={{ width: `${detectionSources.manual_pct}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Repeat Offenders */}
            <div className="glass-card p-5">
              <h3 className="text-xs font-bold text-[#7a8ba8] uppercase tracking-wider mb-4 flex items-center gap-2">
                <UserX className="w-3.5 h-3.5 text-red-400" />
                Repeat Offenders
              </h3>
              <div className="flex flex-col gap-2 max-h-[240px] overflow-y-auto">
                {repeatOffenders.length === 0 && (
                  <p className="text-xs text-[#7a8ba8]">No repeat offenders detected</p>
                )}
                {repeatOffenders.map((ro: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 bg-white/[0.03] rounded-lg p-2.5 border border-white/5">
                    <div className="w-6 h-6 rounded-full bg-red-400/10 flex items-center justify-center text-[10px] font-bold text-red-400 flex-shrink-0">
                      {ro.count}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono text-white truncate">{ro.masked_number}</p>
                      <p className="text-[10px] text-[#7a8ba8]">{ro.vehicle_type} • {ro.location_count} locations</p>
                    </div>
                    <div className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/20">
                      {ro.avg_pics} PICS
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Row 4: Station Performance */}
          {stationPerf.length > 0 && (
            <div className="glass-card p-5">
              <h3 className="text-xs font-bold text-[#7a8ba8] uppercase tracking-wider mb-4 flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-purple-400" />
                Police Station Performance
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {stationPerf.map((sp: any, i: number) => {
                  const rateColor = sp.resolution_rate > 50 ? "text-emerald-400" : sp.resolution_rate > 25 ? "text-amber-400" : "text-red-400"
                  return (
                    <div key={i} className="bg-white/[0.03] rounded-lg p-3 border border-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-white">{sp.station}</span>
                        <span className={`text-[10px] font-bold ${rateColor}`}>{sp.resolution_rate}% resolved</span>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] text-[#7a8ba8]">
                        <span>{sp.total_violations} violations</span>
                        <span>{sp.resolved_count} resolved</span>
                        <span>Avg: {sp.avg_response_mins}m</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden mt-2">
                        <div className="h-full rounded-full bg-purple-400 transition-all duration-700" style={{ width: `${sp.resolution_rate}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Row 5: Peak Hours Heatmap Grid */}
          <div className="glass-card p-5">
            <h3 className="text-xs font-bold text-[#7a8ba8] uppercase tracking-wider mb-4 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-red-400" />
              Peak Hours Heatmap
            </h3>
            <div className="overflow-x-auto">
              <div className="min-w-[700px]">
                {/* Hour labels */}
                <div className="flex items-center gap-0.5 mb-1 ml-12">
                  {hours.map((h) => (
                    <div key={h} className="flex-1 text-center text-[9px] text-[#7a8ba8]">
                      {h % 3 === 0 ? `${h}:00` : ""}
                    </div>
                  ))}
                </div>

                {/* Grid rows */}
                {days.map((day) => (
                  <div key={day} className="flex items-center gap-0.5 mb-0.5">
                    <span className="w-12 text-[10px] text-[#7a8ba8] text-right pr-2 flex-shrink-0">
                      {day}
                    </span>
                    {hours.map((h) => {
                      const count = peakMap.get(`${day}-${h}`) || 0
                      const intensity = count / maxPeakCount
                      let bg = "rgba(255,255,255,0.02)"
                      if (intensity > 0.8) bg = "rgba(239, 68, 68, 0.7)"
                      else if (intensity > 0.6) bg = "rgba(249, 115, 22, 0.6)"
                      else if (intensity > 0.4) bg = "rgba(234, 179, 8, 0.5)"
                      else if (intensity > 0.2) bg = "rgba(6, 182, 212, 0.3)"
                      else if (intensity > 0) bg = "rgba(6, 182, 212, 0.1)"

                      return (
                        <div
                          key={h}
                          className="flex-1 h-7 rounded-sm transition-colors cursor-pointer"
                          style={{ background: bg }}
                          title={`${day} ${h}:00 — ${count} violations`}
                        />
                      )
                    })}
                  </div>
                ))}

                {/* Legend */}
                <div className="flex items-center gap-3 mt-3 ml-12">
                  <span className="text-[10px] text-[#7a8ba8]">Less</span>
                  {[0.02, 0.1, 0.3, 0.5, 0.6, 0.7].map((opacity, i) => {
                    const colors = [
                      "rgba(255,255,255,0.02)",
                      "rgba(6, 182, 212, 0.1)",
                      "rgba(6, 182, 212, 0.3)",
                      "rgba(234, 179, 8, 0.5)",
                      "rgba(249, 115, 22, 0.6)",
                      "rgba(239, 68, 68, 0.7)",
                    ]
                    return (
                      <div
                        key={i}
                        className="w-5 h-5 rounded-sm"
                        style={{ background: colors[i] }}
                      />
                    )
                  })}
                  <span className="text-[10px] text-[#7a8ba8]">More</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
