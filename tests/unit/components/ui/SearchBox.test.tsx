import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import SearchBox from "@/components/ui/SearchBox"

const DB_OPTIONS = [
  { value: "all", label: "All" },
  { value: "sra", label: "SRA" },
  { value: "biosample", label: "BioSample" },
] as const

describe("SearchBox", () => {

  it("renders only input + button when no dbOptions provided (large)", () => {
    render(<SearchBox size="large" placeholder="q" onSubmit={() => undefined} />)
    expect(screen.getByPlaceholderText("q")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "検索対象 DB" })).not.toBeInTheDocument()
  })

  it("renders only input + button when no dbOptions provided (small)", () => {
    render(<SearchBox size="small" placeholder="q" onSubmit={() => undefined} />)
    expect(screen.getByPlaceholderText("q")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "検索対象 DB" })).not.toBeInTheDocument()
  })

  it("shows DB selector trigger on size=large when dbOptions are provided", () => {
    render(
      <SearchBox
        size="large"
        placeholder="q"
        onSubmit={() => undefined}
        dbOptions={DB_OPTIONS}
        selectedDb="sra"
        onDbChange={() => undefined}
        dbAriaLabel="検索対象 DB"
      />,
    )
    const trigger = screen.getByRole("button", { name: "検索対象 DB" })
    expect(trigger).toBeInTheDocument()
    expect(trigger).toHaveTextContent("SRA")
  })

  it("does NOT show DB selector on size=small even when dbOptions are provided", () => {
    render(
      <SearchBox
        size="small"
        placeholder="q"
        onSubmit={() => undefined}
        dbOptions={DB_OPTIONS}
        selectedDb="sra"
        onDbChange={() => undefined}
        dbAriaLabel="検索対象 DB"
      />,
    )
    expect(screen.queryByRole("button", { name: "検索対象 DB" })).not.toBeInTheDocument()
  })

  it("opens listbox on trigger click and calls onDbChange with the clicked option value", () => {
    const onDbChange = vi.fn()
    render(
      <SearchBox
        size="large"
        placeholder="q"
        onSubmit={() => undefined}
        dbOptions={DB_OPTIONS}
        selectedDb="all"
        onDbChange={onDbChange}
        dbAriaLabel="DB"
      />,
    )
    const trigger = screen.getByRole("button", { name: "DB" })
    fireEvent.click(trigger)
    expect(screen.getByRole("listbox", { name: "DB" })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("option", { name: "BioSample" }))
    expect(onDbChange).toHaveBeenCalledWith("biosample")
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
  })

  it("listbox is closed by default and lists all options when opened", () => {
    render(
      <SearchBox
        size="large"
        placeholder="q"
        onSubmit={() => undefined}
        dbOptions={DB_OPTIONS}
        selectedDb="all"
        onDbChange={() => undefined}
        dbAriaLabel="DB"
      />,
    )
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "DB" }))
    expect(screen.getAllByRole("option")).toHaveLength(DB_OPTIONS.length)
  })

  it("calls onSubmit with the current input value on form submit", () => {
    const onSubmit = vi.fn()
    render(
      <SearchBox
        size="large"
        placeholder="q"
        defaultValue="hello"
        onSubmit={onSubmit}
      />,
    )
    const input = screen.getByPlaceholderText("q")
    fireEvent.change(input, { target: { value: "world" } })
    fireEvent.submit(input.closest("form")!)
    expect(onSubmit).toHaveBeenCalledWith("world")
  })

  it("fires onSubmit(example.query) when an example chip is clicked", () => {
    const onSubmit = vi.fn()
    render(
      <SearchBox
        size="large"
        placeholder="q"
        onSubmit={onSubmit}
        examples={[
          { label: "SARS-CoV-2", query: "SARS-CoV-2" },
          { label: "Homo sapiens", query: "Homo sapiens" },
        ]}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: "Homo sapiens" }))
    expect(onSubmit).toHaveBeenCalledWith("Homo sapiens")
  })

  it("buttonLabel is used as the submit button text", () => {
    render(
      <SearchBox
        size="large"
        placeholder="q"
        onSubmit={() => undefined}
        buttonLabel="Search"
      />,
    )
    expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument()
  })
})
