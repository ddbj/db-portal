import { screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"

import type { DbHit } from "~/features/search/results/result-fields"
import { ResultRow, type ResultRowProps } from "~/features/search/results/result-row"

import { renderWithStub } from "../../_helpers/render"

const hit = (o: Record<string, unknown>): DbHit => o as unknown as DbHit

const bioproject = hit({
  type: "bioproject",
  identifier: "PRJDB19617",
  title: "Isolates from cattle in Japan",
  description: "Whole genome sequencing data of Escherichia coli from cattle in Japan.",
  organism: { identifier: "2", name: "Bacteria" },
  datePublished: "2024-12-24T01:46:02Z",
  projectType: ["Genome sequencing"],
  organization: [{ name: "MAFF lab" }, { name: "Other" }],
})

const sraExperiment = hit({
  type: "sra-experiment",
  identifier: "SRX10357816",
  title: null,
  description: null,
  organism: null,
  datePublished: "2021-04-18T13:01:39Z",
  libraryStrategy: ["WGS"],
  platform: "ILLUMINA",
  instrumentModel: ["Illumina HiSeq 4000"],
  organization: [],
})

const jgaDataset = hit({
  type: "jga-dataset",
  identifier: "JGAD000228",
  title: "Whole Genome Sequencing analysis of Japanese liver cancer",
  description: null,
  organism: { identifier: "9606", name: "Homo sapiens" },
  accessibility: "controlled-access",
  datePublished: null,
  datasetType: ["Whole genome sequencing"],
  organization: [{ name: "University of Tokyo" }],
})

const trad = hit({
  type: "trad",
  identifier: "U01317",
  title: "Human beta globin region on chromosome 11.",
  organism: { identifier: "9606", name: "Homo sapiens" },
  datePublished: "2008-10-16",
  molecularType: "DNA",
  division: "HUM",
  sequenceLength: 73308,
})

const taxonomy = hit({
  type: "taxonomy",
  identifier: "9606",
  title: "Homo sapiens",
  datePublished: null,
  rank: "species",
  commonName: "human",
  lineage: ["Homo", "Homininae", "Hominidae"],
})

const renderRow = (props: ResultRowProps) =>
  renderWithStub({
    routes: [{ path: "/", Component: () => <ResultRow {...props} /> }],
    initialEntries: ["/"],
    lang: props.lang,
  })

describe("ResultRow", () => {
  test("identifier renders as mono brand-deep text", () => {
    renderRow({ db: "bioproject", hit: bioproject, lang: "ja" })
    expect(screen.getByText("PRJDB19617")).toHaveClass("font-mono", "text-brand-deep", "font-semibold")
  })

  test("title is a black bold external link to the self-generated entry URL", () => {
    renderRow({ db: "bioproject", hit: bioproject, lang: "ja" })
    const link = screen.getByRole("link", { name: /Isolates from cattle in Japan/ })
    expect(link).toHaveAttribute("href", "https://ddbj.nig.ac.jp/search/entry/bioproject/PRJDB19617")
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", "noopener noreferrer")
    expect(link).toHaveClass("text-ink", "font-bold")
    expect(link).not.toHaveClass("text-brand")
  })

  test("missing title falls back to the identifier", () => {
    renderRow({ db: "sra", hit: sraExperiment, lang: "ja" })
    expect(screen.getByRole("link", { name: /^SRX10357816/ })).toBeInTheDocument()
  })

  test("datePublished is shown", () => {
    renderRow({ db: "bioproject", hit: bioproject, lang: "ja" })
    expect(screen.getByText(/2024/)).toBeInTheDocument()
  })

  test("date falls back to dateModified when datePublished is null", () => {
    renderRow({
      db: "bioproject",
      hit: hit({ ...bioproject, datePublished: null, dateModified: "2099-02-01", dateCreated: "2099-01-01" }),
      lang: "ja",
    })
    expect(screen.getByText(/2099/)).toBeInTheDocument()
  })

  test("controlled-access hits get a warning badge", () => {
    renderRow({ db: "jga", hit: jgaDataset, lang: "ja" })
    expect(screen.getByText("アクセス制限")).toBeInTheDocument()
  })

  test("suppressed hits get a Suppressed badge", () => {
    renderRow({ db: "bioproject", hit: hit({ ...bioproject, status: "suppressed" }), lang: "ja" })
    expect(screen.getByText("Suppressed")).toBeInTheDocument()
  })

  test("public hits show no Suppressed badge", () => {
    renderRow({ db: "bioproject", hit: hit({ ...bioproject, status: "public" }), lang: "ja" })
    expect(screen.queryByText("Suppressed")).toBeNull()
  })

  test("subtype badge shows the entity subtype for multi-subtype DBs", () => {
    renderRow({ db: "sra", hit: sraExperiment, lang: "ja" })
    expect(screen.getByText("experiment")).toBeInTheDocument()
  })

  test("description is clamped to two lines; absent description renders no paragraph", () => {
    const { container } = renderRow({ db: "bioproject", hit: bioproject, lang: "ja" })
    expect(container.querySelector("p.line-clamp-2")).toBeInTheDocument()
    const { container: c2 } = renderRow({ db: "sra", hit: sraExperiment, lang: "ja" })
    expect(c2.querySelector("p")).toBeNull()
  })

  test("organism renders as an italic pill where it carries signal", () => {
    renderRow({ db: "trad", hit: trad, lang: "ja" })
    expect(screen.getByText("Homo sapiens")).toHaveClass("italic", "text-brand-deep")
  })

  test("organism is suppressed for JGA (always Homo sapiens)", () => {
    renderRow({ db: "jga", hit: jgaDataset, lang: "ja" })
    expect(screen.queryByText("Homo sapiens")).toBeNull()
  })

  test("controlled vocab chips are mono with a border", () => {
    renderRow({ db: "trad", hit: trad, lang: "ja" })
    expect(screen.getByText("DNA")).toHaveClass("font-mono", "border")
  })

  test("free-form type chips are de-emphasized", () => {
    renderRow({ db: "jga", hit: jgaDataset, lang: "ja" })
    expect(screen.getByText("Whole genome sequencing")).toHaveClass("bg-surface-subtle", "text-ink-soft")
  })

  test("sequenceLength is formatted with bp", () => {
    renderRow({ db: "trad", hit: trad, lang: "ja" })
    expect(screen.getByText("73,308 bp")).toBeInTheDocument()
  })

  test("submitter shows the first organization", () => {
    renderRow({ db: "bioproject", hit: bioproject, lang: "ja" })
    expect(screen.getByText("MAFF lab")).toBeInTheDocument()
  })

  test("taxonomy renders rank badge, common name, and lineage", () => {
    renderRow({ db: "taxonomy", hit: taxonomy, lang: "ja" })
    expect(screen.getByText("species")).toBeInTheDocument()
    expect(screen.getByText("human")).toBeInTheDocument()
    expect(screen.getByText(/Homo › Homininae › Hominidae/)).toBeInTheDocument()
  })
})
