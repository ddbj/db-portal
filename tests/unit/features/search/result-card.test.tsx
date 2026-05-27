import { screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"

import { ResultCard, type ResultCardProps } from "~/features/search/results/result-card"
import type { DbSlug } from "~/features/search/types"
import type { DbSearchResponse } from "~/lib/api"

import { renderWithStub } from "../../_helpers/render"

type DbHit = DbSearchResponse["hits"][number]

const buildBioProjectHit = (overrides: Record<string, unknown> = {}): DbHit => ({
  identifier: "PRJDB1234",
  title: "Whole-genome sequencing of sample organism.",
  description: "Detailed description of the project.",
  organism: { identifier: "9606", name: "Homo sapiens" },
  datePublished: "2024-01-15T00:00:00Z",
  dateModified: null,
  dateCreated: null,
  url: null,
  sameAs: null,
  dbXrefs: null,
  status: "public",
  projectType: ["primary"],
  organization: [{ name: "DDBJ Center" }],
  publication: [],
  externalLink: [],
  ...overrides,
} as unknown as DbHit)

const buildSraHit = (overrides: Record<string, unknown> = {}): DbHit => ({
  identifier: "DRA000001",
  title: null,
  description: null,
  organism: { identifier: "9606", name: "Homo sapiens" },
  libraryStrategy: "WGS",
  datePublished: null,
  dateModified: null,
  dateCreated: "2024-02-01T00:00:00Z",
  ...overrides,
} as unknown as DbHit)

const buildTradHit = (overrides: Record<string, unknown> = {}): DbHit => ({
  identifier: "AB123456",
  title: "Sample trad title",
  molecularType: "genomic DNA",
  division: "PRI",
  sequenceLength: 12345,
  publication: [{ identifier: "12345", pmid: 12345 }],
  ...overrides,
} as unknown as DbHit)

const renderCard = (props: ResultCardProps) =>
  renderWithStub({
    routes: [{ path: "/", Component: () => <ResultCard {...props} /> }],
    initialEntries: ["/"],
    lang: props.lang === "en" ? "en" : "ja",
  })

const renderWithI18n = (db: DbSlug, hit: DbHit, lang: "ja" | "en" = "ja") =>
  renderCard({ db, hit, lang })

describe("ResultCard", () => {
  test("ResultCard_identifier_isRenderedAsMonoBrandText", () => {
    renderCard({ db: "bioproject", hit: buildBioProjectHit(), lang: "ja" })
    const id = screen.getByText("PRJDB1234")
    expect(id).toHaveClass("font-mono", "text-brand-deep", "font-semibold")
  })

  test("ResultCard_titleAsLink_pointsToDdbjEntry", () => {
    renderCard({
      db: "bioproject",
      hit: buildBioProjectHit({ identifier: "PRJDB99/x" }),
      lang: "ja",
    })
    const link = screen.getByRole("link", { name: /Whole-genome sequencing/ })
    expect(link).toHaveAttribute("href", "https://ddbj.nig.ac.jp/search/entry/bioproject/PRJDB99%2Fx")
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", "noopener noreferrer")
  })

  test("ResultCard_missingTitle_fallsBackToIdentifier", () => {
    renderCard({
      db: "sra",
      hit: buildSraHit({ title: null }),
      lang: "ja",
    })
    const link = screen.getByRole("link", { name: "DRA000001" })
    expect(link).toBeInTheDocument()
  })

  test("ResultCard_datePublished_isFormattedJa", () => {
    renderCard({
      db: "bioproject",
      hit: buildBioProjectHit({ datePublished: "2024-01-15T00:00:00Z" }),
      lang: "ja",
    })
    expect(screen.getByText(/2024/)).toBeInTheDocument()
  })

  test("ResultCard_dateOrderFallback_picksDateCreatedWhenPublishedAndModifiedAreNull", () => {
    renderCard({
      db: "sra",
      hit: buildSraHit({ dateCreated: "2024-02-01T00:00:00Z" }),
      lang: "ja",
    })
    expect(screen.getByText(/2024/)).toBeInTheDocument()
  })

  test("ResultCard_organismTag_isRendered", () => {
    renderCard({ db: "bioproject", hit: buildBioProjectHit(), lang: "ja" })
    expect(screen.getByText("Homo sapiens")).toBeInTheDocument()
  })

  test("ResultCard_sraLibraryStrategy_isShownAsTag", () => {
    renderCard({ db: "sra", hit: buildSraHit(), lang: "ja" })
    expect(screen.getByText("WGS")).toBeInTheDocument()
  })

  test("ResultCard_bioProjectProjectType_isShownAsTag", () => {
    renderCard({
      db: "bioproject",
      hit: buildBioProjectHit({ projectType: "umbrella" }),
      lang: "ja",
    })
    expect(screen.getByText("umbrella")).toBeInTheDocument()
  })

  test("ResultCard_tradMolecularType_isShownAsTag", () => {
    renderCard({ db: "trad", hit: buildTradHit(), lang: "ja" })
    expect(screen.getByText("genomic DNA")).toBeInTheDocument()
    expect(screen.getByText("PRI")).toBeInTheDocument()
  })

  test("ResultCard_tradSequenceLength_isFormattedWithBpInFacet", () => {
    renderWithI18n("trad", buildTradHit({ sequenceLength: 12345 }))
    expect(screen.getByText(/12,345 bp/)).toBeInTheDocument()
  })

  test("ResultCard_description_appliesLineClamp3", () => {
    const { container } = renderCard({
      db: "bioproject",
      hit: buildBioProjectHit(),
      lang: "ja",
    })
    const p = container.querySelector("p.text-fs-body-sm")
    expect(p).toHaveClass("line-clamp-3", "text-ink-mid")
  })

  test("ResultCard_emptyDescription_doesNotRenderParagraph", () => {
    const { container } = renderCard({
      db: "sra",
      hit: buildSraHit({ description: null }),
      lang: "ja",
    })
    expect(container.querySelector("p.text-fs-body-sm")).toBeNull()
  })

  test("ResultCard_articleWrapper_appliesCardClass", () => {
    const { container } = renderCard({
      db: "bioproject",
      hit: buildBioProjectHit(),
      lang: "ja",
    })
    const article = container.querySelector("article")
    expect(article).toHaveClass(
      "rounded-card",
      "border",
      "border-border-soft",
      "bg-surface",
      "p-4",
      "flex",
      "flex-col",
      "gap-2.5",
    )
  })

  test("ResultCard_publicationFacet_showsCount", () => {
    renderWithI18n("trad", buildTradHit({
      publication: [
        { identifier: "1" },
        { identifier: "2" },
      ],
    }))
    expect(screen.getByText("2")).toBeInTheDocument()
  })

  test("ResultCard_sameAsFacet_joinsUpToThree", () => {
    renderWithI18n("bioproject", buildBioProjectHit({
      sameAs: [
        { identifier: "A1", type: "x", url: "https://example.com/A1" },
        { identifier: "B2", type: "x", url: "https://example.com/B2" },
        { identifier: "C3", type: "x", url: "https://example.com/C3" },
        { identifier: "D4", type: "x", url: "https://example.com/D4" },
      ],
    }))
    expect(screen.getByText(/A1, B2, C3$/)).toBeInTheDocument()
  })

  test("ResultCard_submitterFacet_showsFirstOrganization", () => {
    renderWithI18n("bioproject", buildBioProjectHit({
      organization: [{ name: "DDBJ Center" }, { name: "Other" }],
    }))
    expect(screen.getByText("DDBJ Center")).toBeInTheDocument()
  })

  test("ResultCard_noFacets_doesNotRenderDl", () => {
    const { container } = renderCard({
      db: "sra",
      hit: buildSraHit({ organization: [], publication: [], sameAs: [] }),
      lang: "ja",
    })
    expect(container.querySelector("dl")).toBeNull()
  })
})
