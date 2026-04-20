import { fireEvent, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import DetailOverview from "@/components/submit/DetailOverview"
import { DETAIL_OVERVIEWS } from "@/lib/mock-data"
import type { CardId } from "@/types/submit"

import { renderWithI18n } from "../../../helpers/i18n"

const ALL_CARD_IDS: CardId[] = [
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

describe("DetailOverview", () => {
  it.each(ALL_CARD_IDS)("renders %s overview with the correct number of branch rows", (cardId) => {
    const { container } = renderWithI18n(
      <DetailOverview cardId={cardId} onBranchClick={vi.fn()} />,
    )
    const overview = DETAIL_OVERVIEWS[cardId]
    const rows = container.querySelectorAll("tbody tr")
    expect(rows).toHaveLength(overview.branches.length)
  })

  it("calls onBranchClick with the first branch's leafId when clicked", () => {
    const onClick = vi.fn()
    renderWithI18n(
      <DetailOverview cardId="microbial" onBranchClick={onClick} />,
    )
    const buttons = screen.getAllByRole("button")
    expect(buttons.length).toBeGreaterThan(0)
    fireEvent.click(buttons[0]!)
    expect(onClick).toHaveBeenCalledWith("organelle-plasmid")
  })

  it("shows the 3-layer section for genome-type cards (microbial / eukaryote / metagenome)", () => {
    renderWithI18n(<DetailOverview cardId="microbial" onBranchClick={vi.fn()} />)
    expect(screen.getByText("3 層構造で登録")).toBeInTheDocument()
  })

  it("omits the 3-layer section for variation", () => {
    renderWithI18n(
      <DetailOverview cardId="variation" onBranchClick={vi.fn()} />,
    )
    expect(screen.queryByText("3 層構造で登録")).toBeNull()
  })

  it("renders external links with target='_blank' and rel='noopener noreferrer'", () => {
    const { container } = renderWithI18n(
      <DetailOverview cardId="microbial" onBranchClick={vi.fn()} />,
    )
    const links = container.querySelectorAll("a[target='_blank']")
    expect(links.length).toBeGreaterThan(0)
    for (const link of links) {
      expect(link.getAttribute("rel")).toContain("noopener")
      expect(link.getAttribute("rel")).toContain("noreferrer")
    }
  })
})
