import { fireEvent, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import ActiveFilterChips from "@/components/search/ActiveFilterChips"
import { sidebarFieldsForDb } from "@/lib/sidebar-fields"
import type { SidebarState } from "@/lib/sidebar-state-types"

import { renderWithProviders } from "../../../helpers/providers"

const bioprojectFields = sidebarFieldsForDb("bioproject", null)

const emptyState: SidebarState = {
  facets: {},
  keywords: {},
  dateRange: null,
  subtype: null,
  freeText: "",
}

describe("ActiveFilterChips", () => {
  it("renders nothing when no filters are applied", () => {
    const { container } = renderWithProviders(
      <ActiveFilterChips
        state={emptyState}
        fields={bioprojectFields}
        onChange={vi.fn()}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it("renders a facet chip with prefix + value", () => {
    const state: SidebarState = {
      ...emptyState,
      facets: { organism: ["Homo sapiens"] },
    }
    renderWithProviders(
      <ActiveFilterChips
        state={state}
        fields={bioprojectFields}
        onChange={vi.fn()}
      />,
    )
    expect(screen.getByText(/生物種: Homo sapiens/)).toBeInTheDocument()
  })

  it("renders a date chip with axis-specific prefix", () => {
    const state: SidebarState = {
      ...emptyState,
      dateRange: {
        axis: "date_published",
        from: "2020-01-01",
        to: "2024-12-31",
      },
    }
    renderWithProviders(
      <ActiveFilterChips
        state={state}
        fields={bioprojectFields}
        onChange={vi.fn()}
      />,
    )
    expect(
      screen.getByText(/公開日: 2020-01-01 〜 2024-12-31/),
    ).toBeInTheDocument()
  })

  it("renders a date chip with from-only format", () => {
    const state: SidebarState = {
      ...emptyState,
      dateRange: { axis: "date_published", from: "2020-01-01", to: "" },
    }
    renderWithProviders(
      <ActiveFilterChips
        state={state}
        fields={bioprojectFields}
        onChange={vi.fn()}
      />,
    )
    expect(screen.getByText(/公開日: 2020-01-01 以降/)).toBeInTheDocument()
  })

  it("invokes onChange with the chip's nextState when × is clicked", () => {
    const onChange = vi.fn()
    const state: SidebarState = {
      ...emptyState,
      facets: { organism: ["Homo sapiens", "Mus musculus"] },
    }
    renderWithProviders(
      <ActiveFilterChips
        state={state}
        fields={bioprojectFields}
        onChange={onChange}
      />,
    )
    const removeButtons = screen.getAllByRole("button", { name: /削除/ })
    fireEvent.click(removeButtons[0]!)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0]?.[0]).toMatchObject({
      facets: { organism: ["Mus musculus"] },
    })
  })

  it("invokes onChange with cleared filters when 'Clear all' is clicked", () => {
    const onChange = vi.fn()
    const state: SidebarState = {
      facets: { organism: ["Homo sapiens"] },
      keywords: {},
      dateRange: null,
      subtype: null,
      freeText: "cancer",
    }
    renderWithProviders(
      <ActiveFilterChips
        state={state}
        fields={bioprojectFields}
        onChange={onChange}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: "すべて解除" }))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0]?.[0]).toEqual({
      facets: {},
      keywords: {},
      dateRange: null,
      subtype: null,
      freeText: "cancer",
    })
  })
})
