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

  test("Button_block_appliesFullWidthLeftAlign", () => {
    render(<Button block>full</Button>)
    expect(screen.getByRole("button", { name: "full" }))
      .toHaveClass("w-full", "justify-start", "text-left")
  })

  test("Button_blockDefaultFalse_doesNotApplyFullWidth", () => {
    render(<Button>x</Button>)
    expect(screen.getByRole("button", { name: "x" }))
      .not.toHaveClass("w-full")
  })

  test("Button_sizeSm_appliesSmPaddingAndFontTokens", () => {
    render(<Button size="sm">sm</Button>)
    expect(screen.getByRole("button", { name: "sm" }))
      .toHaveClass("px-3", "py-1.5", "text-fs-body-sm")
  })

  test("Button_sizeMd_appliesMdPaddingAndFontTokens", () => {
    render(<Button size="md">md</Button>)
    expect(screen.getByRole("button", { name: "md" }))
      .toHaveClass("px-4", "py-2", "text-fs-body")
  })

  test("Button_sizeLg_appliesLgPaddingAndFontTokens", () => {
    render(<Button size="lg">lg</Button>)
    expect(screen.getByRole("button", { name: "lg" }))
      .toHaveClass("px-6", "py-3", "text-fs-body")
  })

  test("Button_sizeDefault_appliesMdPaddingTokens", () => {
    render(<Button>default</Button>)
    expect(screen.getByRole("button", { name: "default" }))
      .toHaveClass("px-4", "py-2")
  })

  test("Button_kindLink_appliesLinkSpecificClasses", () => {
    render(<Button kind="link">go</Button>)
    const button = screen.getByRole("button", { name: "go" })
    expect(button).toHaveClass("p-0", "rounded-none", "font-semibold", "text-brand")
  })

  test("Button_disabled_appliesOpacityAndCursor", () => {
    render(<Button disabled>x</Button>)
    expect(screen.getByRole("button", { name: "x" }))
      .toHaveClass("opacity-55", "cursor-not-allowed")
  })

  test("Button_enabled_doesNotApplyDisabledClasses", () => {
    render(<Button>x</Button>)
    expect(screen.getByRole("button", { name: "x" }))
      .not.toHaveClass("opacity-55")
  })
})
