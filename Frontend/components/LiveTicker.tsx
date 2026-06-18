"use client"

import { useEffect, useState, useRef } from "react"
import { Radio, MapPin } from "lucide-react"

interface TickerViolation {
  violation_id: string
  location_name: string
  violation_label: string
  pics_score: number
  severity: string
  severity_color: string
  vehicle_type: string
  timestamp: string
}

interface LiveTickerProps {
  apiBase?: string
}

export default function LiveTicker({ apiBase = "http://localhost:8000" }: LiveTickerProps) {
  const [violations, setViolations] = useState<TickerViolation[]>([])
  const [connected, setConnected] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let eventSource: EventSource | null = null

    const connect = () => {
      try {
        eventSource = new EventSource(`${apiBase}/api/violations/live`)

        eventSource.onopen = () => setConnected(true)

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            setViolations((prev) => {
              const updated = [data, ...prev].slice(0, 20) // Keep last 20
              return updated
            })
          } catch (e) {
            // skip malformed events
          }
        }

        eventSource.onerror = () => {
          setConnected(false)
          eventSource?.close()
          // Reconnect after 5 seconds
          setTimeout(connect, 5000)
        }
      } catch (e) {
        setTimeout(connect, 5000)
      }
    }

    connect()

    return () => {
      eventSource?.close()
    }
  }, [apiBase])

  const barColor = (severity: string) => {
    const map: Record<string, string> = {
      Critical: "#ef4444",
      Severe: "#f97316",
      High: "#eab308",
      Moderate: "#22c55e",
      Low: "#06b6d4",
    }
    return map[severity] || "#06b6d4"
  }

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/5">
        <div className={connected ? "live-dot" : "w-2 h-2 rounded-full bg-neutral-600"} />
        <Radio className="w-3.5 h-3.5 text-red-400" />
        <span className="text-[11px] font-semibold text-[#7a8ba8] uppercase tracking-wider">
          Live Violations Feed
        </span>
        <span className="ml-auto text-[10px] text-[#7a8ba8]">
          {connected ? "Connected" : "Reconnecting..."}
        </span>
      </div>

      {/* Ticker scroll */}
      <div ref={containerRef} className="flex gap-3 px-4 py-3 overflow-x-auto">
        {violations.length === 0 && (
          <div className="text-xs text-[#7a8ba8] py-2">Waiting for live violations...</div>
        )}
        {violations.map((v, i) => (
          <div
            key={v.violation_id + i}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5 flex-shrink-0 animate-slide-in-right"
          >
            <div
              className="w-1 h-6 rounded-full flex-shrink-0"
              style={{ background: barColor(v.severity) }}
            />
            <MapPin className="w-3 h-3 text-[#7a8ba8] flex-shrink-0" />
            <span className="text-xs text-white font-medium whitespace-nowrap">{v.location_name}</span>
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded"
              style={{
                color: barColor(v.severity),
                background: `${barColor(v.severity)}15`,
              }}
            >
              {v.pics_score?.toFixed(1)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
