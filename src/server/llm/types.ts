import { DB_ORDER, type DbId } from "@/types/db"

export type SuggestTask = "search-dsl"

export const SUGGEST_TASKS: readonly SuggestTask[] = ["search-dsl"] as const

export const isSuggestTask = (v: unknown): v is SuggestTask =>
  typeof v === "string" && (SUGGEST_TASKS as readonly string[]).includes(v)

export type Lang = "ja" | "en"

export const isLang = (v: unknown): v is Lang =>
  v === "ja" || v === "en"

export const isDbId = (v: unknown): v is DbId =>
  typeof v === "string" && (DB_ORDER as readonly string[]).includes(v)

export interface SuggestRequest {
  task: SuggestTask
  naturalText: string
  db: DbId | null
  currentQ: string | null
  lang: Lang
}

export interface SuggestSuccess {
  dsl: string
  model: string
  totalMs: number
  promptTokens: number
  completionTokens: number
}

export const SUGGEST_NO_DSL_MARKER = "__NO_DSL__"

export const NATURAL_TEXT_MAX_LEN = 1000
export const CURRENT_Q_MAX_LEN = 4000
