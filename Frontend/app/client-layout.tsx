"use client"

import Sidebar from "@/components/Sidebar"
import CopilotPanel from "@/components/CopilotPanel"

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-grid-pattern">
      <Sidebar />
      <main className="flex-1 ml-[240px] transition-all duration-300">
        {children}
      </main>
      <CopilotPanel />
    </div>
  )
}
