import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

import { afterEach, beforeEach, describe, expect, test } from "vitest"

import { listContentPaths } from "../../../../server/api/sitemap"

let root: string

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "sitemap-paths-"))
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

const writeMd = async (relPath: string): Promise<void> => {
  const full = path.join(root, relPath)
  await mkdir(path.dirname(full), { recursive: true })
  await writeFile(full, "---\ntitle: t\n---\n\nbody\n", "utf8")
}

describe("listContentPaths", () => {
  test("listContentPaths_siblingMdAtDeepPath_emittedAsUrl", async () => {
    // page-contents/policy/term-of-use.md は /policy/term-of-use として
    // catch-all route 経由で reachable。 sitemap も拾う必要がある。
    await writeMd("policy/index.md")
    await writeMd("policy/term-of-use.md")

    const paths = await listContentPaths(root)

    expect(paths).toContain("/policy")
    expect(paths).toContain("/policy/term-of-use")
  })

  test("listContentPaths_devUnderscorePath_excludedFromSitemap", async () => {
    // _dev/* は dev preview の規約上 production sitemap に含めない
    // (search-index / content-tree / sitemap-loader と同じ規約)。
    await writeMd("_dev/markdown-showcase/index.md")
    await writeMd("policy/index.md")

    const paths = await listContentPaths(root)

    expect(paths).not.toContain("/_dev/markdown-showcase")
    expect(paths).not.toContain("/_dev")
    expect(paths).toContain("/policy")
  })

  test("listContentPaths_enMdFile_doesNotEmitSeparateEntry", async () => {
    // .en.md は同一 URL の英語ペアであり別 entry を生まない。
    await writeMd("policy/term-of-use.md")
    await writeMd("policy/term-of-use.en.md")

    const paths = await listContentPaths(root)

    const matching = paths.filter((p) => p === "/policy/term-of-use")
    expect(matching).toHaveLength(1)
  })

  test("listContentPaths_indexMdFile_collapsedToParentUrl", async () => {
    // index.md は親ディレクトリ URL に畳まれ、 親 URL の単独 entry になる。
    await writeMd("submit/index.md")

    const paths = await listContentPaths(root)

    expect(paths).toContain("/submit")
    expect(paths).not.toContain("/submit/index")
  })

  test("listContentPaths_nonMdFile_ignored", async () => {
    // 画像等の non-md は sitemap に出さない。
    await mkdir(path.join(root, "policy"), { recursive: true })
    await writeFile(path.join(root, "policy/image.png"), "binary", "utf8")
    await writeMd("policy/index.md")

    const paths = await listContentPaths(root)

    expect(paths).toEqual(["/policy"])
  })

  test("listContentPaths_missingRoot_returnsEmpty", async () => {
    const paths = await listContentPaths(path.join(root, "does-not-exist"))

    expect(paths).toEqual([])
  })
})
