import { test } from "@fast-check/vitest"
import fc from "fast-check"
import { describe, expect } from "vitest"

import { buildSitemapEntries, type LastUpdatedMap, renderSitemapXml } from "../../../../server/api/sitemap"

const STATIC_PATH_COUNT = 7

const arbContentPath = fc.stringMatching(/^\/[a-z][a-z0-9-]{0,15}(\/[a-z][a-z0-9-]{0,15}){0,2}$/)
const arbContentPathSet = fc.uniqueArray(arbContentPath, { maxLength: 10 })

const ORIGIN = "https://portal.example.test"

const arbIso = fc
  .date({ min: new Date("2000-01-01T00:00:00Z"), max: new Date("2100-01-01T00:00:00Z"), noInvalidDate: true })
  .map((d) => d.toISOString())
const arbEntry = fc.record({ ja: arbIso, en: arbIso }, { requiredKeys: [] })
// 一覧の path の一部に更新日を持たせる。一覧に無い path の記録も混ぜる。
const arbPathsAndLastUpdated: fc.Arbitrary<readonly [readonly string[], LastUpdatedMap]> = arbContentPathSet.chain((paths) =>
  fc.tuple(
    fc.subarray(paths),
    fc.array(arbEntry, { minLength: paths.length, maxLength: paths.length }),
    fc.dictionary(arbContentPath.filter((p) => !paths.includes(p)), arbEntry, { maxKeys: 3 }),
  ).map(([listed, entries, unlisted]) => {
    const map: LastUpdatedMap = { ...unlisted }
    listed.forEach((p, i) => {
      const entry = entries[i]
      if (entry !== undefined) map[p] = entry
    })

    return [paths, map] as const
  }),
)

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

  test.prop([arbPathsAndLastUpdated])(
    "buildSitemapEntries_anyLastUpdated_entryCountIsUnchanged",
    ([paths, lastUpdated]) => {
      expect(buildSitemapEntries(ORIGIN, paths, lastUpdated).length).toBe(buildSitemapEntries(ORIGIN, paths).length)
    },
  )

  test.prop([arbPathsAndLastUpdated])(
    "buildSitemapEntries_anyLastUpdated_lastmodIsTheRecordOfTheUrlsLanguage",
    ([paths, lastUpdated]) => {
      for (const entry of buildSitemapEntries(ORIGIN, paths, lastUpdated)) {
        const url = new URL(entry.loc)
        const lang = url.searchParams.get("lang")
        const expected = lang === "ja" || lang === "en" ? lastUpdated[url.pathname]?.[lang] : undefined
        expect(entry.lastmod).toBe(expected)
      }
    },
  )

  test.prop([arbPathsAndLastUpdated])(
    "renderSitemapXml_anyLastUpdated_lastmodCountEqualsEntriesWithLastmod",
    ([paths, lastUpdated]) => {
      const entries = buildSitemapEntries(ORIGIN, paths, lastUpdated)
      const xml = renderSitemapXml(entries)
      const expected = entries.filter((e) => e.lastmod !== undefined).length
      expect((xml.match(/<lastmod>/g) ?? []).length).toBe(expected)
    },
  )
})
