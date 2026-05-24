import { render, screen } from "@testing-library/react"
import { createRoutesStub } from "react-router"
import { describe, expect, test } from "vitest"

import { TextLink } from "~/ui/text-link"

const renderTextLink = (node: React.ReactNode) => {
  const Stub = createRoutesStub([
    { path: "/", Component: () => <>{node}</> },
    { path: "/news", Component: () => <span>news</span> },
  ])
  return render(<Stub />)
}

describe("TextLink", () => {
  test("TextLink_internal_rendersRouterLink", () => {
    renderTextLink(<TextLink to="/news">news</TextLink>)
    const link = screen.getByRole("link", { name: /news/ })
    expect(link).toHaveAttribute("href", "/news")
    expect(link).not.toHaveAttribute("target")
  })

  test("TextLink_external_setsTargetAndRel", () => {
    renderTextLink(
      <TextLink href="https://example.com" external>
        ext
      </TextLink>,
    )
    const link = screen.getByRole("link", { name: /ext/ })
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", "noopener noreferrer")
  })

  test("TextLink_external_hasExternalLinkSrLabel", () => {
    renderTextLink(
      <TextLink href="https://example.com" external>
        ext
      </TextLink>,
    )
    expect(screen.getByText(/external link/)).toBeInTheDocument()
  })
})
