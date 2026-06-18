"use client"

import { useEffect, useState } from "react"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import type { LucideIcon } from "lucide-react"

interface KpiCardProps {
  title: string
  value: number | string
  subtitle?: string
  icon: LucideIcon
  trend?: "up" | "down" | "stable"
  trendValue?: string
  color?: "cyan" | "amber" | "red" | "green" | "purple"
  decimals?: number
  prefix?: string
  suffix?: string
  delay?: number
}

const COLOR_MAP = {
  cyan: {
    iconBg: "rgba(6, 182, 212, 0.12)",
    iconColor: "#06b6d4",
    trendUp: "#10b981",
    trendDown: "#ef4444",
    glowColor: "rgba(6, 182, 212, 0.06)",
  },
  amber: {
    iconBg: "rgba(245, 158, 11, 0.12)",
    iconColor: "#f59e0b",
    trendUp: "#ef4444",
    trendDown: "#10b981",
    glowColor: "rgba(245, 158, 11, 0.06)",
  },
  red: {
    iconBg: "rgba(239, 68, 68, 0.12)",
    iconColor: "#ef4444",
    trendUp: "#ef4444",
    trendDown: "#10b981",
    glowColor: "rgba(239, 68, 68, 0.06)",
  },
  green: {
    iconBg: "rgba(16, 185, 129, 0.12)",
    iconColor: "#10b981",
    trendUp: "#10b981",
    trendDown: "#ef4444",
    glowColor: "rgba(16, 185, 129, 0.06)",
  },
  purple: {
    iconBg: "rgba(139, 92, 246, 0.12)",
    iconColor: "#8b5cf6",
    trendUp: "#10b981",
    trendDown: "#ef4444",
    glowColor: "rgba(139, 92, 246, 0.06)",
  },
}

export default function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  color = "cyan",
  decimals = 0,
  prefix = "",
  suffix = "",
  delay = 0,
}: KpiCardProps) {
  const [displayValue, setDisplayValue] = useState(0)
  const [visible, setVisible] = useState(false)
  const colors = COLOR_MAP[color]
  const numericValue = typeof value === "number" ? value : parseFloat(value) || 0

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  useEffect(() => {
    if (!visible) return
    const duration = 1200
    const steps = 40
    const stepTime = duration / steps
    const increment = numericValue / steps
    let current = 0
    let step = 0

    const interval = setInterval(() => {
      step++
      current = Math.min(numericValue, increment * step)
      setDisplayValue(current)
      if (step >= steps) {
        setDisplayValue(numericValue)
        clearInterval(interval)
      }
    }, stepTime)

    return () => clearInterval(interval)
  }, [numericValue, visible])

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus
  const trendColor = trend === "up" ? colors.trendUp : trend === "down" ? colors.trendDown : "#7a8ba8"

  return (
    <div
      className={`glass-card glass-card-hover p-5 relative overflow-hidden transition-all duration-500 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      {/* Subtle glow */}
      <div
        className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl pointer-events-none"
        style={{ background: colors.glowColor }}
      />

      <div className="flex items-start justify-between relative z-10">
        <div className="flex-1">
          <p className="text-[11px] font-semibold text-[#7a8ba8] uppercase tracking-wider mb-2">{title}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-white tabular-nums">
              {prefix}
              {decimals > 0 ? displayValue.toFixed(decimals) : Math.round(displayValue)}
              {suffix}
            </span>
          </div>
          {subtitle && <p className="text-xs text-[#7a8ba8] mt-1">{subtitle}</p>}
        </div>

        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: colors.iconBg }}
        >
          <Icon className="w-5 h-5" style={{ color: colors.iconColor }} />
        </div>
      </div>

      {trend && trendValue && (
        <div className="flex items-center gap-1.5 mt-3 relative z-10">
          <TrendIcon className="w-3.5 h-3.5" style={{ color: trendColor }} />
          <span className="text-xs font-semibold" style={{ color: trendColor }}>
            {trendValue}
          </span>
          <span className="text-[11px] text-[#7a8ba8]">vs last period</span>
        </div>
      )}
    </div>
  )
}
