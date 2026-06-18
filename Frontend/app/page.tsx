"use client"

import { useState, useEffect } from "react"
import {
  AlertTriangle,
  ShieldAlert,
  MapPin,
  Truck,
  Activity,
  Target,
  Clock,
  Map as MapIcon,
  Send,
  ChevronDown,
} from "lucide-react"
import KpiCard from "@/components/KpiCard"
import LiveTicker from "@/components/LiveTicker"

const API_BASE = "http://localhost:8000"

interface Allocation {
  van_id: number
  assigned_hotspot: string
  estimated_eta_mins: number
  route_nodes: { step: number; junction_name: string }[]
}

interface Summary {
  total_violations_24h: number
  avg_pics_24h: number
  active_critical_zones: number
  total_unresolved: number
  violations_per_hour: number
  top_zone_name: string
  top_zone_congestion: number
  pics_trend: string
}

export default function CommandCenter() {
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split("T")[0])
  const [timeRange, setTimeRange] = useState("Morning Rush")
  const [vehicleFilter, setVehicleFilter] = useState("CAR")
  const [availableVans, setAvailableVans] = useState(5)
  const [allocations, setAllocations] = useState<Allocation[]>([])
  const [loading, setLoading] = useState(false)
  const [mapUrl, setMapUrl] = useState(
    `${API_BASE}/api/heatmap?target_date=${new Date().toISOString().split("T")[0]}&time_range=Morning Rush`
  )
  const [summary, setSummary] = useState<Summary | null>(null)

  // Fetch KPI summary on load
  useEffect(() => {
    fetch(`${API_BASE}/api/analytics/summary`)
      .then((r) => r.json())
      .then(setSummary)
      .catch(() => {})
  }, [])

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const params = new URLSearchParams({
        target_date: targetDate,
        time_range: timeRange,
        vehicle_filter: vehicleFilter,
      }).toString()

      setMapUrl(`${API_BASE}/api/heatmap?${params}`)

      const hotspotsRes = await fetch(`${API_BASE}/api/hotspots?${params}`)
      const hotspotsData = await hotspotsRes.json()

      const allocRes = await fetch(`${API_BASE}/api/allocate-resources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ available_vans: availableVans, hotspots_list: hotspotsData }),
      })
      const allocData = await allocRes.json()
      setAllocations(allocData)

      // Refresh summary
      const sumRes = await fetch(`${API_BASE}/api/analytics/summary`)
      setSummary(await sumRes.json())
    } catch (err) {
      console.error("Deploy error:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 flex flex-col gap-6 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <ShieldAlert className="w-7 h-7 text-cyan-400" />
            Command Center
          </h1>
          <p className="text-sm text-[#7a8ba8] mt-1">
            AI-powered parking intelligence & congestion impact dashboard
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="glass-card px-3 py-2 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-[#7a8ba8]" />
            <span className="text-xs text-[#7a8ba8] font-mono">
              {new Date().toLocaleDateString("en-IN", {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Violations (24h)"
          value={summary?.total_violations_24h ?? 0}
          icon={AlertTriangle}
          color="red"
          trend={summary?.pics_trend === "up" ? "up" : "down"}
          trendValue={summary?.pics_trend === "up" ? "+12%" : "-8%"}
          subtitle="Parking violations detected"
          delay={0}
        />
        <KpiCard
          title="Avg PICS Score"
          value={summary?.avg_pics_24h ?? 0}
          icon={Activity}
          color="amber"
          decimals={1}
          suffix="/10"
          trend={summary?.pics_trend === "up" ? "up" : "stable"}
          trendValue={summary?.pics_trend === "up" ? "+0.8" : "±0.2"}
          subtitle="Congestion impact rating"
          delay={100}
        />
        <KpiCard
          title="Critical Zones"
          value={summary?.active_critical_zones ?? 0}
          icon={Target}
          color="purple"
          subtitle={`Top: ${summary?.top_zone_name ?? "—"}`}
          delay={200}
        />
        <KpiCard
          title="Unresolved"
          value={summary?.total_unresolved ?? 0}
          icon={MapPin}
          color="cyan"
          subtitle={`${summary?.violations_per_hour?.toFixed(1) ?? "0"}/hr rate`}
          delay={300}
        />
      </div>

      {/* Main Content: Map + Controls */}
      <div className="flex gap-4 flex-1 min-h-[500px]">
        {/* Left: Tactical Controls */}
        <div className="w-[300px] flex-shrink-0 flex flex-col gap-4">
          <div className="glass-card p-5">
            <h2 className="text-xs font-bold text-[#7a8ba8] uppercase tracking-wider mb-4 flex items-center gap-2">
              <Target className="w-3.5 h-3.5 text-cyan-400" />
              Tactical Parameters
            </h2>
            <form onSubmit={handleDeploy} className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-[#7a8ba8] uppercase tracking-wider">
                  Target Date
                </label>
                <input
                  type="date"
                  className="bg-white/[0.03] border border-white/5 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400/30 transition-colors"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-[#7a8ba8] uppercase tracking-wider">
                  Time Period
                </label>
                <select
                  className="bg-white/[0.03] border border-white/5 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400/30 transition-colors appearance-none"
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                >
                  <option value="Morning Rush">Morning Rush (6-10 AM)</option>
                  <option value="Midday">Midday (10-2 PM)</option>
                  <option value="Afternoon Rush">Afternoon Rush (2-6 PM)</option>
                  <option value="Evening">Evening (6-10 PM)</option>
                  <option value="Night">Night (10-6 AM)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-[#7a8ba8] uppercase tracking-wider">
                  Vehicle Focus
                </label>
                <select
                  className="bg-white/[0.03] border border-white/5 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400/30 transition-colors appearance-none"
                  value={vehicleFilter}
                  onChange={(e) => setVehicleFilter(e.target.value)}
                >
                  <option value="CAR">Car</option>
                  <option value="SUV">SUV</option>
                  <option value="LORRY">Lorry / Heavy</option>
                  <option value="BUS">Bus</option>
                  <option value="AUTO">Auto</option>
                  <option value="TWO_WHEELER">Two-Wheeler</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-[#7a8ba8] uppercase tracking-wider">
                  Available Patrol Units
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  className="bg-white/[0.03] border border-white/5 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400/30 transition-colors"
                  value={availableVans}
                  onChange={(e) => setAvailableVans(Number(e.target.value))}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-1 py-2.5 rounded-lg font-semibold text-sm text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                style={{
                  background: loading
                    ? "rgba(6, 182, 212, 0.3)"
                    : "linear-gradient(135deg, #06b6d4, #0891b2)",
                  boxShadow: loading ? "none" : "0 4px 16px rgba(6, 182, 212, 0.2)",
                }}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Deploying Strategy...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Deploy Strategy
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Patrol Assignments */}
          {allocations.length > 0 && (
            <div className="glass-card p-5 flex-1 overflow-y-auto">
              <h2 className="text-xs font-bold text-[#7a8ba8] uppercase tracking-wider mb-3 flex items-center gap-2">
                <Truck className="w-3.5 h-3.5 text-cyan-400" />
                Active Patrol Routes
              </h2>
              <div className="flex flex-col gap-2.5">
                {allocations.map((alloc) => (
                  <div
                    key={alloc.van_id}
                    className="bg-white/[0.03] rounded-lg p-3 border border-white/5 animate-slide-in-up"
                  >
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm font-bold text-cyan-400">Unit #{alloc.van_id}</span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-cyan-400/10 text-cyan-400 border border-cyan-400/20">
                        ETA: {alloc.estimated_eta_mins}m
                      </span>
                    </div>
                    <p className="text-xs text-white font-medium">{alloc.assigned_hotspot}</p>
                    <div className="flex items-center gap-1 mt-2">
                      {alloc.route_nodes.map((node, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <span className="text-[10px] text-[#7a8ba8] truncate max-w-[80px]">
                            {node.junction_name.length > 12
                              ? node.junction_name.substring(0, 12) + "…"
                              : node.junction_name}
                          </span>
                          {i < alloc.route_nodes.length - 1 && (
                            <span className="text-[#7a8ba8]/50 text-[10px]">→</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Center: Intelligence Heatmap */}
        <div className="flex-1 glass-card overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
            <MapIcon className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-semibold text-white">Congestion Intelligence Radar</span>
            <div className="ml-auto flex items-center gap-2">
              <div className="live-dot" />
              <span className="text-[10px] text-[#7a8ba8]">Real-time</span>
            </div>
          </div>
          <iframe
            src={mapUrl}
            className="w-full flex-1 border-0"
            style={{ background: "#0c1220" }}
            title="Congestion Intelligence Heatmap"
          />
        </div>
      </div>

      {/* Bottom: Live Ticker */}
      <LiveTicker apiBase={API_BASE} />
    </div>
  )
}