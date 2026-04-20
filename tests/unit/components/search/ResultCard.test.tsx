import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import ResultCard from "@/components/search/ResultCard"
import type { SearchResult } from "@/types/search"

import { renderWithProviders } from "../../../helpers/providers"

const bioprojectResult: SearchResult = {
  dbId: "bioproject",
  identifier: "PRJDB12345",
  publishedAt: "2024-03-15",
  title: "Human Gut Microbiome",
  description: "Sample description for bioproject",
  organism: { name: "Homo sapiens", taxonomyId: 9606 },
  externalUrl: "https://example.org/bioproject/PRJDB12345",
  projectType: "Genome sequencing",
  organization: "DDBJ",
  relatedObjects: [{ dbId: "sra", identifier: "DRR000001" }],
}

const tradResult: SearchResult = {
  dbId: "trad",
  identifier: "AB123456",
  publishedAt: "2023-08-21",
  title: "Mus musculus mRNA for cancer-associated antigen",
  organism: { name: "Mus musculus", taxonomyId: 10090 },
  externalUrl: "https://example.org/trad/AB123456",
  division: "ROD",
}

const taxonomyResult: SearchResult = {
  dbId: "taxonomy",
  identifier: "9606",
  publishedAt: null,
  title: "Homo sapiens",
  externalUrl: "https://example.org/taxonomy/9606",
  rank: "species",
  commonName: "human",
  japaneseName: "ヒト",
}

const srraResult: SearchResult = {
  dbId: "sra",
  identifier: "DRR123456",
  publishedAt: "2024-01-01",
  title: "RNA-seq run",
  organism: { name: "Homo sapiens", taxonomyId: 9606 },
  externalUrl: "https://example.org/sra/DRR123456",
}

describe("ResultCard", () => {

  it("renders L1 (identifier + publishedAt) and L2 title with external link", () => {
    renderWithProviders(<ResultCard result={bioprojectResult} />)
    expect(screen.getByText("PRJDB12345")).toBeInTheDocument()
    expect(screen.getByText("2024-03-15")).toBeInTheDocument()
    const titleLink = screen.getByRole("link", { name: /Human Gut Microbiome/ })
    expect(titleLink.getAttribute("href")).toBe(bioprojectResult.externalUrl)
    expect(titleLink.getAttribute("target")).toBe("_blank")
  })

  it("shows BioProject metadata (projectType, organization)", () => {
    renderWithProviders(<ResultCard result={bioprojectResult} />)
    expect(screen.getByText(/Project type: Genome sequencing/)).toBeInTheDocument()
    expect(screen.getByText(/Organization: DDBJ/)).toBeInTheDocument()
  })

  it("shows Trad division", () => {
    renderWithProviders(<ResultCard result={tradResult} />)
    expect(screen.getByText(/Division: ROD/)).toBeInTheDocument()
  })

  it("shows Taxonomy meta and hides organism (L4)", () => {
    renderWithProviders(<ResultCard result={taxonomyResult} />)
    expect(screen.getByText(/Rank: species/)).toBeInTheDocument()
    expect(screen.getByText(/Common: human/)).toBeInTheDocument()
    expect(screen.getByText(/Japanese: ヒト/)).toBeInTheDocument()
    // Taxonomy: L4 organism line is suppressed
    expect(screen.queryByText(/Homo sapiens \(/)).not.toBeInTheDocument()
  })

  it("shows no DB-specific meta for SRA (NoExtraMeta)", () => {
    renderWithProviders(<ResultCard result={srraResult} />)
    expect(screen.queryByText(/Project type/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Division/)).not.toBeInTheDocument()
  })

  it("renders organism on L4 for non-taxonomy DBs", () => {
    renderWithProviders(<ResultCard result={bioprojectResult} />)
    expect(screen.getByText(/Homo sapiens \(9606\)/)).toBeInTheDocument()
  })

  it("renders related objects (L6)", () => {
    renderWithProviders(<ResultCard result={bioprojectResult} />)
    expect(screen.getByText(/SRA: DRR000001/)).toBeInTheDocument()
  })

  it("hides description when it matches the title", () => {
    const result: SearchResult = { ...tradResult, description: tradResult.title }
    renderWithProviders(<ResultCard result={result} />)
    // description はレンダーされるはずだが title と同一で非表示化される
    const matches = screen.getAllByText(tradResult.title)
    // L2 title のみ (description はレンダーされない)
    expect(matches.length).toBe(1)
  })
})
