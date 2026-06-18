"use client"

import { useState, useEffect } from "react"
import {
  MapPin,
  Search,
  ArrowUpDown,
  X,
  AlertTriangle,
  Clock,
  TrendingUp,
  BarChart3,
} from "lucide-react"
import ZoneCard from "@/components/ZoneCard"
import ViolationCard from "@/components/ViolationCard"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

const API_BASE = "http://localhost:8000"

interface Zone {
  zone_id: string
  zone_name: string
  zone_type: string
  description: string
  centroid_lat: number
  centroid_lng: number
  total_violations: number
  avg_pics: number
  max_pics: number
  congestion_index: number
  risk_level: string
  critical_count: number
  severe_count: number
  unresolved_count: number
}

interface ZoneDetailData {
  zone_id: string
  name: string
  type: string
  description: string
  avg_pics: number
  max_pics: number
  total_violations: number
  critical_count: number
  severe_count: number
  congestion_index: number
  risk_level: string
  violations: any[]
  hourly_distribution: { hour: number; count: number }[]
  violation_breakdown: { type: string; count: number }[]
}

export default function ZonesPage() {
  const [zones, setZones] = useState<Zone[]>([])
  const [selectedZone, setSelectedZone] = useState<string | null>(null)
  const [zoneDetail, setZoneDetail] = useState<ZoneDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [sortBy, setSortBy] = useState<"congestion_index" | "total_violations" | "avg_pics">("congestion_index")
  const [filterType, setFilterType] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    fetch(`${API_BASE}/api/zones`)
      .then((r) => r.json())
      .then((data) => {
        setZones(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleZoneClick = async (zoneId: string) => {
    if (selectedZone === zoneId) {
      setSelectedZone(null)
      setZoneDetail(null)
      return
    }

    setSelectedZone(zoneId)
    setDetailLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/zones/${zoneId}`)
      const data = await res.json()
      setZoneDetail(data)
    } catch {
      setZoneDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }

  const filteredZones = zones
    .filter((z) => {
      if (filterType !== "all" && z.zone_type !== filterType) return false
      if (searchQuery && !z.zone_name.toLowerCase().includes(searchQuery.toLowerCase())) return false
      return true
    })
    .sort((a, b) => {
      return (b[sortBy] || 0) - (a[sortBy] || 0)
    })

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="glass-card p-3 text-xs">
          <p className="text-white font-semibold mb-1">{label}:00</p>
          {payload.map((p: any, i: number) => (
            <p key={i} style={{ color: p.color }}>
              {p.name}: {p.value}
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
            <MapPin className="w-7 h-7 text-cyan-400" />
            Zone Intelligence
          </h1>
          <p className="text-sm text-[#7a8ba8] mt-1">
            Grid-based spatial analysis with congestion scoring per zone
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="glass-card flex items-center gap-2 px-3 py-2 flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 text-[#7a8ba8]" />
          <input
            type="text"
            placeholder="Search zones..."
            className="bg-transparent text-sm text-white placeholder-[#7a8ba8] focus:outline-none flex-1"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Type Filter */}
        <div className="flex items-center gap-1 glass-card p-1">
          {["all", "commercial", "transit", "residential"].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-all capitalize ${
                filterType === t
                  ? "bg-cyan-400/15 text-cyan-400"
                  : "text-[#7a8ba8] hover:text-white hover:bg-white/5"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-1 glass-card p-1">
          <ArrowUpDown className="w-3 h-3 text-[#7a8ba8] mx-2" />
          {[
            { key: "congestion_index" as const, label: "Congestion" },
            { key: "total_violations" as const, label: "Violations" },
            { key: "avg_pics" as const, label: "PICS" },
          ].map((s) => (
            <button
              key={s.key}
              onClick={() => setSortBy(s.key)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-all ${
                sortBy === s.key
                  ? "bg-cyan-400/15 text-cyan-400"
                  : "text-[#7a8ba8] hover:text-white hover:bg-white/5"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="w-8 h-8 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex gap-4">
          {/* Zone Grid */}
          <div className={`grid gap-3 transition-all duration-300 ${
            selectedZone ? "grid-cols-1 lg:grid-cols-2 w-1/2" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 flex-1"
          }`}>
            {filteredZones.map((zone) => (
              <ZoneCard
                key={zone.zone_id}
                zone={zone}
                onClick={() => handleZoneClick(zone.zone_id)}
                selected={selectedZone === zone.zone_id}
              />
            ))}

            {filteredZones.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-[#7a8ba8]">
                <MapPin className="w-10 h-10 mb-3 text-[#7a8ba8]/50" />
                <p className="text-sm">No zones match the current filters</p>
              </div>
            )}
          </div>

          {/* Zone Detail Panel */}
          {selectedZone && (
            <div className="w-1/2 glass-card p-5 animate-slide-in-right overflow-y-auto max-h-[calc(100vh-200px)] sticky top-6">
              {detailLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-6 h-6 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
                </div>
              ) : zoneDetail ? (
                <div className="flex flex-col gap-5">
                  {/* Detail Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-white">{zoneDetail.name}</h2>
                      <p className="text-xs text-[#7a8ba8] mt-1">{zoneDetail.description}</p>
                    </div>
                    <button
                      onClick={() => { setSelectedZone(null); setZoneDetail(null) }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-[#7a8ba8] hover:text-white hover:bg-white/5"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white/[0.03] rounded-lg p-3 text-center border border-white/5">
                      <p className="text-2xl font-bold text-white">{zoneDetail.total_violations}</p>
                      <p className="text-[10px] text-[#7a8ba8] uppercase">Violations</p>
                    </div>
                    <div className="bg-white/[0.03] rounded-lg p-3 text-center border border-white/5">
                      <p className="text-2xl font-bold text-amber-400">{zoneDetail.avg_pics.toFixed(1)}</p>
                      <p className="text-[10px] text-[#7a8ba8] uppercase">Avg PICS</p>
                    </div>
                    <div className="bg-white/[0.03] rounded-lg p-3 text-center border border-white/5">
                      <p className="text-2xl font-bold text-red-400">{zoneDetail.congestion_index.toFixed(1)}</p>
                      <p className="text-[10px] text-[#7a8ba8] uppercase">Congestion</p>
                    </div>
                  </div>

                  {/* Hourly Distribution Chart */}
                  <div>
                    <h3 className="text-xs font-bold text-[#7a8ba8] uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      Hourly Distribution
                    </h3>
                    <div className="h-[180px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={zoneDetail.hourly_distribution}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                          <XAxis
                            dataKey="hour"
                            tick={{ fontSize: 9, fill: "#7a8ba8" }}
                            axisLine={{ stroke: "rgba(255,255,255,0.05)" }}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fontSize: 9, fill: "#7a8ba8" }}
                            axisLine={{ stroke: "rgba(255,255,255,0.05)" }}
                            tickLine={false}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="count" name="Violations" fill="#06b6d4" radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Violation Type Breakdown */}
                  <div>
                    <h3 className="text-xs font-bold text-[#7a8ba8] uppercase tracking-wider mb-3 flex items-center gap-2">
                      <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
                      Violation Breakdown
                    </h3>
                    <div className="flex flex-col gap-2">
                      {zoneDetail.violation_breakdown.map((vb, i) => {
                        const maxCount = Math.max(1, ...zoneDetail.violation_breakdown.map((v) => v.count))
                        const pct = (vb.count / maxCount) * 100
                        return (
                          <div key={i} className="flex items-center gap-3">
                            <span className="text-[11px] text-[#7a8ba8] w-40 truncate">{vb.type}</span>
                            <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{
                                  width: `${pct}%`,
                                  background: `linear-gradient(90deg, #8b5cf6, #06b6d4)`,
                                }}
                              />
                            </div>
                            <span className="text-xs text-white font-semibold w-8 text-right">{vb.count}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Recent Violations */}
                  <div>
                    <h3 className="text-xs font-bold text-[#7a8ba8] uppercase tracking-wider mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                      Recent Violations ({zoneDetail.violations.length})
                    </h3>
                    <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto">
                      {zoneDetail.violations.slice(0, 15).map((v: any) => (
                        <ViolationCard key={v.violation_id} violation={v} compact animated={false} />
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[#7a8ba8]">Failed to load zone details.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
