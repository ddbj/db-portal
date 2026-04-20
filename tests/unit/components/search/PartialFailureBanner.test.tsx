import { fireEvent, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import PartialFailureBanner, {
  classifyBanner,
} from "@/components/search/PartialFailureBanner"
import type { DbHitCount } from "@/types/db"
import { DB_ORDER } from "@/types/db"

import { renderWithProviders } from "../../../helpers/providers"

const buildDbs = (errorCount: number): readonly DbHitCount[] =>
  DB_ORDER.map((dbId, idx) =>
    idx < errorCount
      ? { dbId, state: "error", count: null, error: "timeout" }
      : { dbId, state: "success", count: 100 },
  )

describe("classifyBanner", () => {

  it("returns null for empty input", () => {
    expect(classifyBanner([])).toBeNull()
  })

  it("returns null when no errors (0/8)", () => {
    expect(classifyBanner(buildDbs(0))).toBeNull()
  })

  it("returns null when less than half are errors (3/8)", () => {
    expect(classifyBanner(buildDbs(3))).toBeNull()
  })

  it("returns 'partial' when at least half are errors (4/8)", () => {
    expect(classifyBanner(buildDbs(4))).toBe("partial")
  })

  it("returns 'partial' when 7/8 are errors", () => {
    expect(classifyBanner(buildDbs(7))).toBe("partial")
  })

  it("returns 'all_error' when all are errors (8/8)", () => {
    expect(classifyBanner(buildDbs(8))).toBe("all_error")
  })
})

describe("PartialFailureBanner", () => {

  it("renders nothing when no errors", () => {
    const { container } = renderWithProviders(
      <PartialFailureBanner databases={buildDbs(0)} onRetryAll={vi.fn()} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it("renders warning Callout for partial failures", () => {
    renderWithProviders(
      <PartialFailureBanner databases={buildDbs(4)} onRetryAll={vi.fn()} />,
    )
    expect(screen.getByText(/一部の検索サービスが不安定/)).toBeInTheDocument()
  })

  it("renders error Callout with retry button when all errors", () => {
    const onRetry = vi.fn()
    renderWithProviders(
      <PartialFailureBanner databases={buildDbs(8)} onRetryAll={onRetry} />,
    )
    expect(screen.getByText(/検索サービスに接続できません/)).toBeInTheDocument()
    const btn = screen.getByRole("button", { name: "再試行" })
    fireEvent.click(btn)
    expect(onRetry).toHaveBeenCalled()
  })
})
