type PendingLogin = {
  codeVerifier: string
  state: string
  nonce: string
  returnTo: string
  createdAt: number
}

export const PENDING_TTL_MS = 10 * 60 * 1000
const PENDING_CLEANUP_INTERVAL_MS = 60_000
// `/api/auth/login` は無認証 GET。 cap が無いと TTL (10 分) 内に攻撃者が
// 大量に新規 entry を積み上げ BFF メモリを膨らませられる。 cap 到達時は
// FIFO で最古 entry を捨てて新規を受け入れる (古い entry は使われない可能性が
// 高く、 active な login flow を進行中のユーザーを優先する)。
export const PENDING_MAX_ENTRIES = 10_000

type Clock = () => number

export const createPendingLoginStore = (clock: Clock = Date.now) => {
  const store = new Map<string, PendingLogin>()

  const evictOldestIfFull = (): void => {
    if (store.size < PENDING_MAX_ENTRIES) return
    // Map は insertion order を保つので、 先頭が最古 entry。
    const oldestKey = store.keys().next().value
    if (oldestKey !== undefined) store.delete(oldestKey)
  }

  const put = (entry: PendingLogin): void => {
    evictOldestIfFull()
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

  const size = (): number => store.size

  return { put, take, cleanup, size }
}

type PendingLoginStore = ReturnType<typeof createPendingLoginStore>

export const pendingLogins: PendingLoginStore = createPendingLoginStore()
const cleanupTimer = setInterval(() => pendingLogins.cleanup(), PENDING_CLEANUP_INTERVAL_MS)
cleanupTimer.unref?.()
