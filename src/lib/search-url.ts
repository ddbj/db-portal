import type { DbId } from "@/types/db"

export const ALL_DB_VALUE = "all" as const

export type DbSelectValue = typeof ALL_DB_VALUE | DbId

export interface BuildSearchUrlParams {
  q: string
  db: DbSelectValue
}

export const buildSearchUrl = ({ q, db }: BuildSearchUrlParams): string => {
  const params = new URLSearchParams()
  const trimmedQ = q.trim()
  if (trimmedQ !== "") params.set("q", trimmedQ)
  if (db !== ALL_DB_VALUE) params.set("db", db)
  const query = params.toString()

  return query === "" ? "/search" : `/search?${query}`
}
