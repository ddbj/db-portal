import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import ResultCard from "@/components/search/ResultCard"
import type { DbPortalHit } from "@/lib/api"

import { renderWithProviders } from "../../../helpers/providers"

const bioprojectHit: DbPortalHit = {
  identifier: "PRJDB12345",
  type: "bioproject",
  title: "Human Gut Microbiome",
  description: "Sample description for bioproject",
  organism: { identifier: "9606", name: "Homo sapiens" },
  datePublished: "2024-03-15",
  dateModified: null,
  dateCreated: null,
  url: "https://example.org/bioproject/PRJDB12345",
  sameAs: [{ identifier: "DRR000001", type: "sra-run", url: "https://example.org/sra/DRR000001" }],
  dbXrefs: null,
  status: "public",
  accessibility: "public-access",
  isPartOf: "bioproject",
  objectType: "BioProject",
  organization: [{ name: "DDBJ" }],
  publication: [],
  grant: [],
  externalLink: [],
}

const tradHit: DbPortalHit = {
  identifier: "AB123456",
  type: "trad",
  title: "Mus musculus mRNA for cancer-associated antigen",
  description: null,
  organism: { identifier: "10090", name: "Mus musculus" },
  datePublished: "2023-08-21",
  dateModified: null,
  dateCreated: null,
  url: "https://example.org/trad/AB123456",
  sameAs: null,
  dbXrefs: null,
  status: "public",
  accessibility: "public-access",
  isPartOf: "trad",
  division: "ROD",
  molecularType: null,
  sequenceLength: null,
}

const taxonomyHit: DbPortalHit = {
  identifier: "9606",
  type: "taxonomy",
  title: "Homo sapiens",
  description: null,
  organism: null,
  datePublished: null,
  dateModified: null,
  dateCreated: null,
  url: "https://example.org/taxonomy/9606",
  sameAs: null,
  dbXrefs: null,
  status: "public",
  accessibility: "public-access",
  isPartOf: "taxonomy",
  rank: "species",
  commonName: "human",
  japaneseName: "ヒト",
  lineage: null,
}

const sraSampleHit: DbPortalHit = {
  identifier: "DRS123456",
  type: "sra-sample",
  title: "RNA-seq sample",
  description: null,
  organism: { identifier: "9606", name: "Homo sapiens" },
  datePublished: "2024-01-01",
  dateModified: null,
  dateCreated: null,
  url: "https://example.org/sra/DRS123456",
  sameAs: null,
  dbXrefs: null,
  status: "public",
  accessibility: "public-access",
  isPartOf: "sra",
  organization: [],
  publication: [],
  libraryStrategy: null,
  librarySource: null,
  librarySelection: null,
  libraryLayout: null,
  platform: null,
  instrumentModel: null,
  analysisType: null,
}

const suppressedHit: DbPortalHit = {
  ...bioprojectHit,
  status: "suppressed",
  accessibility: "controlled-access",
}

describe("ResultCard", () => {

  it("renders L1 (identifier + publishedAt) and L2 title with external link", () => {
    renderWithProviders(<ResultCard hit={bioprojectHit} />)
    expect(screen.getByText("PRJDB12345")).toBeInTheDocument()
    expect(screen.getByText("2024-03-15")).toBeInTheDocument()
    const titleLink = screen.getByRole("link", { name: /Human Gut Microbiome/ })
    expect(titleLink.getAttribute("href")).toBe(bioprojectHit.url)
    expect(titleLink.getAttribute("target")).toBe("_blank")
  })

  it("shows BioProject metadata (objectType, organization)", () => {
    renderWithProviders(<ResultCard hit={bioprojectHit} />)
    expect(screen.getByText(/Project type: BioProject/)).toBeInTheDocument()
    expect(screen.getByText(/Organization: DDBJ/)).toBeInTheDocument()
  })

  it("shows Trad division", () => {
    renderWithProviders(<ResultCard hit={tradHit} />)
    expect(screen.getByText(/Division: ROD/)).toBeInTheDocument()
  })

  it("shows Taxonomy meta and hides organism (L4)", () => {
    renderWithProviders(<ResultCard hit={taxonomyHit} />)
    expect(screen.getByText(/Rank: species/)).toBeInTheDocument()
    expect(screen.getByText(/Common: human/)).toBeInTheDocument()
    expect(screen.getByText(/Japanese: ヒト/)).toBeInTheDocument()
  })

  it("shows no DB-specific meta for SRA sample without library/platform", () => {
    renderWithProviders(<ResultCard hit={sraSampleHit} />)
    expect(screen.queryByText(/Library:/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Platform:/)).not.toBeInTheDocument()
  })

  it("renders organism on L4 for non-taxonomy DBs", () => {
    renderWithProviders(<ResultCard hit={bioprojectHit} />)
    expect(screen.getByText(/Homo sapiens \(9606\)/)).toBeInTheDocument()
  })

  it("renders related objects from sameAs (L6)", () => {
    renderWithProviders(<ResultCard hit={bioprojectHit} />)
    expect(screen.getByText(/SRA: DRR000001/)).toBeInTheDocument()
  })

  it("hides description when it matches the title", () => {
    const hit: DbPortalHit = { ...tradHit, description: tradHit.title ?? null }
    renderWithProviders(<ResultCard hit={hit} />)
    const matches = screen.getAllByText(tradHit.title ?? "")
    expect(matches.length).toBe(1)
  })

  it("shows status badge for suppressed", () => {
    renderWithProviders(<ResultCard hit={suppressedHit} />)
    expect(screen.getByText("非推奨")).toBeInTheDocument()
  })

  it("shows accessibility badge for controlled-access", () => {
    renderWithProviders(<ResultCard hit={suppressedHit} />)
    expect(screen.getByText("アクセス制限")).toBeInTheDocument()
  })

  it("hides status / accessibility badges for public / public-access", () => {
    renderWithProviders(<ResultCard hit={bioprojectHit} />)
    expect(screen.queryByText("非推奨")).not.toBeInTheDocument()
    expect(screen.queryByText("アクセス制限")).not.toBeInTheDocument()
  })
})
