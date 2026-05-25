import { z } from "zod"

import { parseServerEnv } from "../lib/env"

export const SessionEntry = z.object({
  tokens: z.object({
    accessToken: z.string().min(1),
    refreshToken: z.string().min(1),
    idToken: z.string().min(1),
    expiresAt: z.number(),
  }),
  userInfo: z.object({
    sub: z.string().min(1),
    name: z.string().min(1),
    email: z.string().email(),
  }),
  expiresAt: z.number(),
})

export type SessionEntry = z.infer<typeof SessionEntry>

export const SESSION_TTL_MS = 30 * 60 * 1000
export const CLEANUP_INTERVAL_MS = 5 * 60 * 1000

export type Clock = () => number

export const createSessionStore = (
  clock: Clock = Date.now,
  ttlMs: number = SESSION_TTL_MS,
) => {
  const store = new Map<string, SessionEntry>()

  const set = (sid: string, entry: SessionEntry): void => {
    store.set(sid, { ...entry, expiresAt: clock() + ttlMs })
  }

  const get = (sid: string): SessionEntry | undefined => {
    const e = store.get(sid)
    if (!e || e.expiresAt < clock()) {
      store.delete(sid)

      return undefined
    }
    const refreshed = { ...e, expiresAt: clock() + ttlMs }
    store.set(sid, refreshed)

    return refreshed
  }

  const remove = (sid: string): void => {
    store.delete(sid)
  }

  const cleanup = (): void => {
    const now = clock()
    for (const [sid, e] of store) {
      if (e.expiresAt < now) store.delete(sid)
    }
  }

  return { set, get, remove, cleanup }
}

export type SessionStore = ReturnType<typeof createSessionStore>

const env = parseServerEnv()
export const sessionStore: SessionStore = createSessionStore(
  Date.now,
  env.DB_PORTAL_AUTH_SESSION_TTL_SECONDS * 1000,
)
const cleanupTimer = setInterval(() => sessionStore.cleanup(), CLEANUP_INTERVAL_MS)
cleanupTimer.unref?.()
