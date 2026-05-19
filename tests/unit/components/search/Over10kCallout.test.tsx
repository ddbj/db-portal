import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import Over10kCallout from "@/components/search/Over10kCallout"

import { renderWithProviders } from "../../../helpers/providers"

describe("Over10kCallout", () => {

  it("renders message and CTA link to search page with db", () => {
    renderWithProviders(<Over10kCallout db="trad" />)
    expect(screen.getByText(/10,000 件まで/)).toBeInTheDocument()
    const cta = screen.getByRole("link", { name: "検索画面を開く" })
    expect(cta.getAttribute("href")).toBe("/search?db=trad")
  })

  it("works for taxonomy too", () => {
    renderWithProviders(<Over10kCallout db="taxonomy" />)
    const cta = screen.getByRole("link", { name: "検索画面を開く" })
    expect(cta.getAttribute("href")).toBe("/search?db=taxonomy")
  })
})
