import { type FileEntry, type FlowStep, isNgsExpressionSource } from "~/schemas/submit"

import { ENGINE_MESSAGE_KEYS as MK } from "../messages"
import { makeStep, scopeOfEntries } from "../shared"

const isNgsExpression = (e: FileEntry): boolean =>
  e.fileTypeKind === "expression-matrix" && isNgsExpressionSource(e)

export const expressionDraSteps = (entries: readonly FileEntry[]): FlowStep[] => {
  const matched = entries.filter(isNgsExpression)
  if (matched.length === 0) return []

  return [
    makeStep("recipe-expression-dra", "dra", "recipe", scopeOfEntries(matched), [
      { kind: "info", messageKey: MK.expressionDraRaw },
    ]),
  ]
}
