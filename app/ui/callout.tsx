import type { ReactNode } from "react"

import { cn } from "./cn"

type CalloutTone = "info" | "warn" | "ok"

type CalloutProps = {
  children: ReactNode
  tone?: CalloutTone
  role?: "status" | "alert" | "note"
}

const toneClass: Record<CalloutTone, string> = {
  info: "bg-surface-subtle border-border-soft text-ink-mid",
  warn: "bg-warn-bg border-warn-border text-warn-fg",
  ok: "bg-ok-bg border-ok-border text-ok-fg",
}

export const Callout = ({ children, tone = "info", role }: CalloutProps) => (
  <div
    role={role}
    className={cn(
      "px-3.5 py-2.5 border rounded-card text-[13.5px] leading-relaxed",
      toneClass[tone],
    )}
  >
    {children}
  </div>
)
