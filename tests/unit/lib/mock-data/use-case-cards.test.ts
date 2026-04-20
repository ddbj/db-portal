import { describe, expect, it } from "vitest"

import { USE_CASE_CARDS } from "@/lib/mock-data/use-case-cards"
import type { CardId } from "@/types/submit"

describe("USE_CASE_CARDS (mock-data)", () => {

  it("contains exactly 9 cards", () => {
    expect(USE_CASE_CARDS).toHaveLength(9)
  })

  it("has unique card ids", () => {
    const ids = USE_CASE_CARDS.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("covers all CardId variants", () => {
    const expected: CardId[] = [
      "microbial",
      "eukaryote",
      "metagenome",
      "expression",
      "variation",
      "proteomics",
      "metabolomics",
      "small-sequence",
      "human-restricted",
    ]
    const actual = USE_CASE_CARDS.map((c) => c.id).slice().sort()
    expect(actual).toEqual(expected.slice().sort())
  })

  it("has order = 1..9 with no duplicates", () => {
    const orders = USE_CASE_CARDS.map((c) => c.order).slice().sort((a, b) => a - b)
    expect(orders).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
  })

  it("display order in array matches the order field (sorted ascending)", () => {
    const sortedByOrder = [...USE_CASE_CARDS].sort((a, b) => a.order - b.order)
    expect(USE_CASE_CARDS.map((c) => c.id)).toEqual(sortedByOrder.map((c) => c.id))
  })

  it("non-empty iconName for every card", () => {
    for (const card of USE_CASE_CARDS) {
      expect(card.iconName).not.toBe("")
    }
  })

  it("titleKey / descriptionKey follow the routes.submit.cards.<id>.<field> pattern", () => {
    for (const card of USE_CASE_CARDS) {
      expect(card.titleKey).toBe(`routes.submit.cards.${card.id}.title`)
      expect(card.descriptionKey).toBe(`routes.submit.cards.${card.id}.description`)
    }
  })

  it("sum of leafCount equals 31 (covers all leaves)", () => {
    const total = USE_CASE_CARDS.reduce((sum, c) => sum + c.leafCount, 0)
    expect(total).toBe(31)
  })
})
