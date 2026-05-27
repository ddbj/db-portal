import { screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"

import { type ResourceAccent, ResourceCard } from "~/features/top/resource-card"
import type { ServiceContent } from "~/schemas/content/service-content"

import { renderWithStub } from "../../_helpers/render"

type PopularService = Parameters<typeof ResourceCard>[0]["service"]

const buildService = (overrides: Partial<ServiceContent> = {}): PopularService => ({
  id: "bp",
  title: { ja: "BioProject", en: "BioProject" },
  description: { ja: "プロジェクト管理", en: "Project metadata" },
  link: { kind: "internal", to: "/services/bp" },
  top: { category: "popular-ddbj", order: 1, monogram: "BP" },
  ...overrides,
} as PopularService)

const externalService = buildService({
  link: { kind: "external", href: "https://example.com/bp" },
})

const renderCard = (
  service: PopularService,
  accent: ResourceAccent,
  lang: "ja" | "en" = "ja",
) =>
  renderWithStub({
    routes: [
      {
        path: "/",
        Component: () => <ResourceCard service={service} lang={lang} accent={accent} />,
      },
      { path: "/services/bp", Component: () => <span>bp</span> },
      { path: "/en/services/bp", Component: () => <span>bp-en</span> },
    ],
    initialEntries: ["/"],
    lang,
  })

describe("ResourceCard", () => {
  test("ResourceCard_internalJa_buildsLinkWithoutLangPrefix", () => {
    renderCard(buildService(), "src-ddbj-warm", "ja")
    expect(screen.getByRole("link", { name: /BioProject/ }))
      .toHaveAttribute("href", "/services/bp")
  })

  test("ResourceCard_internalEn_buildsLinkWithEnPrefix", () => {
    renderCard(buildService(), "src-ddbj-warm", "en")
    expect(screen.getByRole("link", { name: /BioProject/ }))
      .toHaveAttribute("href", "/en/services/bp")
  })

  test("ResourceCard_external_setsTargetAndRel", () => {
    renderCard(externalService, "src-dbcls-warm")
    const link = screen.getByRole("link", { name: /BioProject/ })
    expect(link).toHaveAttribute("href", "https://example.com/bp")
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", "noopener noreferrer")
  })

  test("ResourceCard_monogram_isRenderedFromTopMetadata", () => {
    renderCard(buildService(), "src-ddbj-mid")
    expect(screen.getByText("BP")).toBeInTheDocument()
  })

  test("ResourceCard_eachAccent_appliesCorrespondingPalette", () => {
    const cases: readonly { accent: ResourceAccent; classes: readonly string[] }[] = [
      { accent: "src-ddbj-warm", classes: ["bg-src-ddbj-warm/12", "text-src-ddbj-warm"] },
      { accent: "src-ddbj-mid", classes: ["bg-src-ddbj-mid/12", "text-src-ddbj-mid"] },
      { accent: "src-ddbj-deep", classes: ["bg-src-ddbj-deep/12", "text-src-ddbj-deep"] },
      { accent: "src-dbcls-warm", classes: ["bg-src-dbcls-warm/12", "text-src-dbcls-warm"] },
      { accent: "src-dbcls-mid", classes: ["bg-src-dbcls-mid/12", "text-src-dbcls-mid"] },
    ]
    for (const { accent, classes } of cases) {
      const { container, unmount } = renderCard(buildService(), accent)
      const monogramBox = container.querySelector(".w-9.h-9")
      if (monogramBox === null) {
        unmount()
        throw new Error(`monogram box not found for accent=${accent}`)
      }
      expect(monogramBox).toHaveClass(...classes)
      unmount()
    }
  })

  test("ResourceCard_titleAndDescription_truncate", () => {
    const { container } = renderCard(buildService(), "src-ddbj-warm")
    const title = container.querySelector(".text-fs-body.font-bold")
    expect(title).toHaveClass("overflow-hidden", "text-ellipsis", "whitespace-nowrap")
  })

  test("ResourceCard_titleUsesGivenLang", () => {
    const ja = buildService({
      title: { ja: "日本語タイトル", en: "English title" },
    })
    renderCard(ja, "src-ddbj-warm", "en")
    expect(screen.getByText("English title")).toBeInTheDocument()
    expect(screen.queryByText("日本語タイトル")).toBeNull()
  })
})
