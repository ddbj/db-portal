export const DB_SLUGS = [
  "trad",
  "sra",
  "bioproject",
  "biosample",
  "jga",
  "gea",
  "metabobank",
  "taxonomy",
] as const

export type DbSlug = typeof DB_SLUGS[number]

export const isDbSlug = (value: string): value is DbSlug =>
  (DB_SLUGS as readonly string[]).includes(value)

export const SCOPE_KEYS = ["all", ...DB_SLUGS] as const

export type ScopeKey = typeof SCOPE_KEYS[number]

export const isScopeKey = (value: string): value is ScopeKey =>
  (SCOPE_KEYS as readonly string[]).includes(value)

export const scopeKeyToDbSlug = (key: ScopeKey): DbSlug | null =>
  key === "all" ? null : key

export const dbSlugToScopeKey = (db: DbSlug | null): ScopeKey =>
  db === null ? "all" : db
