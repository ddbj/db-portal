import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, test, vi } from "vitest"

import { Button } from "~/ui/button"

describe("Button", () => {
  test("Button_defaults_typeIsButton", () => {
    render(<Button>送信</Button>)
    const button = screen.getByRole("button", { name: "送信" })
    expect(button).toHaveAttribute("type", "button")
  })

  test("Button_kindLink_rendersWithoutSizePadding", () => {
    render(<Button kind="link">link text</Button>)
    const button = screen.getByRole("button", { name: "link text" })
    expect(button.className).toContain("text-brand")
    expect(button.className).not.toContain("px-3")
    expect(button.className).not.toContain("px-4.5")
    expect(button.className).not.toContain("px-5.5")
  })

  test("Button_disabled_setsAriaAndAttribute", () => {
    const onClick = vi.fn()
    render(<Button disabled onClick={onClick}>無効</Button>)
    const button = screen.getByRole("button", { name: "無効" })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute("aria-disabled", "true")
  })

  test("Button_onClick_isInvoked", () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>click</Button>)
    fireEvent.click(screen.getByRole("button", { name: "click" }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  test("Button_eachKind_appliesCorrespondingPalette", () => {
    const { rerender } = render(<Button kind="primary">x</Button>)
    expect(screen.getByRole("button").className).toContain("bg-brand")
    rerender(<Button kind="secondary">x</Button>)
    expect(screen.getByRole("button").className).toContain("border-border-soft")
    rerender(<Button kind="danger">x</Button>)
    expect(screen.getByRole("button").className).toContain("text-red")
    rerender(<Button kind="ghost">x</Button>)
    expect(screen.getByRole("button").className).toContain("text-brand-deep")
  })
})
