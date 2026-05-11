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

const bioprojectWithRelevanceHit: DbPortalHit = {
  ...bioprojectHit,
  relevance: ["Medical", "Agricultural"],
}

const biosampleHit: DbPortalHit = {
  identifier: "SAMD00000001",
  type: "biosample",
  title: "Bacterial isolate sample",
  description: null,
  organism: { identifier: "562", name: "Escherichia coli" },
  datePublished: "2024-02-01",
  dateModified: null,
  dateCreated: null,
  url: "https://example.org/biosample/SAMD00000001",
  sameAs: null,
  dbXrefs: null,
  status: "public",
  accessibility: "public-access",
  isPartOf: "biosample",
  organization: [{ name: "Lab X" }],
  package: null,
  model: null,
  host: "Homo sapiens",
  strain: "K12",
  isolate: "Iso1",
  geoLocName: "Japan",
  collectionDate: "2023-12-01",
}

const biosampleHitNoSecondary: DbPortalHit = {
  identifier: "SAMD00000002",
  type: "biosample",
  title: "Sample without secondary fields",
  description: null,
  organism: null,
  datePublished: null,
  dateModified: null,
  dateCreated: null,
  url: "https://example.org/biosample/SAMD00000002",
  sameAs: null,
  dbXrefs: null,
  status: "public",
  accessibility: "public-access",
  isPartOf: "biosample",
  organization: [],
  package: null,
  model: null,
}

const sraExperimentHit: DbPortalHit = {
  identifier: "DRX123456",
  type: "sra-experiment",
  title: "RNA-seq experiment",
  description: null,
  organism: { identifier: "9606", name: "Homo sapiens" },
  datePublished: "2024-01-01",
  dateModified: null,
  dateCreated: null,
  url: "https://example.org/sra/DRX123456",
  sameAs: null,
  dbXrefs: null,
  status: "public",
  accessibility: "public-access",
  isPartOf: "sra",
  organization: [],
  publication: [],
  libraryStrategy: ["RNA-Seq"],
  librarySource: null,
  librarySelection: null,
  libraryLayout: null,
  platform: null,
  instrumentModel: null,
  analysisType: null,
  libraryName: "lib_001",
  libraryConstructionProtocol: "TruSeq RNA Sample Prep",
  geoLocName: "Japan",
  collectionDate: "2023-11-01",
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

describe("ResultCard secondary meta (Tier 3 ヒット理由)", () => {
  it("BioProject: relevance を comma 区切りで表示", () => {
    renderWithProviders(<ResultCard hit={bioprojectWithRelevanceHit} />)
    expect(screen.getByText(/Relevance: Medical, Agricultural/)).toBeInTheDocument()
  })

  it("BioProject: relevance が空配列なら secondary meta は出さない", () => {
    const hit: DbPortalHit = { ...bioprojectHit, relevance: [] }
    renderWithProviders(<ResultCard hit={hit} />)
    expect(screen.queryByText(/Relevance:/)).not.toBeInTheDocument()
  })

  it("BioSample: host / strain / isolate / geo / collection を `·` 区切りで表示", () => {
    renderWithProviders(<ResultCard hit={biosampleHit} />)
    expect(
      screen.getByText(
        /Host: Homo sapiens · Strain: K12 · Isolate: Iso1 · Geo: Japan · Collection: 2023-12-01/,
      ),
    ).toBeInTheDocument()
  })

  it("BioSample: secondary field なし (omit) なら secondary meta は出さない", () => {
    renderWithProviders(<ResultCard hit={biosampleHitNoSecondary} />)
    expect(screen.queryByText(/Host:/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Strain:/)).not.toBeInTheDocument()
  })

  it("SRA experiment: library name / construction protocol / geo / collection を表示", () => {
    renderWithProviders(<ResultCard hit={sraExperimentHit} />)
    expect(
      screen.getByText(
        /Library name: lib_001 · Construction protocol: TruSeq RNA Sample Prep · Geo: Japan · Collection: 2023-11-01/,
      ),
    ).toBeInTheDocument()
  })

  it("SRA sample (secondary field なし) は secondary meta が出ない", () => {
    renderWithProviders(<ResultCard hit={sraSampleHit} />)
    expect(screen.queryByText(/Library name:/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Construction protocol:/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Geo:/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Collection:/)).not.toBeInTheDocument()
  })

  it("BioSample: host が string[] でも `, ` 区切りで表示 (api 実応答 array 対応)", () => {
    const hit = {
      ...biosampleHit,
      host: ["Homo sapiens", "Mus musculus"] as unknown as string,
    }
    renderWithProviders(<ResultCard hit={hit} />)
    expect(
      screen.getByText(/Host: Homo sapiens, Mus musculus/),
    ).toBeInTheDocument()
  })

  it("BioSample: host が空配列なら Host を出さない", () => {
    const hit = {
      ...biosampleHit,
      host: [] as unknown as string,
      strain: null,
      isolate: null,
      geoLocName: null,
      collectionDate: null,
    }
    renderWithProviders(<ResultCard hit={hit} />)
    expect(screen.queryByText(/Host:/)).not.toBeInTheDocument()
  })

  it("BioSample: host 配列内の null/empty を skip して残りを join", () => {
    const hit = {
      ...biosampleHit,
      host: ["Homo sapiens", "", null] as unknown as string,
    }
    renderWithProviders(<ResultCard hit={hit} />)
    expect(screen.getByText(/Host: Homo sapiens/)).toBeInTheDocument()
  })
})
