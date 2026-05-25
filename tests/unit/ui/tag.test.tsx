import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"

import { Tag } from "~/ui/tag"

describe("Tag", () => {
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

  test("Tag_monoTrue_appliesFontMono", () => {
    render(<Tag mono>AND</Tag>)
    expect(screen.getByText("AND")).toHaveClass("font-mono")
  })

  test("Tag_sizeMd_appliesMdPadding", () => {
    render(<Tag size="md">md</Tag>)
    expect(screen.getByText("md")).toHaveClass("px-2.5")
  })
})
