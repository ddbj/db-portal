export type LogLevel = "debug" | "info" | "warn" | "error"

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

const REDACT_KEYS = new Set([
  "accessToken",
  "refreshToken",
  "idToken",
  "cookie",
  "Cookie",
  "authorization",
  "Authorization",
])

const redact = (value: unknown): unknown => {
  if (value === null || typeof value !== "object") return value
  if (Array.isArray(value)) return value.map(redact)
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = REDACT_KEYS.has(k) ? "[REDACTED]" : redact(v)
  }

  return out
}

export const createLogger = (level: LogLevel) => {
  const threshold = LEVEL_RANK[level]
  const write = (lvl: LogLevel, msg: string, fields?: Record<string, unknown>) => {
    if (LEVEL_RANK[lvl] < threshold) return
    const entry = {
      ts: new Date().toISOString(),
      level: lvl,
      msg,
      ...(fields ? (redact(fields) as Record<string, unknown>) : {}),
    }
    process.stdout.write(`${JSON.stringify(entry)}\n`)
  }

  return {
    debug: (msg: string, fields?: Record<string, unknown>) => write("debug", msg, fields),
    info: (msg: string, fields?: Record<string, unknown>) => write("info", msg, fields),
    warn: (msg: string, fields?: Record<string, unknown>) => write("warn", msg, fields),
    error: (msg: string, fields?: Record<string, unknown>) => write("error", msg, fields),
  }
}

export type Logger = ReturnType<typeof createLogger>
