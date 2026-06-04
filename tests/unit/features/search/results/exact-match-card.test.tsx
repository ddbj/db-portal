import { screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"

import type { ExactMatch } from "~/features/search/results/exact-match"
import { ExactMatchCard } from "~/features/search/results/exact-match-card"

import { renderWithStub } from "../../../_helpers/render"

const match = (db: string, hit: Record<string, unknown>): ExactMatch =>
  ({ db, hit } as unknown as ExactMatch)

const renderCard = (m: ExactMatch) =>
  renderWithStub({
    routes: [{ path: "/", Component: () => <ExactMatchCard match={m} lang="ja" /> }],
    initialEntries: ["/"],
    lang: "ja",
  })

describe("ExactMatchCard", () => {
  test("ExactMatchCard_esHit_rendersDbChipIdentifierAndEntryLinkInLabeledRegion", () => {
    renderCard(match("sra", { identifier: "DRA000001", type: "sra-submission", title: "Whole genome" }))
    // The section carries no visible heading, only an accessible name.
    expect(screen.getByRole("region", { name: "完全一致" })).toBeInTheDocument()
    expect(screen.queryByText("完全一致")).toBeNull()
    // The owning DB leads the row as a chip.
    expect(screen.getByText("SRA")).toBeInTheDocument()
    expect(screen.getByText("DRA000001")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Whole genome/ }))
      .toHaveAttribute("href", "https://ddbj.nig.ac.jp/search/entry/sra-submission/DRA000001")
  })

  test("ExactMatchCard_taxonomyHit_showsDbChipAndLinksToTxSearchHost", () => {
    renderCard(match("taxonomy", { identifier: "9606", type: "taxonomy", title: "Homo sapiens" }))
    expect(screen.getByText("Taxonomy")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Homo sapiens/ }))
      .toHaveAttribute("href", "https://ddbj.nig.ac.jp/tx_search/9606?view=info")
  })

  test("ExactMatchCard_suppressedHit_showsSuppressedBadge", () => {
    renderCard(match("sra", { identifier: "DRA000001", type: "sra-submission", title: "X", status: "suppressed" }))
    expect(screen.getByText("Suppressed")).toBeInTheDocument()
  })

  test("ExactMatchCard_always_wrapsRowInBorderedSurfaceSection", () => {
    const { container } = renderCard(match("sra", { identifier: "DRA1", type: "sra-run" }))
    const section = container.querySelector("section")
    expect(section?.className).toContain("border-brand-light")
    expect(section?.className).toContain("bg-surface")
    // Clip the row's square hover fill to the rounded border so corners stay clean.
    expect(section?.className).toContain("overflow-hidden")
  })
})
