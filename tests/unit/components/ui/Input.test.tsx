import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import Input from "@/components/ui/Input"

describe("Input", () => {

  it("renders with default variant and no aria-invalid", () => {
    render(<Input placeholder="default" />)
    const input = screen.getByPlaceholderText("default")
    expect(input).not.toHaveAttribute("aria-invalid")
    expect(input).toHaveAttribute("type", "text")
  })

  it("sets aria-invalid='true' when invalid prop is true", () => {
    render(<Input placeholder="x" invalid />)
    expect(screen.getByPlaceholderText("x")).toHaveAttribute("aria-invalid", "true")
  })

  it("renders search variant with type='text'", () => {
    render(<Input variant="search" placeholder="検索" />)
    const input = screen.getByPlaceholderText("検索")
    expect(input).toHaveAttribute("type", "text")
  })

  it("forwards arbitrary attributes to native input", () => {
    render(<Input placeholder="y" name="foo" maxLength={10} />)
    const input = screen.getByPlaceholderText("y")
    expect(input).toHaveAttribute("name", "foo")
    expect(input).toHaveAttribute("maxlength", "10")
  })
})
