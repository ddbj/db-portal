import { z } from "zod"

import { parseServerEnv } from "../lib/env"

export const SessionEntry = z.object({
  tokens: z.object({
    idToken: z.string().min(1),
  }),
  userInfo: z.object({
    sub: z.string().min(1),
    name: z.string().min(1),
    email: z.string().email().optional(),
  }),
  createdAt: z.number(),
  expiresAt: z.number(),
})

export type SessionEntry = z.infer<typeof SessionEntry>

// caller は tokens + userInfo だけ渡す。 store 内部で createdAt を刻み、
// 以後 sliding TTL で expiresAt を更新する。 timestamp は不変量なので caller の
// 責務にしない。
export type SessionInput = Pick<SessionEntry, "tokens" | "userInfo">

export const SESSION_TTL_MS = 30 * 60 * 1000
// 盗まれた session cookie の悪用期間を上界で切る。 idle sliding TTL を延ばし
// 続けても、 発行から absolute の hard limit を超えたら再 login を強制する。
export const SESSION_ABSOLUTE_MAX_MS = 12 * 60 * 60 * 1000
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000

type Clock = () => number

export const createSessionStore = (
  clock: Clock = Date.now,
  ttlMs: number = SESSION_TTL_MS,
  absoluteMaxMs: number = SESSION_ABSOLUTE_MAX_MS,
) => {
  const store = new Map<string, SessionEntry>()

  const isBeyondAbsolute = (createdAt: number, now: number): boolean =>
    now - createdAt > absoluteMaxMs

  const set = (sid: string, input: SessionInput): void => {
    const now = clock()
    store.set(sid, { ...input, createdAt: now, expiresAt: now + ttlMs })
  }

  const get = (sid: string): SessionEntry | undefined => {
    const e = store.get(sid)
    if (!e) return undefined
    const now = clock()
    if (e.expiresAt < now || isBeyondAbsolute(e.createdAt, now)) {
      store.delete(sid)

      return undefined
    }
    const refreshed: SessionEntry = { ...e, expiresAt: now + ttlMs }
    store.set(sid, refreshed)

    return refreshed
  }

  const remove = (sid: string): void => {
    store.delete(sid)
  }

  const cleanup = (): void => {
    const now = clock()
    for (const [sid, e] of store) {
      if (e.expiresAt < now || isBeyondAbsolute(e.createdAt, now)) store.delete(sid)
    }
  }

  return { set, get, remove, cleanup }
}

type SessionStore = ReturnType<typeof createSessionStore>

const env = parseServerEnv()
export const sessionStore: SessionStore = createSessionStore(
  Date.now,
  env.DB_PORTAL_AUTH_SESSION_TTL_SECONDS * 1000,
)

// tsx watch (dev) の HMR で setInterval 二重登録を避ける。 pending-logins と
// 同じパターン。
const TIMER_KEY = "__db_portal_session_store_cleanup_timer__"
const timerHost = globalThis as unknown as Record<string, NodeJS.Timeout | undefined>
if (timerHost[TIMER_KEY]) clearInterval(timerHost[TIMER_KEY])
const cleanupTimer = setInterval(() => sessionStore.cleanup(), CLEANUP_INTERVAL_MS)
cleanupTimer.unref?.()
timerHost[TIMER_KEY] = cleanupTimer
