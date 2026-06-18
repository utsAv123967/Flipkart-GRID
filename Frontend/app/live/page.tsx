"use client"

import { useState, useEffect, useRef } from "react"
import { Radio, Filter, Pause, Play, AlertTriangle, Zap } from "lucide-react"
import ViolationCard from "@/components/ViolationCard"

const API_BASE = "http://localhost:8000"

interface Violation {
  violation_id: string
  timestamp: string
  latitude: number
  longitude: number
  location_name: string
  zone_id: string
  zone_type: string
  road_width_m: number
  dist_to_intersection_m: number
  violation_type: string
  violation_label: string
  violation_severity_base: number
  vehicle_type: string
  vehicle_size_factor: number
  is_resolved: boolean
  resolved_at: string | null
  pics_score: number
  severity: string
  severity_color: string
}

export default function LiveFeedPage() {
  const [violations, setViolations] = useState<Violation[]>([])
  const [paused, setPaused] = useState(false)
  const [connected, setConnected] = useState(false)
  const [filter, setFilter] = useState<string>("all")
  const [totalCount, setTotalCount] = useState(0)
  const [perMinute, setPerMinute] = useState(0)
  const pausedRef = useRef(paused)
  const countRef = useRef(0)

  useEffect(() => {
    pausedRef.current = paused
  }, [paused])

  // Per-minute counter
  useEffect(() => {
    const interval = setInterval(() => {
      setPerMinute(countRef.current)
      countRef.current = 0
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  // Load recent violations on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/violations/recent?limit=30`)
      .then((r) => r.json())
      .then((data) => {
        setViolations(data)
        setTotalCount(data.length)
      })
      .catch(() => {})
  }, [])

  // SSE Connection
  useEffect(() => {
    let eventSource: EventSource | null = null

    const connect = () => {
      try {
        eventSource = new EventSource(`${API_BASE}/api/violations/live`)

        eventSource.onopen = () => setConnected(true)

        eventSource.onmessage = (event) => {
          if (pausedRef.current) return
          try {
            const data: Violation = JSON.parse(event.data)
            setViolations((prev) => [data, ...prev].slice(0, 100))
            setTotalCount((prev) => prev + 1)
            countRef.current += 1
          } catch { /* skip */ }
        }

        eventSource.onerror = () => {
          setConnected(false)
          eventSource?.close()
          setTimeout(connect, 5000)
        }
      } catch {
        setTimeout(connect, 5000)
      }
    }

    connect()
    return () => { eventSource?.close() }
  }, [])

  const handleResolve = async (id: string) => {
    try {
      await fetch(`${API_BASE}/api/violations/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ violation_id: id }),
      })
      setViolations((prev) =>
        prev.map((v) =>
          v.violation_id === id
            ? { ...v, is_resolved: true, resolved_at: new Date().toISOString() }
            : v
        )
      )
    } catch { /* skip */ }
  }

  const filteredViolations = violations.filter((v) => {
    if (filter === "all") return true
    if (filter === "critical") return v.severity === "Critical" || v.severity === "Severe"
    if (filter === "unresolved") return !v.is_resolved
    return true
  })

  const severityCounts = {
    critical: violations.filter((v) => v.severity === "Critical").length,
    severe: violations.filter((v) => v.severity === "Severe").length,
    high: violations.filter((v) => v.severity === "High").length,
  }

  return (
    <div className="p-6 flex flex-col gap-6 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Radio className="w-7 h-7 text-red-400" />
            Live Violation Feed
          </h1>
          <p className="text-sm text-[#7a8ba8] mt-1">
            Real-time parking violation stream with PICS scoring
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Live indicator */}
          <div className="glass-card px-3 py-2 flex items-center gap-2">
            <div className={connected ? "live-dot" : "w-2 h-2 rounded-full bg-neutral-600"} />
            <span className="text-xs text-[#7a8ba8] font-mono">
              {connected ? "LIVE" : "OFFLINE"}
            </span>
          </div>

          {/* Per minute rate */}
          <div className="glass-card px-3 py-2 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs text-white font-mono">{perMinute}/min</span>
          </div>

          {/* Pause/Play */}
          <button
            onClick={() => setPaused(!paused)}
            className={`glass-card px-3 py-2 flex items-center gap-2 transition-colors ${
              paused ? "border-amber-400/30" : ""
            }`}
          >
            {paused ? (
              <Play className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Pause className="w-3.5 h-3.5 text-[#7a8ba8]" />
            )}
            <span className="text-xs text-[#7a8ba8]">{paused ? "Paused" : "Streaming"}</span>
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-4">
        <div className="glass-card px-4 py-3 flex items-center gap-3">
          <span className="text-xs text-[#7a8ba8] uppercase tracking-wider">Total</span>
          <span className="text-lg font-bold text-white">{totalCount}</span>
        </div>
        <div className="glass-card px-4 py-3 flex items-center gap-3">
          <span className="text-xs text-red-400 uppercase tracking-wider">Critical</span>
          <span className="text-lg font-bold text-red-400">{severityCounts.critical}</span>
        </div>
        <div className="glass-card px-4 py-3 flex items-center gap-3">
          <span className="text-xs text-orange-400 uppercase tracking-wider">Severe</span>
          <span className="text-lg font-bold text-orange-400">{severityCounts.severe}</span>
        </div>
        <div className="glass-card px-4 py-3 flex items-center gap-3">
          <span className="text-xs text-yellow-400 uppercase tracking-wider">High</span>
          <span className="text-lg font-bold text-yellow-400">{severityCounts.high}</span>
        </div>

        {/* Filters */}
        <div className="ml-auto flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-[#7a8ba8]" />
          {["all", "critical", "unresolved"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-all capitalize ${
                filter === f
                  ? "bg-cyan-400/10 text-cyan-400 border border-cyan-400/20"
                  : "text-[#7a8ba8] hover:text-white hover:bg-white/5 border border-transparent"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Violation Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
        {filteredViolations.map((v) => (
          <ViolationCard
            key={v.violation_id}
            violation={v}
            onResolve={handleResolve}
            animated={true}
          />
        ))}
      </div>

      {filteredViolations.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-[#7a8ba8]">
          <AlertTriangle className="w-10 h-10 mb-3 text-[#7a8ba8]/50" />
          <p className="text-sm">No violations match the current filter</p>
        </div>
      )}
    </div>
  )
}
