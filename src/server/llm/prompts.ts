import searchQuerySystemJaRaw from "./prompts/search-query.md?raw"
import type { SuggestRequest } from "./types"

const SEARCH_QUERY_SYSTEM_JA = searchQuerySystemJaRaw.trimEnd()

export const getSystemPrompt = (
  task: SuggestRequest["task"],
  _lang: SuggestRequest["lang"],
): string => {
  if (task === "search-dsl") return SEARCH_QUERY_SYSTEM_JA

  throw new Error(`Unknown task: ${task as string}`)
}

export const buildUserPrompt = (req: SuggestRequest): string => {
  const dbLine = req.db === null ? "横断 (DB 未指定)" : req.db
  const currentLine = req.currentQ === null || req.currentQ.trim() === ""
    ? "(なし)"
    : req.currentQ.trim()

  return [
    "コンテキスト:",
    `- 選択中の DB: ${dbLine}`,
    `- 現在のクエリ (DSL): ${currentLine}`,
    "",
    "ユーザーの自然文入力:",
    req.naturalText.trim(),
    "",
    "要件: DSL 文字列のみを 1 行で出力。説明・前置き・補足は一切不要。翻訳できなければ `__NO_DSL__` のみを返す。",
  ].join("\n")
}
