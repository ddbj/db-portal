import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"

import { Callout } from "~/ui/callout"

describe("Callout", () => {
  test("Callout_info_appliesInfoPalette", () => {
    render(<Callout tone="info">info</Callout>)
    expect(screen.getByText("info")).toHaveClass("bg-surface-subtle")
  })

  test("Callout_warn_appliesWarnPalette", () => {
    render(<Callout tone="warn">warn</Callout>)
    expect(screen.getByText("warn")).toHaveClass("bg-warn-bg")
  })

  test("Callout_ok_appliesOkPalette", () => {
    render(<Callout tone="ok">ok</Callout>)
    expect(screen.getByText("ok")).toHaveClass("bg-ok-bg")
  })

  test("Callout_role_isAppliedWhenProvided", () => {
    render(<Callout role="status">status</Callout>)
    expect(screen.getByRole("status")).toHaveTextContent("status")
  })

  test("Callout_defaultVariant_boxesTheMessageOnFourSides", () => {
    render(<Callout>box</Callout>)
    const node = screen.getByText("box")
    expect(node).toHaveClass("border")
    expect(node).toHaveClass("rounded-card")
    expect(node).not.toHaveClass("border-l-[3px]")
  })

  test("Callout_barVariant_leavesOnlyTheLeftEdgeAndKeepsThePalette", () => {
    render(<Callout variant="bar" tone="info">bar</Callout>)
    const node = screen.getByText("bar")
    expect(node).toHaveClass("border-l-[3px]")
    expect(node).toHaveClass("bg-surface-subtle")
    expect(node).toHaveClass("border-border-soft")
    expect(node).not.toHaveClass("rounded-card")
  })
})
