import { render } from "@testing-library/react"
import type { ReactNode } from "react"
import { I18nextProvider } from "react-i18next"
import { describe, expect, test } from "vitest"

import { EditOnGitHubLink } from "~/features/docs/edit-on-github-link"
import { DEFAULT_BRANCH, REPO_URL } from "~/lib/content/edit-url"
import { createI18nInstance, type Lang, LangProvider } from "~/lib/i18n"

const renderWithLang = (lang: Lang, ui: ReactNode) =>
  render(
    <LangProvider value={lang}>
      <I18nextProvider i18n={createI18nInstance(lang)}>{ui}</I18nextProvider>
    </LangProvider>,
  )

const findLink = (container: HTMLElement) => container.querySelector("a") as HTMLAnchorElement | null

describe("EditOnGitHubLink", () => {
  test("EditOnGitHubLink_ja_rendersJaHref", () => {
    const { container } = renderWithLang(
      "ja",
      <EditOnGitHubLink
        sourcePath={{
          ja: "page-contents/bioproject/index.md",
          en: "page-contents/bioproject/index.en.md",
        }}
      />,
    )
    const link = findLink(container)
    expect(link?.getAttribute("href")).toBe(
      `${REPO_URL}/edit/${DEFAULT_BRANCH}/page-contents/bioproject/index.md`,
    )
  })

  test("EditOnGitHubLink_en_rendersEnHref", () => {
    const { container } = renderWithLang(
      "en",
      <EditOnGitHubLink
        sourcePath={{
          ja: "page-contents/bioproject/index.md",
          en: "page-contents/bioproject/index.en.md",
        }}
      />,
    )
    const link = findLink(container)
    expect(link?.getAttribute("href")).toBe(
      `${REPO_URL}/edit/${DEFAULT_BRANCH}/page-contents/bioproject/index.en.md`,
    )
  })

  test("EditOnGitHubLink_enWithoutEnSource_fallsBackToJaHref", () => {
    const { container } = renderWithLang(
      "en",
      <EditOnGitHubLink sourcePath={{ ja: "page-contents/policy/index.md" }} />,
    )
    const link = findLink(container)
    expect(link?.getAttribute("href")).toBe(
      `${REPO_URL}/edit/${DEFAULT_BRANCH}/page-contents/policy/index.md`,
    )
  })

  test("EditOnGitHubLink_setsExternalLinkSafetyAttributes", () => {
    const { container } = renderWithLang(
      "ja",
      <EditOnGitHubLink sourcePath={{ ja: "page-contents/bioproject/index.md" }} />,
    )
    const link = findLink(container)
    expect(link?.getAttribute("target")).toBe("_blank")
    expect(link?.getAttribute("rel")).toBe("noopener noreferrer")
  })

  test("EditOnGitHubLink_ja_usesJaAriaLabel", () => {
    const { container } = renderWithLang(
      "ja",
      <EditOnGitHubLink sourcePath={{ ja: "page-contents/bioproject/index.md" }} />,
    )
    const link = findLink(container)
    expect(link?.getAttribute("aria-label")).toBe("GitHub でこのページを編集")
  })

  test("EditOnGitHubLink_en_usesEnAriaLabel", () => {
    const { container } = renderWithLang(
      "en",
      <EditOnGitHubLink sourcePath={{ ja: "page-contents/bioproject/index.md" }} />,
    )
    const link = findLink(container)
    expect(link?.getAttribute("aria-label")).toBe("Edit this page on GitHub")
  })

  test("EditOnGitHubLink_iconPrecedesLabel", () => {
    const { container } = renderWithLang(
      "ja",
      <EditOnGitHubLink sourcePath={{ ja: "page-contents/bioproject/index.md" }} />,
    )
    const link = findLink(container)
    const children = Array.from(link?.children ?? [])
    expect(children[0]?.tagName).toBe("svg")
    expect(children[1]?.tagName).toBe("SPAN")
    expect(children[1]?.textContent).toBe("Edit")
  })
})
