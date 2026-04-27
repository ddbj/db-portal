import { fireEvent, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import DbHitCountCard from "@/components/search/DbHitCountCard"
import type { DbPortalLightweightHit } from "@/lib/api"

import { renderWithProviders } from "../../../helpers/providers"

const hit = (
  identifier: string,
  overrides: Partial<DbPortalLightweightHit> = {},
): DbPortalLightweightHit => ({
  identifier,
  type: "bioproject",
  title: `Title for ${identifier}`,
  description: null,
  organism: null,
  status: "public",
  accessibility: "public-access",
  dateCreated: null,
  dateModified: null,
  datePublished: "2024-01-15",
  url: `https://example.org/${identifier}`,
  isPartOf: "bioproject",
  ...overrides,
})

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

  describe("topHits", () => {

    it("renders heading and external links for each hit on success", () => {
      renderWithProviders(
        <DbHitCountCard
          dbId="bioproject"
          state="success"
          count={1234}
          error={null}
          query="human"
          adv={null}
          onRetry={vi.fn()}
          topHits={[hit("PRJDB1"), hit("PRJDB2"), hit("PRJDB3")]}
        />,
      )
      expect(screen.getByText("上位ヒット")).toBeInTheDocument()
      const region = screen.getByTestId("top-hits-bioproject")
      expect(within(region).getByText("PRJDB1")).toBeInTheDocument()
      expect(within(region).getByText("PRJDB2")).toBeInTheDocument()
      expect(within(region).getByText("PRJDB3")).toBeInTheDocument()
      const titleLinks = within(region).getAllByRole("link")
      expect(titleLinks).toHaveLength(3)
      for (const a of titleLinks) {
        expect(a.getAttribute("target")).toBe("_blank")
        expect(a.getAttribute("rel")).toContain("noopener")
        expect(a.getAttribute("rel")).toContain("noreferrer")
      }
      expect(titleLinks[0]?.getAttribute("href")).toBe("https://example.org/PRJDB1")
    })

    it("does not render top hits section when topHits is undefined", () => {
      renderWithProviders(
        <DbHitCountCard
          dbId="sra"
          state="success"
          count={50}
          error={null}
          query="human"
          adv={null}
          onRetry={vi.fn()}
        />,
      )
      expect(screen.queryByText("上位ヒット")).not.toBeInTheDocument()
      expect(screen.queryByTestId("top-hits-sra")).not.toBeInTheDocument()
    })

    it("does not render top hits section when topHits is empty", () => {
      renderWithProviders(
        <DbHitCountCard
          dbId="sra"
          state="success"
          count={0}
          error={null}
          query="human"
          adv={null}
          onRetry={vi.fn()}
          topHits={[]}
        />,
      )
      expect(screen.queryByText("上位ヒット")).not.toBeInTheDocument()
    })

    it("falls back to identifier when title is null", () => {
      renderWithProviders(
        <DbHitCountCard
          dbId="bioproject"
          state="success"
          count={1}
          error={null}
          query="human"
          adv={null}
          onRetry={vi.fn()}
          topHits={[hit("PRJDB42", { title: null })]}
        />,
      )
      const region = screen.getByTestId("top-hits-bioproject")
      const link = within(region).getByRole("link")
      expect(link.textContent).toBe("PRJDB42")
    })

    it("renders title as plain span when url is null", () => {
      renderWithProviders(
        <DbHitCountCard
          dbId="bioproject"
          state="success"
          count={1}
          error={null}
          query="human"
          adv={null}
          onRetry={vi.fn()}
          topHits={[hit("PRJDB42", { url: null })]}
        />,
      )
      const region = screen.getByTestId("top-hits-bioproject")
      expect(within(region).queryByRole("link")).toBeNull()
      expect(within(region).getByText("Title for PRJDB42")).toBeInTheDocument()
    })

    it("does not render top hits in error state even if topHits is provided", () => {
      renderWithProviders(
        <DbHitCountCard
          dbId="bioproject"
          state="error"
          count={null}
          error="timeout"
          query="human"
          adv={null}
          onRetry={vi.fn()}
          topHits={[hit("PRJDB1")]}
        />,
      )
      expect(screen.queryByTestId("top-hits-bioproject")).not.toBeInTheDocument()
    })
  })
})
