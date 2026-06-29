import { test } from "@fast-check/vitest"
import fc from "fast-check"
import { describe, expect } from "vitest"

import { buildSitemapEntries, renderSitemapXml } from "../../../../server/api/sitemap"

const STATIC_PATH_COUNT = 5

const arbContentPath = fc.stringMatching(/^\/[a-z][a-z0-9-]{0,15}(\/[a-z][a-z0-9-]{0,15}){0,2}$/)
const arbContentPathSet = fc.uniqueArray(arbContentPath, { maxLength: 10 })

const ORIGIN = "https://portal.example.test"

describe("buildSitemapEntries PBT", () => {
  test.prop([arbContentPathSet])(
    "buildSitemapEntries_anyPathSet_entryCountIsTwiceStaticPlusPaths",
    (paths) => {
      const entries = buildSitemapEntries(ORIGIN, paths)
      expect(entries.length).toBe((STATIC_PATH_COUNT + paths.length) * 2)
    },
  )

  test.prop([arbContentPathSet])(
    "buildSitemapEntries_anyPathSet_everyLocStartsWithOrigin",
    (paths) => {
      const entries = buildSitemapEntries(ORIGIN, paths)
      for (const entry of entries) {
        expect(entry.loc.startsWith(ORIGIN)).toBe(true)
      }
    },
  )

  test.prop([arbContentPathSet])(
    "buildSitemapEntries_anyPathSet_everyLocEndsWithLangQuery",
    (paths) => {
      const entries = buildSitemapEntries(ORIGIN, paths)
      for (const entry of entries) {
        expect(entry.loc.endsWith("?lang=ja") || entry.loc.endsWith("?lang=en")).toBe(true)
      }
    },
  )

  test.prop([arbContentPathSet])(
    "buildSitemapEntries_everyEntry_hasThreeAlternatesJaEnXDefault",
    (paths) => {
      const entries = buildSitemapEntries(ORIGIN, paths)
      for (const entry of entries) {
        const hreflangs = entry.alternates.map((a) => a.hreflang).sort()
        expect(hreflangs).toEqual(["en", "ja", "x-default"])
      }
    },
  )

  test.prop([arbContentPathSet])(
    "buildSitemapEntries_eachPath_yieldsJaAndEnUrls",
    (paths) => {
      const entries = buildSitemapEntries(ORIGIN, paths)
      const locs = entries.map((e) => e.loc)
      for (const p of paths) {
        expect(locs).toContain(`${ORIGIN}${p}?lang=ja`)
        expect(locs).toContain(`${ORIGIN}${p}?lang=en`)
      }
    },
  )

  test.prop([arbContentPathSet])(
    "renderSitemapXml_anyEntryList_locCountMatchesEntryCount",
    (paths) => {
      const entries = buildSitemapEntries(ORIGIN, paths)
      const xml = renderSitemapXml(entries)
      const matches = xml.match(/<loc>/g) ?? []
      expect(matches.length).toBe(entries.length)
    },
  )

  test.prop([arbContentPathSet])(
    "renderSitemapXml_anyEntryList_xhtmlLinkCountIsThreePerEntry",
    (paths) => {
      const entries = buildSitemapEntries(ORIGIN, paths)
      const xml = renderSitemapXml(entries)
      const matches = xml.match(/<xhtml:link /g) ?? []
      expect(matches.length).toBe(entries.length * 3)
    },
  )
})
