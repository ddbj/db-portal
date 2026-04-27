import type { DbHitCount, DbId } from "@/types/db"
import { DB_ORDER } from "@/types/db"

import type { DbPortalCount } from "./client"

export const mapTypeToDbId = (type: string): DbId => {
  if (type === "trad") return "trad"
  if (type === "taxonomy") return "taxonomy"
  if (type === "bioproject") return "bioproject"
  if (type === "biosample") return "biosample"
  if (type === "gea") return "gea"
  if (type === "metabobank") return "metabobank"
  if (type.startsWith("sra-")) return "sra"
  if (type.startsWith("jga-")) return "jga"

  return "trad"
}

export const apiCountsToHitCounts = (
  databases: readonly DbPortalCount[],
): readonly DbHitCount[] =>
  DB_ORDER.map((dbId) => {
    const entry = databases.find((d) => d.db === dbId)
    if (entry === undefined) {
      return { dbId, state: "error" as const, count: null, error: "unknown" as const }
    }
    if (entry.error !== null) {
      return {
        dbId,
        state: "error" as const,
        count: null,
        error: entry.error,
      }
    }

    const topHits = entry.hits ?? undefined

    return {
      dbId,
      state: "success" as const,
      count: entry.count ?? 0,
      ...(topHits !== undefined && { topHits }),
    }
  })
