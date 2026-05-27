import { render } from "@testing-library/react"
import { describe, expect, test } from "vitest"

import { Section } from "~/ui/section"

const findSection = (container: HTMLElement) => {
  const section = container.querySelector("section")
  if (section === null) throw new Error("section not found")
  return section
}

const findInner = (container: HTMLElement) => {
  const inner = container.querySelector(".max-w-content-max")
  if (inner === null) throw new Error("inner wrapper not found")
  return inner
}

describe("Section", () => {
  test("Section_outer_appliesPageGutter", () => {
    const { container } = render(<Section>x</Section>)
    expect(findSection(container)).toHaveClass("px-page-gutter")
  })

  test("Section_inner_appliesContentMaxAndMxAuto", () => {
    const { container } = render(<Section>x</Section>)
    const inner = findInner(container)
    expect(inner).toHaveClass("max-w-content-max")
    expect(inner).toHaveClass("mx-auto")
  })

  test("Section_defaultPadY_appliesSectionMd", () => {
    const { container } = render(<Section>x</Section>)
    const section = findSection(container)
    expect(section).toHaveClass("pt-section-md")
    expect(section).toHaveClass("pb-section-md")
  })

  test("Section_padYSm_appliesSectionSm", () => {
    const { container } = render(<Section padY="sm">x</Section>)
    const section = findSection(container)
    expect(section).toHaveClass("pt-section-sm")
    expect(section).toHaveClass("pb-section-sm")
  })

  test("Section_padYLg_appliesSectionLg", () => {
    const { container } = render(<Section padY="lg">x</Section>)
    const section = findSection(container)
    expect(section).toHaveClass("pt-section-lg")
    expect(section).toHaveClass("pb-section-lg")
  })

  test("Section_padTopAndBottomOverride_appliesIndependentPadding", () => {
    const { container } = render(<Section padTop="lg" padBottom="sm">x</Section>)
    const section = findSection(container)
    expect(section).toHaveClass("pt-section-lg")
    expect(section).toHaveClass("pb-section-sm")
  })

  test("Section_padTopOverridesPadY_keepsBottomFromPadY", () => {
    const { container } = render(<Section padY="md" padTop="lg">x</Section>)
    const section = findSection(container)
    expect(section).toHaveClass("pt-section-lg")
    expect(section).toHaveClass("pb-section-md")
  })

  test("Section_padTopNone_appliesZeroTopPadding", () => {
    const { container } = render(<Section padTop="none">x</Section>)
    const section = findSection(container)
    expect(section).toHaveClass("pt-0")
  })

  test("Section_maxWidth_appliesInlineMaxWidthOnInner", () => {
    const { container } = render(<Section maxWidth={820}>x</Section>)
    expect(findInner(container)).toHaveStyle({ maxWidth: "820px" })
  })

  test("Section_noMaxWidth_hasNoInlineStyleOnInner", () => {
    const { container } = render(<Section>x</Section>)
    expect(findInner(container)).not.toHaveAttribute("style")
  })
})
