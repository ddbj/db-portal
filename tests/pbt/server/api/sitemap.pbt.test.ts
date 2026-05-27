import { test } from "@fast-check/vitest"
import fc from "fast-check"
import { describe, expect } from "vitest"

import { buildSitemapEntries, renderSitemapXml } from "../../../../server/api/sitemap"

const STATIC_PATH_COUNT = 4

const arbSlug = fc.stringMatching(/^[a-z][a-z0-9-]{0,30}$/)
const arbSlugSet = fc.uniqueArray(arbSlug, { maxLength: 10 })

const ORIGIN = "https://portal.example.test"

describe("buildSitemapEntries PBT", () => {
  test.prop([arbSlugSet])(
    "buildSitemapEntries_anySlugSet_entryCountIsTwiceStaticPlusSlugs",
    (slugs) => {
      const entries = buildSitemapEntries(ORIGIN, slugs)
      expect(entries.length).toBe((STATIC_PATH_COUNT + slugs.length) * 2)
    },
  )

  test.prop([arbSlugSet])(
    "buildSitemapEntries_anySlugSet_everyLocStartsWithOrigin",
    (slugs) => {
      const entries = buildSitemapEntries(ORIGIN, slugs)
      for (const entry of entries) {
        expect(entry.loc.startsWith(ORIGIN)).toBe(true)
      }
    },
  )

  test.prop([arbSlugSet])(
    "buildSitemapEntries_anySlugSet_everyLocEndsWithLangQuery",
    (slugs) => {
      const entries = buildSitemapEntries(ORIGIN, slugs)
      for (const entry of entries) {
        expect(entry.loc.endsWith("?lang=ja") || entry.loc.endsWith("?lang=en")).toBe(true)
      }
    },
  )

  test.prop([arbSlugSet])(
    "buildSitemapEntries_everyEntry_hasThreeAlternatesJaEnXDefault",
    (slugs) => {
      const entries = buildSitemapEntries(ORIGIN, slugs)
      for (const entry of entries) {
        const hreflangs = entry.alternates.map((a) => a.hreflang).sort()
        expect(hreflangs).toEqual(["en", "ja", "x-default"])
      }
    },
  )

  test.prop([arbSlugSet])(
    "buildSitemapEntries_eachSlug_yieldsJaAndEnDatabasesUrls",
    (slugs) => {
      const entries = buildSitemapEntries(ORIGIN, slugs)
      const locs = entries.map((e) => e.loc)
      for (const slug of slugs) {
        expect(locs).toContain(`${ORIGIN}/databases/${slug}?lang=ja`)
        expect(locs).toContain(`${ORIGIN}/databases/${slug}?lang=en`)
      }
    },
  )

  test.prop([arbSlugSet])(
    "renderSitemapXml_anyEntryList_locCountMatchesEntryCount",
    (slugs) => {
      const entries = buildSitemapEntries(ORIGIN, slugs)
      const xml = renderSitemapXml(entries)
      const matches = xml.match(/<loc>/g) ?? []
      expect(matches.length).toBe(entries.length)
    },
  )

  test.prop([arbSlugSet])(
    "renderSitemapXml_anyEntryList_xhtmlLinkCountIsThreePerEntry",
    (slugs) => {
      const entries = buildSitemapEntries(ORIGIN, slugs)
      const xml = renderSitemapXml(entries)
      const matches = xml.match(/<xhtml:link /g) ?? []
      expect(matches.length).toBe(entries.length * 3)
    },
  )
})
