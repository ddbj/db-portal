import { screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"

import { CrossResults } from "~/features/search/results/cross-results"
import type { CrossSearchResponse } from "~/lib/api"

import { renderWithStub } from "../../_helpers/render"

const response = (databases: unknown[]): CrossSearchResponse =>
  ({ databases } as unknown as CrossSearchResponse)

const dbEntry = (
  db: string,
  hits: Record<string, unknown>[],
  overrides: { count?: number | null; error?: string | null; unavailableFields?: string[] | null } = {},
) => ({ db, count: hits.length, error: null, hits, ...overrides })

const renderCross = (databases: unknown[]) =>
  renderWithStub({
    routes: [{ path: "/", Component: () => <CrossResults q="human" response={response(databases)} /> }],
    initialEntries: ["/"],
    lang: "ja",
  })

describe("CrossResults top-hit links", () => {
  test("trad uses the getentry host, not the search/entry path", () => {
    renderCross([dbEntry("trad", [{ identifier: "U01317", type: "trad", title: "Trad entry" }])])
    expect(screen.getByRole("link", { name: "U01317" }))
      .toHaveAttribute("href", "https://getentry.ddbj.nig.ac.jp/getentry?database=ddbj&accession_number=U01317")
  })

  test("taxonomy uses the tx_search host", () => {
    renderCross([dbEntry("taxonomy", [{ identifier: "9606", type: "taxonomy", title: "Homo sapiens" }])])
    expect(screen.getByRole("link", { name: "9606" }))
      .toHaveAttribute("href", "https://ddbj.nig.ac.jp/tx_search/9606?view=info")
  })

  test("ES hits use the search/entry path keyed by fine-grained type", () => {
    renderCross([dbEntry("sra", [{ identifier: "DRZ012283", type: "sra-analysis", title: "SRA analysis" }])])
    expect(screen.getByRole("link", { name: "DRZ012283" }))
      .toHaveAttribute("href", "https://ddbj.nig.ac.jp/search/entry/sra-analysis/DRZ012283")
  })

  test("top-hit date falls back to dateModified when datePublished is null", () => {
    renderCross([dbEntry("bioproject", [{
      identifier: "PRJDB1",
      type: "bioproject",
      title: "Project",
      datePublished: null,
      dateModified: "2099-02-01",
    }])])
    expect(screen.getByText("2099-02-01")).toBeInTheDocument()
  })
})

describe("CrossResults card order", () => {
  test("cards render in DDBJ-first display order regardless of API order", () => {
    renderCross([
      dbEntry("metabobank", []),
      dbEntry("gea", []),
      dbEntry("taxonomy", []),
      dbEntry("jga", []),
      dbEntry("sra", []),
      dbEntry("biosample", []),
      dbEntry("bioproject", []),
      dbEntry("trad", []),
    ])
    const order = screen.getAllByTestId("db-card").map((el) => el.getAttribute("data-db"))
    expect(order).toEqual([
      "trad",
      "bioproject",
      "biosample",
      "sra",
      "jga",
      "taxonomy",
      "gea",
      "metabobank",
    ])
  })
})

describe("CrossResults aggregation error", () => {
  test("a database error shows the temporary notice, no '?', and a reload control", () => {
    renderCross([dbEntry("taxonomy", [], { count: null, error: "timeout" })])
    expect(screen.getByText("一時的に集計できませんでした")).toBeInTheDocument()
    expect(screen.queryByText("?")).toBeNull()
    expect(screen.getByRole("button", { name: "再読み込み" })).toBeInTheDocument()
  })

  test("a successful database shows the formatted count and no error affordances", () => {
    renderCross([dbEntry("sra", [], { count: 1234 })])
    expect(screen.getByText("1,234")).toBeInTheDocument()
    expect(screen.queryByText("一時的に集計できませんでした")).toBeNull()
    expect(screen.queryByRole("button", { name: "再読み込み" })).toBeNull()
  })
})

describe("CrossResults field-not-applicable", () => {
  test("a field_not_applicable arm shows 対象外 naming the offending filter, no error / reload / '?' / top hits", () => {
    renderCross([dbEntry("taxonomy", [], {
      count: null,
      error: "field_not_applicable",
      unavailableFields: ["publication"],
    })])
    expect(screen.getByText("対象外")).toBeInTheDocument()
    // The DSL field is resolved to its registry label, prefixed with "filter:".
    expect(screen.getByText("filter:Publication に未対応")).toBeInTheDocument()
    // Not an upstream failure: no temporary notice, no reload control, no "?".
    expect(screen.queryByText("一時的に集計できませんでした")).toBeNull()
    expect(screen.queryByRole("button", { name: "再読み込み" })).toBeNull()
    expect(screen.queryByText("?")).toBeNull()
    // The backend was never queried for this arm, so no top-hits section.
    expect(screen.queryByText("上位ヒット")).toBeNull()
  })

  test("multiple unavailable fields are joined and resolved to labels", () => {
    renderCross([dbEntry("taxonomy", [], {
      count: null,
      error: "field_not_applicable",
      unavailableFields: ["publication", "date_modified"],
    })])
    expect(screen.getByText("filter:Publication / Date Last Published に未対応")).toBeInTheDocument()
  })
})
