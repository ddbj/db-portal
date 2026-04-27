import type { DbPortalLightweightHit } from "@/lib/api/client"

export type DbId =
  | "bioproject"
  | "biosample"
  | "sra"
  | "trad"
  | "taxonomy"
  | "jga"
  | "gea"
  | "metabobank"

export const DB_ORDER = [
  "bioproject",
  "biosample",
  "sra",
  "trad",
  "taxonomy",
  "jga",
  "gea",
  "metabobank",
] as const satisfies readonly DbId[]

export interface DbMetadata {
  id: DbId
  displayName: string
  shortName: string
  description: string
  externalSearchUrl?: string
  insdcMember: boolean
}

export type FetchState = "loading" | "success" | "error"

export type ErrorKind =
  | "timeout"
  | "upstream_5xx"
  | "connection_refused"
  | "unknown"

export interface DbHitCount {
  dbId: DbId
  state: FetchState
  count: number | null
  error?: ErrorKind
  topHits?: readonly DbPortalLightweightHit[]
}
