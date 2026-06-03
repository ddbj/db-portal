import type { LlmHealth } from "../../app/schemas/api-bff/llm"
import type { Logger } from "../lib/log"
import { callVllmModels, type LlmClient } from "./client"

const HEALTH_CHECK_INTERVAL_MS = 5 * 60_000
const INITIAL_DELAY_MS = 5_000

let active: LlmHealth = { status: "unset" }

export const getActiveHealth = (): LlmHealth => active

const setActiveHealth = (next: LlmHealth): void => {
  active = next
}

type HealthMonitor = {
  start: () => void
  stop: () => void
}

const evaluate = async (client: LlmClient): Promise<LlmHealth> => {
  if (!client.isAvailable) return { status: "unset" }
  const result = await callVllmModels(client)
  if (result.ok) return { status: "ok", model: client.model }

  return { status: "unreachable", reason: result.reason ?? "unknown" }
}

export const startHealthMonitor = (client: LlmClient, logger: Logger): HealthMonitor => {
  let pollTimer: ReturnType<typeof setInterval> | null = null
  let initialTimer: ReturnType<typeof setTimeout> | null = null

  const tick = async (): Promise<void> => {
    const next = await evaluate(client)
    if (next.status !== active.status) {
      logger.info("llm_health_transition", { from: active.status, to: next.status })
    }
    setActiveHealth(next)
  }

  const start = (): void => {
    if (pollTimer) return
    if (!client.isAvailable) {
      setActiveHealth({ status: "unset" })

      return
    }
    initialTimer = setTimeout(() => {
      void tick()
    }, INITIAL_DELAY_MS)
    initialTimer.unref?.()
    pollTimer = setInterval(() => {
      void tick()
    }, HEALTH_CHECK_INTERVAL_MS)
    pollTimer.unref?.()
  }

  const stop = (): void => {
    if (initialTimer) {
      clearTimeout(initialTimer)
      initialTimer = null
    }
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  return { start, stop }
}
