type LogLevel = "debug" | "info" | "warn" | "error"

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

// Key match is the first line of defense; compared case-insensitively so renamed
// casings (`Authorization`, `id_token`, `Set-Cookie`) cannot slip a credential
// through. Value-pattern redaction below is the backstop for tokens logged under
// an unanticipated key.
const REDACT_KEYS = new Set([
  "accesstoken",
  "refreshtoken",
  "idtoken",
  "id_token",
  "token",
  "bearer",
  "cookie",
  "set-cookie",
  "authorization",
  "apikey",
  "api_key",
  "password",
  "secret",
])

// Redact token-shaped substrings regardless of the surrounding key: JWTs
// (`eyJ…`.`…`.`…`) and `Bearer <token>` headers.
const redactString = (value: string): string =>
  value
    .replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, "Bearer [REDACTED]")
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[REDACTED_JWT]")

const redact = (value: unknown): unknown => {
  if (typeof value === "string") return redactString(value)
  if (value === null || typeof value !== "object") return value
  if (Array.isArray(value)) return value.map(redact)
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = REDACT_KEYS.has(k.toLowerCase()) ? "[REDACTED]" : redact(v)
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
