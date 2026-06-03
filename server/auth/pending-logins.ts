type PendingLogin = {
  codeVerifier: string
  state: string
  returnTo: string
  createdAt: number
}

export const PENDING_TTL_MS = 10 * 60 * 1000
const PENDING_CLEANUP_INTERVAL_MS = 60_000

type Clock = () => number

export const createPendingLoginStore = (clock: Clock = Date.now) => {
  const store = new Map<string, PendingLogin>()

  const put = (entry: PendingLogin): void => {
    store.set(entry.state, entry)
  }

  const take = (state: string): PendingLogin | undefined => {
    const entry = store.get(state)
    if (!entry) return undefined
    store.delete(entry.state)
    if (clock() - entry.createdAt > PENDING_TTL_MS) return undefined

    return entry
  }

  const cleanup = (): void => {
    const now = clock()
    for (const [k, v] of store) {
      if (now - v.createdAt > PENDING_TTL_MS) store.delete(k)
    }
  }

  return { put, take, cleanup }
}

type PendingLoginStore = ReturnType<typeof createPendingLoginStore>

export const pendingLogins: PendingLoginStore = createPendingLoginStore()
const cleanupTimer = setInterval(() => pendingLogins.cleanup(), PENDING_CLEANUP_INTERVAL_MS)
cleanupTimer.unref?.()
