import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"

import { NativeSelect } from "~/ui/native-select"

describe("NativeSelect", () => {
  test("NativeSelect_default_doesNotMarkAsInvalid", () => {
    render(<NativeSelect ariaLabel="sort" options={["a", "b"]} />)
    expect(screen.getByRole("combobox", { name: "sort" })).not.toHaveAttribute("aria-invalid")
  })

  test("NativeSelect_stateWarn_marksAsInvalid", () => {
    render(<NativeSelect ariaLabel="sort" options={["a", "b"]} state="warn" />)
    expect(screen.getByRole("combobox", { name: "sort" })).toHaveAttribute("aria-invalid", "true")
  })

  test("NativeSelect_ariaDescribedby_isApplied", () => {
    render(<NativeSelect ariaLabel="sort" options={["a"]} ariaDescribedby="sort-hint" />)
    expect(screen.getByRole("combobox", { name: "sort" }))
      .toHaveAttribute("aria-describedby", "sort-hint")
  })

  test("NativeSelect_stringOptions_rendersOptionsByLabel", () => {
    render(<NativeSelect ariaLabel="x" options={["alpha", "beta"]} />)
    expect(screen.getByRole("option", { name: "alpha" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "beta" })).toBeInTheDocument()
  })

  test("NativeSelect_objectOptions_rendersValueAndLabel", () => {
    render(
      <NativeSelect
        ariaLabel="x"
        options={[{ value: "a", label: "Alpha" }, { value: "b", label: "Beta" }]}
      />,
    )
    expect(screen.getByRole("option", { name: "Alpha" })).toHaveValue("a")
    expect(screen.getByRole("option", { name: "Beta" })).toHaveValue("b")
  })
})
