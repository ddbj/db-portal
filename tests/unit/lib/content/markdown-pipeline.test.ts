import { describe, expect, test, vi } from "vitest"

import { markdownToHtml } from "~/lib/content/markdown-pipeline"

const sourceDir = "/page-contents/databases/bioproject"
const assetPaths: ReadonlySet<string> = new Set([
  "/page-contents/databases/bioproject/foo.png",
  "/page-contents/databases/bioproject/subdir/bar.jpg",
  "/page-contents/databases/bioproject/guide.pdf",
  "/page-contents/databases/bioproject/FOO.PNG",
])
const noUnresolved = () => undefined

describe("markdownToHtml asset resolution", () => {
  test("markdownToHtml_relativeImageWithDotSlash_resolvedToAbsolutePath", () => {
    const html = markdownToHtml("![alt](./foo.png)", {
      sourceDir,
      assetPaths,
      onUnresolved: noUnresolved,
    })
    expect(html).toContain('src="/page-contents/databases/bioproject/foo.png"')
    expect(html).not.toContain("./foo.png")
  })

  test("markdownToHtml_relativeImageWithoutDotSlash_resolvedToAbsolutePath", () => {
    const html = markdownToHtml("![alt](foo.png)", {
      sourceDir,
      assetPaths,
      onUnresolved: noUnresolved,
    })
    expect(html).toContain('src="/page-contents/databases/bioproject/foo.png"')
  })

  test("markdownToHtml_subdirImagePath_resolvedToAbsolutePath", () => {
    const html = markdownToHtml("![alt](./subdir/bar.jpg)", {
      sourceDir,
      assetPaths,
      onUnresolved: noUnresolved,
    })
    expect(html).toContain('src="/page-contents/databases/bioproject/subdir/bar.jpg"')
  })

  test("markdownToHtml_htmlImgWithRelativeSrc_resolvedToAbsolutePath", () => {
    const html = markdownToHtml(
      '<img src="./foo.png" alt="x" width="200" />',
      { sourceDir, assetPaths, onUnresolved: noUnresolved },
    )
    expect(html).toContain('src="/page-contents/databases/bioproject/foo.png"')
  })

  test("markdownToHtml_relativePdfLink_resolvedToAbsolutePath", () => {
    const html = markdownToHtml("[guide](./guide.pdf)", {
      sourceDir,
      assetPaths,
      onUnresolved: noUnresolved,
    })
    expect(html).toContain('href="/page-contents/databases/bioproject/guide.pdf"')
  })

  test("markdownToHtml_absoluteUrlImage_unchanged", () => {
    const html = markdownToHtml("![alt](https://example.com/x.png)", {
      sourceDir,
      assetPaths,
      onUnresolved: noUnresolved,
    })
    expect(html).toContain('src="https://example.com/x.png"')
  })

  test("markdownToHtml_rootRelativeImage_unchanged", () => {
    const html = markdownToHtml("![alt](/static/x.png)", {
      sourceDir,
      assetPaths,
      onUnresolved: noUnresolved,
    })
    expect(html).toContain('src="/static/x.png"')
  })

  test("markdownToHtml_anchorHref_unchanged", () => {
    const html = markdownToHtml("[jump](#section)", {
      sourceDir,
      assetPaths,
      onUnresolved: noUnresolved,
    })
    expect(html).toContain('href="#section"')
  })

  test("markdownToHtml_mailtoHref_unchanged", () => {
    const html = markdownToHtml("[mail](mailto:test@example.com)", {
      sourceDir,
      assetPaths,
      onUnresolved: noUnresolved,
    })
    expect(html).toContain('href="mailto:test@example.com"')
  })

  test("markdownToHtml_pageLinkWithoutExtension_unchanged", () => {
    const html = markdownToHtml("[other](/databases/dra)", {
      sourceDir,
      assetPaths,
      onUnresolved: noUnresolved,
    })
    expect(html).toContain('href="/databases/dra"')
  })

  test("markdownToHtml_unsupportedExtension_unchanged", () => {
    const html = markdownToHtml("[doc](./guide.docx)", {
      sourceDir,
      assetPaths,
      onUnresolved: noUnresolved,
    })
    expect(html).toContain('href="./guide.docx"')
  })

  test("markdownToHtml_unresolvedRelativeImagePath_callsOnUnresolvedWithOriginalRef", () => {
    const onUnresolved = vi.fn()
    markdownToHtml("![alt](./not-exist.png)", {
      sourceDir,
      assetPaths,
      onUnresolved,
    })
    expect(onUnresolved).toHaveBeenCalledTimes(1)
    expect(onUnresolved).toHaveBeenCalledWith("./not-exist.png")
  })

  test("markdownToHtml_unresolvedRelativeImagePath_keepsOriginalSrcInOutput", () => {
    const html = markdownToHtml("![alt](./not-exist.png)", {
      sourceDir,
      assetPaths,
      onUnresolved: noUnresolved,
    })
    expect(html).toContain('src="./not-exist.png"')
  })

  test("markdownToHtml_absoluteUrlImage_doesNotCallOnUnresolved", () => {
    const onUnresolved = vi.fn()
    markdownToHtml("![alt](https://example.com/x.png)", {
      sourceDir,
      assetPaths,
      onUnresolved,
    })
    expect(onUnresolved).not.toHaveBeenCalled()
  })

  test("markdownToHtml_uppercaseExtension_resolvedCaseInsensitively", () => {
    const html = markdownToHtml("![alt](./FOO.PNG)", {
      sourceDir,
      assetPaths,
      onUnresolved: noUnresolved,
    })
    expect(html).toContain('src="/page-contents/databases/bioproject/FOO.PNG"')
  })
})
