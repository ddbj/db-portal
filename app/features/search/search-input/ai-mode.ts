import type { ParseNode } from "~/lib/api"

import { type AdvancedState, toAdvanced } from "../advanced"
import { applyProposalAst } from "../assistant"

export type AiMode = "append" | "new"

export type AiModeDefault = {
  mode: AiMode
  appendDisabled: boolean
}

// Count of rows the query builder currently holds: the free-text keyword row
// (0 or 1) plus the top-level structured children. Drives the "current builder
// N conditions" hint and the append/new default.
export const builderConditionCount = (keyword: string, state: AdvancedState): number =>
  (keyword.trim().length > 0 ? 1 : 0) + state.root.children.length

// Entering AI mode: default to "add to existing" when the builder holds
// anything, otherwise "generate new". With nothing to append to, append is
// disabled and "new" is the only choice.
export const resolveAiModeDefault = (conditionCount: number): AiModeDefault => {
  const appendDisabled = conditionCount <= 0

  return { mode: appendDisabled ? "new" : "append", appendDisabled }
}

// "append" grafts the proposed query onto the current structured conditions;
// "new" discards them and rebuilds from the proposal alone. The caller also
// clears the keyword for "new" so the builder reflects only the new query.
export const applyProposalByMode = (
  mode: AiMode,
  state: AdvancedState,
  ast: ParseNode,
): AdvancedState =>
  mode === "new" ? toAdvanced(ast) : applyProposalAst(state, ast)
