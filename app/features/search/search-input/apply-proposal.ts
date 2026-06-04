import type { ParseNode } from "~/lib/api"

import { type AdvancedGroup, toAdvanced } from "../advanced"
import { splitFreeText } from "../ast"
import type { AiMode } from "./ai-mode"

// Split an applied AI proposal into the two halves the unified search input
// holds: the keyword box (top-level free text) and the Advanced builder (the
// structured remainder). Mirrors the `?q=` pre-fill (`splitFreeText` → keyword,
// `toAdvanced` → builder); the builder cannot render a free_text leaf, so
// without this split the generated keyword would be dropped entirely.
//
// `new` replaces the keyword with the proposal's free text (empty when there is
// none); `append` keeps the existing keyword — the model is sent the builder AST
// only, never the box — and folds in any newly generated free text.
export const proposalToInputs = (
  proposal: ParseNode,
  mode: AiMode,
  currentKeyword: string,
): { keyword: string; root: AdvancedGroup } => {
  const { keyword: proposalKeyword, rest } = splitFreeText(proposal)
  const keyword = mode === "new"
    ? proposalKeyword
    : [currentKeyword, proposalKeyword].map((part) => part.trim()).filter(Boolean).join(" ")

  return { keyword, root: toAdvanced(rest).root }
}
