import { freeText } from "./factory"
import type { FreeTextNode } from "./types"

export const qStringToAst = (
  input: string | null | undefined,
): FreeTextNode | null => {
  if (input === null || input === undefined) return null
  const trimmed = input.trim()
  if (trimmed === "") return null

  return freeText(trimmed)
}
