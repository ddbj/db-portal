import type { DbHitCount } from "@/types/db"
import { DB_ORDER } from "@/types/db"

export const ALL_SUCCESS_HIT_COUNTS: readonly DbHitCount[] = DB_ORDER.map((dbId, idx) => ({
  dbId,
  state: "success",
  count: (idx + 1) * 1234,
}))

export const PARTIAL_FAILURE_HIT_COUNTS: readonly DbHitCount[] = DB_ORDER.map((dbId, idx) => {
  if (idx === 1 || idx === 4) {
    return { dbId, state: "error", count: null, error: "timeout" }
  }
  if (idx === 3 || idx === 6) {
    return { dbId, state: "error", count: null, error: "upstream_5xx" }
  }

  return { dbId, state: "success", count: (idx + 1) * 1000 }
})

export const ALL_ERROR_HIT_COUNTS: readonly DbHitCount[] = DB_ORDER.map((dbId) => ({
  dbId,
  state: "error",
  count: null,
  error: "upstream_5xx",
}))
