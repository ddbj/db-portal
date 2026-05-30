import type { ParseNode } from "~/lib/api"
import type { AssistantProposal } from "~/schemas/api-bff/llm"

import {
  type AdvancedNode,
  type AdvancedState,
  createGroup,
  toAdvanced,
} from "../advanced"

// Lift the flat proposal contract (combinator + scalar/range conditions) into a
// ParseNode AST so the renderer and the builder share one query-tree shape. A
// lone condition is a bare leaf; multiple conditions join under the combinator.
export const assistantProposalToAst = (proposal: AssistantProposal): ParseNode => {
  const leaves: ParseNode[] = proposal.conditions.map((condition) =>
    condition.op === "between"
      ? { op: "between", field: condition.field, from: condition.from, to: condition.to }
      : { op: condition.op, field: condition.field, value: condition.value })
  const [first] = leaves
  if (leaves.length === 1 && first !== undefined) return first

  return { op: proposal.combinator, rules: leaves }
}

// Graft a proposed query onto the current builder state ("add to existing").
// A multi-clause proposal keeps its own combinator only while it stays grouped:
// grafting its children bare lets them inherit the destination root's combinator
// (an AND proposal would silently become OR under a root toggled to OR). So
// flatten only when the proposed and destination combinators already agree;
// otherwise wrap the proposal in its own self-contained group. A lone clause has
// no combinator meaning and always flattens in.
export const applyProposalAst = (state: AdvancedState, ast: ParseNode): AdvancedState => {
  const proposed = toAdvanced(ast).root
  if (proposed.children.length === 0) return state
  const combinatorDiffers = proposed.innerCombinator !== state.root.innerCombinator
  const grafted: AdvancedNode[] =
    proposed.children.length > 1 && combinatorDiffers
      ? [createGroup({ combinator: "AND", innerCombinator: proposed.innerCombinator }, proposed.children)]
      : proposed.children

  return { root: { ...state.root, children: [...state.root.children, ...grafted] } }
}
