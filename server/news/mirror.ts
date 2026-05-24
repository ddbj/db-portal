import type { ServerEnv } from "../lib/env"
import type { Logger } from "../lib/log"

export type NewsMirror = {
  start: () => void
  stop: () => void
}

export const startNewsMirror = (env: ServerEnv, logger: Logger): NewsMirror => {
  let timer: ReturnType<typeof setInterval> | null = null

  const tick = (): void => {
    logger.debug("news_mirror_tick", { repo: env.DB_PORTAL_NEWS_MIRROR_REPO })
  }

  const start = (): void => {
    if (timer) return
    const intervalMs = env.DB_PORTAL_NEWS_MIRROR_INTERVAL_SECONDS * 1000
    const initialDelayMs = 5_000
    setTimeout(tick, initialDelayMs).unref?.()
    timer = setInterval(tick, intervalMs)
    timer.unref?.()
  }

  const stop = (): void => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  return { start, stop }
}
