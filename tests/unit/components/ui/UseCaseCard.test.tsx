import { fireEvent, render, screen } from "@testing-library/react"
import { Bug } from "lucide-react"
import { describe, expect, it, vi } from "vitest"

import UseCaseCard from "@/components/ui/UseCaseCard"

describe("UseCaseCard", () => {
  it("renders title and description", () => {
    render(
      <UseCaseCard
        title="Microbial Genome"
        description="Prokaryote / Virus / Organelle"
        icon={Bug}
        onClick={vi.fn()}
      />,
    )
    expect(screen.getByText("Microbial Genome")).toBeInTheDocument()
    expect(screen.getByText("Prokaryote / Virus / Organelle")).toBeInTheDocument()
  })

  it("has aria-pressed='false' by default", () => {
    render(
      <UseCaseCard title="T" description="D" icon={Bug} onClick={vi.fn()} />,
    )
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false")
  })

  it("has aria-pressed='true' when active", () => {
    render(
      <UseCaseCard title="T" description="D" icon={Bug} active onClick={vi.fn()} />,
    )
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true")
  })

  it("calls onClick when clicked", () => {
    const onClick = vi.fn()
    render(
      <UseCaseCard title="T" description="D" icon={Bug} onClick={onClick} />,
    )
    fireEvent.click(screen.getByRole("button"))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it("applies primary border in active state, gray border otherwise", () => {
    const { rerender } = render(
      <UseCaseCard title="T" description="D" icon={Bug} onClick={vi.fn()} />,
    )
    const button = screen.getByRole("button")
    expect(button.className).toContain("border-gray-200")
    expect(button.className).not.toContain("border-primary-600")

    rerender(
      <UseCaseCard title="T" description="D" icon={Bug} active onClick={vi.fn()} />,
    )
    expect(button.className).toContain("border-primary-600")
  })

  it("icon is aria-hidden", () => {
    const { container } = render(
      <UseCaseCard title="T" description="D" icon={Bug} onClick={vi.fn()} />,
    )
    const icon = container.querySelector("svg")
    expect(icon).toHaveAttribute("aria-hidden", "true")
  })
})
