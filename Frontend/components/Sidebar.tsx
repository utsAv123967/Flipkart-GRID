"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Radio,
  BarChart3,
  MapPin,
  Shield,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from "lucide-react"
import { useState } from "react"

const NAV_ITEMS = [
  { href: "/", label: "Command Center", icon: LayoutDashboard },
  { href: "/live", label: "Live Feed", icon: Radio, hasBadge: true },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/zones", label: "Zone Intelligence", icon: MapPin },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={`fixed left-0 top-0 h-screen z-50 flex flex-col transition-all duration-300 ease-in-out ${
        collapsed ? "w-[72px]" : "w-[240px]"
      }`}
      style={{
        background: "linear-gradient(180deg, #080d18 0%, #060a13 100%)",
        borderRight: "1px solid rgba(34, 211, 238, 0.08)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-[rgba(34,211,238,0.08)] flex-shrink-0">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #06b6d4, #8b5cf6)" }}>
          <Shield className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold text-white tracking-tight leading-tight">GRIDLOCK</h1>
            <p className="text-[10px] text-cyan-400/70 font-medium tracking-widest">INTELLIGENCE</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative ${
                isActive
                  ? "bg-cyan-500/10 text-cyan-400"
                  : "text-[#7a8ba8] hover:text-white hover:bg-white/5"
              }`}
            >
              {isActive && (
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                  style={{ background: "#06b6d4" }}
                />
              )}
              <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? "text-cyan-400" : ""}`} />
              {!collapsed && (
                <span className="text-sm font-medium">{item.label}</span>
              )}
              {!collapsed && item.hasBadge && (
                <div className="ml-auto flex items-center gap-1.5">
                  <div className="live-dot" />
                  <span className="text-[10px] text-red-400 font-semibold">LIVE</span>
                </div>
              )}
            </Link>
          )
        })}
      </nav>

      {/* System Status */}
      <div className="px-3 pb-4 flex-shrink-0">
        <div className={`glass-card p-3 ${collapsed ? "px-2" : ""}`}>
          <div className="flex items-center gap-2">
            <div className="live-dot-green flex-shrink-0" />
            {!collapsed && (
              <div>
                <p className="text-[11px] font-semibold text-emerald-400">System Online</p>
                <p className="text-[10px] text-[#7a8ba8]">All services active</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-[#111827] border border-[rgba(34,211,238,0.15)] flex items-center justify-center text-[#7a8ba8] hover:text-cyan-400 hover:border-cyan-400/30 transition-colors z-10"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </aside>
  )
}
