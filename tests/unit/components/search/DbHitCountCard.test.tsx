import { fireEvent, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import DbHitCountCard from "@/components/search/DbHitCountCard"

import { renderWithProviders } from "../../../helpers/providers"

describe("DbHitCountCard", () => {

  it("renders Skeleton in loading state", () => {
    renderWithProviders(
      <DbHitCountCard
        dbId="bioproject"
        state="loading"
        count={null}
        error={null}
        query="human"
        adv={null}
        onRetry={vi.fn()}
      />,
    )
    expect(screen.getByRole("status", { name: "件数を取得中" })).toBeInTheDocument()
    expect(screen.getByText("BioProject")).toBeInTheDocument()
  })

  it("renders count with TextLink in success state", () => {
    renderWithProviders(
      <DbHitCountCard
        dbId="sra"
        state="success"
        count={189923}
        error={null}
        query="human"
        adv={null}
        onRetry={vi.fn()}
      />,
    )
    expect(screen.getByText("189,923")).toBeInTheDocument()
    const link = screen.getByRole("link")
    expect(link.getAttribute("href")).toContain("q=human")
    expect(link.getAttribute("href")).toContain("db=sra")
  })

  it("renders error label, error kind, and retry button in error state", () => {
    const onRetry = vi.fn()
    renderWithProviders(
      <DbHitCountCard
        dbId="trad"
        state="error"
        count={null}
        error="timeout"
        query="human"
        adv={null}
        onRetry={onRetry}
      />,
    )
    expect(screen.getByText("取得できませんでした")).toBeInTheDocument()
    expect(screen.getByText("タイムアウト")).toBeInTheDocument()
    const retryBtn = screen.getByRole("button", { name: "再試行" })
    fireEvent.click(retryBtn)
    expect(onRetry).toHaveBeenCalledWith("trad")
  })

  it("includes adv in the detail url when provided", () => {
    renderWithProviders(
      <DbHitCountCard
        dbId="bioproject"
        state="success"
        count={100}
        error={null}
        query={null}
        adv="title:cancer"
        onRetry={vi.fn()}
      />,
    )
    const link = screen.getByRole("link")
    expect(link.getAttribute("href")).toContain("adv=")
    expect(link.getAttribute("href")).toContain("db=bioproject")
  })
})
