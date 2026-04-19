import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import Select from "@/components/ui/Select"

describe("Select", () => {

  it("renders all options as <option> elements", () => {
    render(
      <Select
        options={[
          { value: "a", label: "Apple" },
          { value: "b", label: "Banana" },
        ]}
        defaultValue="a"
        aria-label="fruit"
      />,
    )
    expect(screen.getByRole("combobox", { name: "fruit" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "Apple" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "Banana" })).toBeInTheDocument()
  })

  it("propagates the disabled flag on each option", () => {
    render(
      <Select
        options={[
          { value: "a", label: "A" },
          { value: "b", label: "B", disabled: true },
        ]}
        defaultValue="a"
        aria-label="x"
      />,
    )
    const opt = screen.getByRole("option", { name: "B" }) as HTMLOptionElement
    expect(opt.disabled).toBe(true)
  })

  it("sets aria-invalid='true' when invalid prop is true", () => {
    render(
      <Select
        options={[{ value: "a", label: "A" }]}
        defaultValue="a"
        aria-label="z"
        invalid
      />,
    )
    expect(screen.getByRole("combobox", { name: "z" })).toHaveAttribute("aria-invalid", "true")
  })
})
