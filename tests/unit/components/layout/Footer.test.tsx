import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import Footer from "@/components/layout/Footer"

import { renderWithI18n } from "../../../helpers/i18n"

describe("Footer", () => {

  it("renders copyright text with the current year (interpolated)", () => {
    renderWithI18n(<Footer />)
    const year = new Date().getFullYear()
    expect(
      screen.getByText(`© ${year} DDBJ (Bioinformatics and DDBJ Center)`),
    ).toBeInTheDocument()
  })

  it("renders as <footer> landmark (contentinfo role)", () => {
    renderWithI18n(<Footer />)
    expect(screen.getByRole("contentinfo")).toBeInTheDocument()
  })
})
