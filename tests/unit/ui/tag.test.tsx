import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"

import { Tag } from "~/ui/tag"

describe("Tag", () => {
  test("Tag_base_appliesTrackingAndLeadingTokens", () => {
    render(<Tag>label</Tag>)
    const node = screen.getByText("label")
    expect(node).toHaveClass("tracking-tag")
    expect(node).toHaveClass("leading-snug")
    expect(node).toHaveClass("rounded-tag")
    expect(node).toHaveClass("font-bold")
  })

  test("Tag_kindTag_appliesNeutralPalette", () => {
    render(<Tag>label</Tag>)
    expect(screen.getByText("label")).toHaveClass("bg-surface-subtle")
  })

  test("Tag_kindBrand_appliesBrandSoftPalette", () => {
    render(<Tag kind="brand">brand</Tag>)
    expect(screen.getByText("brand")).toHaveClass("bg-brand-soft")
  })

  test("Tag_kindSourceDDBJ_appliesSrcDdbjPalette", () => {
    render(<Tag kind="source" name="DDBJ" />)
    expect(screen.getByText("DDBJ")).toHaveClass("bg-src-ddbj-soft")
  })

  test("Tag_kindSourceDBCLS_appliesSrcDbclsPalette", () => {
    render(<Tag kind="source" name="DBCLS" />)
    expect(screen.getByText("DBCLS")).toHaveClass("bg-src-dbcls-soft")
  })

  test("Tag_kindStatusCritical_appliesCriticalPalette", () => {
    render(<Tag kind="status" tone="critical">重要</Tag>)
    expect(screen.getByText("重要")).toHaveClass("bg-critical-bg")
  })

  test("Tag_kindStatusWarning_appliesWarnPalette", () => {
    render(<Tag kind="status" tone="warning">pending</Tag>)
    expect(screen.getByText("pending")).toHaveClass("bg-warn-bg")
  })

  test("Tag_kindStatusSuccess_appliesOkPalette", () => {
    render(<Tag kind="status" tone="success">完了</Tag>)
    expect(screen.getByText("完了")).toHaveClass("bg-ok-bg")
  })

  test("Tag_kindStatusInfo_appliesBrandSoftPalette", () => {
    render(<Tag kind="status" tone="info">案内</Tag>)
    expect(screen.getByText("案内")).toHaveClass("bg-brand-soft")
  })

  test("Tag_monoTrue_appliesFontMono", () => {
    render(<Tag mono>AND</Tag>)
    expect(screen.getByText("AND")).toHaveClass("font-mono")
  })

  test("Tag_monoFalse_appliesFontSans", () => {
    render(<Tag>plain</Tag>)
    expect(screen.getByText("plain")).toHaveClass("font-sans")
  })

  test("Tag_sizeSm_appliesSmPaddingAndMicroSize", () => {
    render(<Tag size="sm">sm</Tag>)
    const node = screen.getByText("sm")
    expect(node).toHaveClass("px-2")
    expect(node).toHaveClass("py-px")
    expect(node).toHaveClass("text-fs-micro")
  })

  test("Tag_sizeMd_appliesMdPaddingAndMicroSize", () => {
    render(<Tag size="md">md</Tag>)
    const node = screen.getByText("md")
    expect(node).toHaveClass("px-2.5")
    expect(node).toHaveClass("py-0.5")
    expect(node).toHaveClass("text-fs-micro")
  })
})
