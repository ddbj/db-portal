import { fireEvent, render, screen, within } from "@testing-library/react"
import { useReducer } from "react"
import { I18nextProvider } from "react-i18next"
import { describe, expect, test } from "vitest"

import {
  createInitialSearchFacetState,
  FacetPanel,
  searchFacetReducer,
  type SearchFacetState,
} from "~/features/search"
import type { DbPortalFacets } from "~/lib/api"
import { createI18nInstance } from "~/lib/i18n"
import type { DbSlug } from "~/lib/search-scope"

const Harness = ({
  initial,
  db,
  facets,
}: {
  initial: SearchFacetState
  db: DbSlug | null
  facets: DbPortalFacets | null
}) => {
  const [state, dispatch] = useReducer(searchFacetReducer, initial)

  return <FacetPanel state={state} dispatch={dispatch} db={db} facets={facets} />
}

const renderPanel = (
  initial: SearchFacetState,
  facets: DbPortalFacets | null,
  db: DbSlug | null = null,
) => {
  const i18n = createI18nInstance("ja")

  return render(
    <I18nextProvider i18n={i18n}>
      <Harness initial={initial} db={db} facets={facets} />
    </I18nextProvider>,
  )
}

const organismFacets = (): DbPortalFacets =>
  ({
    organism: [
      { value: "9606", count: 20253242, label: "Homo sapiens" },
      { value: "10090", count: 1234567, label: "Mus musculus" },
    ],
  }) as DbPortalFacets

// The Taxonomy ID input (ariaLabel from search.facets.organismTaxId, ja "生物種 ID").
const taxIdBox = (): HTMLInputElement =>
  screen.getByRole("textbox", { name: "生物種 ID" }) as HTMLInputElement

describe("OrganismFacetSection tax id box", () => {
  test("checkboxSelectionFillsTaxIdBox", () => {
    renderPanel(createInitialSearchFacetState(), organismFacets())
    expect(taxIdBox().value).toBe("")
    fireEvent.click(screen.getByRole("checkbox", { name: /Homo sapiens/ }))
    expect(taxIdBox().value).toBe("9606")
  })

  test("typingTaxIdsChecksMatchingBuckets", () => {
    renderPanel(createInitialSearchFacetState(), organismFacets())
    fireEvent.change(taxIdBox(), { target: { value: "9606, 10090" } })
    expect(screen.getByRole("checkbox", { name: /Homo sapiens/ })).toBeChecked()
    expect(screen.getByRole("checkbox", { name: /Mus musculus/ })).toBeChecked()
  })

  test("typingMinorTaxIdKeepsSelectionAndShowsExtraRow", () => {
    renderPanel(createInitialSearchFacetState(), organismFacets())
    fireEvent.change(taxIdBox(), { target: { value: "99999" } })
    // 99999 is absent from the buckets but is surfaced as a checked row and kept
    // in the box, so a minor taxID can still be filtered on.
    expect(screen.getByRole("checkbox", { name: "99999" })).toBeChecked()
    expect(taxIdBox().value).toBe("99999")
  })

  test("trailingCommaNotClobberedWhileTyping", () => {
    renderPanel(createInitialSearchFacetState(), organismFacets())
    fireEvent.change(taxIdBox(), { target: { value: "9606, " } })
    // The selection commits "9606", but the raw editing buffer keeps the trailing
    // separator so the next id can be typed without the box rewriting itself.
    expect(taxIdBox().value).toBe("9606, ")
    expect(screen.getByRole("checkbox", { name: /Homo sapiens/ })).toBeChecked()
  })

  test("externalClearResetsBox", () => {
    renderPanel(
      { ...createInitialSearchFacetState(), facets: { organism: ["9606"] } },
      organismFacets(),
    )
    expect(taxIdBox().value).toBe("9606")
    const group = screen.getByTestId("facet-organism")
    fireEvent.click(within(group).getByText("解除"))
    expect(taxIdBox().value).toBe("")
  })
})
