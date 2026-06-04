import { describe, expect, test } from "vitest"

import { proposalToInputs } from "~/features/search/search-input/apply-proposal"
import type { ParseNode } from "~/lib/api"

// AND of a structured leaf (organism_name) and a top-level free_text phrase —
// the shape "シングルセル RNA-seq のヒト試料" generates.
const organismAndFreeText: ParseNode = {
  op: "AND",
  rules: [
    { op: "contains", field: "organism_name", value: "Homo sapiens" },
    { op: "free_text", value: "single-cell RNA-seq", is_phrase: true },
  ],
}

const organismOnly: ParseNode = { op: "contains", field: "organism_name", value: "Homo sapiens" }

const conditionValues = (root: { children: readonly unknown[] }): string[] =>
  root.children
    .filter((child): child is { kind: "condition"; value: string } =>
      (child as { kind?: string }).kind === "condition")
    .map((child) => child.value)

describe("proposalToInputs", () => {
  test("newMode_routesPhraseToKeywordAndStructuredToBuilder", () => {
    const { keyword, root } = proposalToInputs(organismAndFreeText, "new", "discarded")
    // The phrase round-trips re-quoted (the box is parsed back as a phrase).
    expect(keyword).toBe('"single-cell RNA-seq"')
    // Only the structured remainder reaches the builder; the free_text leaf the
    // builder cannot render is taken out by the split, not dropped silently.
    expect(conditionValues(root)).toEqual(["Homo sapiens"])
  })

  test("newMode_proposalWithoutFreeText_clearsKeyword", () => {
    // new starts fresh: with no free text the box is emptied even if it held text.
    expect(proposalToInputs(organismOnly, "new", "cancer").keyword).toBe("")
  })

  test("appendMode_mergesExistingKeywordWithGeneratedFreeText", () => {
    // append keeps what the box held and folds in the newly generated free text.
    const { keyword } = proposalToInputs(organismAndFreeText, "append", "cancer")
    expect(keyword).toBe('cancer "single-cell RNA-seq"')
  })

  test("appendMode_proposalWithoutFreeText_keepsExistingKeyword", () => {
    expect(proposalToInputs(organismOnly, "append", "cancer").keyword).toBe("cancer")
  })

  test("appendMode_emptyExistingKeyword_yieldsOnlyGeneratedFreeText", () => {
    // No leading/trailing space when one side of the merge is blank.
    const { keyword } = proposalToInputs(organismAndFreeText, "append", "   ")
    expect(keyword).toBe('"single-cell RNA-seq"')
  })

  test("newMode_bareWordFreeText_isNotRequoted", () => {
    const bareWord: ParseNode = { op: "free_text", value: "cancer", is_phrase: false }
    const { keyword, root } = proposalToInputs(bareWord, "new", "")
    expect(keyword).toBe("cancer")
    // A free_text-only proposal leaves the builder empty.
    expect(root.children).toHaveLength(0)
  })
})
