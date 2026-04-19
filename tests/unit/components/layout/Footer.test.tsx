import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import Footer from "@/components/layout/Footer"

describe("Footer", () => {

  it("renders copyright text", () => {
    render(<Footer />)
    expect(
      screen.getByText("© 2026 DDBJ (Bioinformatics and DDBJ Center)"),
    ).toBeInTheDocument()
  })

  it("renders as <footer> landmark (contentinfo role)", () => {
    render(<Footer />)
    expect(screen.getByRole("contentinfo")).toBeInTheDocument()
  })
})
