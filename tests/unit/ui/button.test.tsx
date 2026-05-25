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
    expect(button).toHaveClass("text-brand")
    expect(button).not.toHaveClass("px-3")
    expect(button).not.toHaveClass("px-4.5")
    expect(button).not.toHaveClass("px-5.5")
  })

  test("Button_disabled_setsAriaAndAttribute", () => {
    const onClick = vi.fn()
    render(<Button disabled onClick={onClick}>無効</Button>)
    const button = screen.getByRole("button", { name: "無効" })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute("aria-disabled", "true")
  })

  test("Button_disabled_doesNotInvokeOnClick", () => {
    const onClick = vi.fn()
    render(<Button disabled onClick={onClick}>無効</Button>)
    fireEvent.click(screen.getByRole("button", { name: "無効" }))
    expect(onClick).not.toHaveBeenCalled()
  })

  test("Button_typeSubmit_isApplied", () => {
    render(<Button type="submit">submit</Button>)
    expect(screen.getByRole("button", { name: "submit" })).toHaveAttribute("type", "submit")
  })

  test("Button_onClick_isInvoked", () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>click</Button>)
    fireEvent.click(screen.getByRole("button", { name: "click" }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  test("Button_eachKind_appliesCorrespondingPalette", () => {
    const { rerender } = render(<Button kind="primary">x</Button>)
    expect(screen.getByRole("button")).toHaveClass("bg-brand")
    rerender(<Button kind="secondary">x</Button>)
    expect(screen.getByRole("button")).toHaveClass("border-border-soft")
    rerender(<Button kind="danger">x</Button>)
    expect(screen.getByRole("button")).toHaveClass("text-red")
    rerender(<Button kind="ghost">x</Button>)
    expect(screen.getByRole("button")).toHaveClass("text-brand-deep")
  })
})
