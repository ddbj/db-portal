import { render } from "@testing-library/react"
import { describe, expect, test } from "vitest"

import { ServiceIcon } from "~/features/top/service-icon"

const KNOWN_IDS = [
  "search",
  "submit-nav",
  "services-index",
  "supercomputer",
  "statistics",
  "activity",
] as const

describe("ServiceIcon", () => {
  test("ServiceIcon_knownIds_renderSvg", () => {
    for (const id of KNOWN_IDS) {
      const { container, unmount } = render(<ServiceIcon id={id} />)
      const svg = container.querySelector("svg")
      if (svg === null) {
        unmount()
        throw new Error(`svg not rendered for id=${id}`)
      }
      expect(svg.getAttribute("aria-hidden")).toBe("true")
      unmount()
    }
  })

  test("ServiceIcon_unknownId_rendersNull", () => {
    const { container } = render(<ServiceIcon id="unknown" />)
    expect(container.querySelector("svg")).toBeNull()
    expect(container.firstChild).toBeNull()
  })

  test("ServiceIcon_size_propagatesToSvgDimensions", () => {
    const { container } = render(<ServiceIcon id="search" size={48} />)
    const svg = container.querySelector("svg")
    expect(svg?.getAttribute("width")).toBe("48")
    expect(svg?.getAttribute("height")).toBe("48")
  })

  test("ServiceIcon_defaultSize_is30", () => {
    const { container } = render(<ServiceIcon id="search" />)
    const svg = container.querySelector("svg")
    expect(svg?.getAttribute("width")).toBe("30")
  })

  test("ServiceIcon_isFocusableFalse", () => {
    const { container } = render(<ServiceIcon id="search" />)
    expect(container.querySelector("svg")?.getAttribute("focusable")).toBe("false")
  })
})
