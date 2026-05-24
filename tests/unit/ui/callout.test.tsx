import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"

import { Callout } from "~/ui/callout"

describe("Callout", () => {
  test("Callout_info_appliesInfoPalette", () => {
    render(<Callout tone="info">info</Callout>)
    expect(screen.getByText("info").className).toContain("bg-surface-subtle")
  })

  test("Callout_warn_appliesWarnPalette", () => {
    render(<Callout tone="warn">warn</Callout>)
    expect(screen.getByText("warn").className).toContain("bg-warn-bg")
  })

  test("Callout_ok_appliesOkPalette", () => {
    render(<Callout tone="ok">ok</Callout>)
    expect(screen.getByText("ok").className).toContain("bg-ok-bg")
  })

  test("Callout_role_isAppliedWhenProvided", () => {
    render(<Callout role="status">status</Callout>)
    expect(screen.getByRole("status")).toHaveTextContent("status")
  })
})
