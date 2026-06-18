"use client"

import { useState, useRef, useEffect } from "react"
import { Bot, Send, X, MessageCircle, Sparkles } from "lucide-react"

interface CopilotPanelProps {
  apiBase?: string
}

export default function CopilotPanel({ apiBase = "http://localhost:8000" }: CopilotPanelProps) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([
    { role: "ai", text: "Gridlock AI online. I can analyze current hotspots, recommend patrol deployments, and answer tactical queries. How can I help?" },
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMsg = input
    setMessages((prev) => [...prev, { role: "user", text: userMsg }])
    setInput("")
    setLoading(true)

    try {
      const res = await fetch(`${apiBase}/api/copilot/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_message: userMsg }),
      })
      const data = await res.json()
      setMessages((prev) => [...prev, { role: "ai", text: data.response }])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "Connection error. Ensure the backend is running on localhost:8000 and Ollama is active." },
      ])
    } finally {
      setLoading(false)
    }
  }

  const quickActions = [
    "What are today's top 3 hotspots?",
    "Recommend patrol deployment",
    "Summarize congestion trends",
  ]

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 group"
        style={{
          background: "linear-gradient(135deg, #06b6d4, #8b5cf6)",
          boxShadow: "0 4px 24px rgba(6, 182, 212, 0.3)",
        }}
      >
        <MessageCircle className="w-6 h-6 text-white" />
        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-[#060a13]" />
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[380px] h-[520px] glass-card flex flex-col overflow-hidden animate-slide-in-up"
      style={{ boxShadow: "0 8px 48px rgba(0, 0, 0, 0.4)" }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/5"
        style={{ background: "linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(139, 92, 246, 0.1))" }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #06b6d4, #8b5cf6)" }}>
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Gridlock AI</h3>
            <p className="text-[10px] text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              Tactical Copilot
            </p>
          </div>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[#7a8ba8] hover:text-white hover:bg-white/5 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] p-3 rounded-xl text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-cyan-600/20 text-cyan-100 border border-cyan-500/20"
                  : "bg-white/[0.04] text-[#c8d4e6] border border-white/5"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white/[0.04] text-[#7a8ba8] p-3 rounded-xl text-sm border border-white/5">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span>Analyzing...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Quick Actions */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
          {quickActions.map((action, i) => (
            <button
              key={i}
              onClick={() => {
                setInput(action)
              }}
              className="text-[11px] text-cyan-400/80 px-2.5 py-1.5 rounded-lg bg-cyan-400/5 border border-cyan-400/10 hover:bg-cyan-400/10 hover:border-cyan-400/20 transition-all"
            >
              {action}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-white/5 flex gap-2">
        <input
          type="text"
          className="flex-1 bg-white/[0.03] border border-white/5 rounded-lg px-3 py-2 text-sm text-white placeholder-[#7a8ba8] focus:outline-none focus:border-cyan-400/30 transition-colors"
          placeholder="Ask Gridlock AI..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="w-9 h-9 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
          style={{ background: "linear-gradient(135deg, #06b6d4, #8b5cf6)" }}
        >
          <Send className="w-4 h-4 text-white" />
        </button>
      </form>
    </div>
  )
}
