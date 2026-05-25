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
    "buildSitemapEntries_anySlugSet_urlCountIsTwiceStaticPlusSlugs",
    (slugs) => {
      const urls = buildSitemapEntries(ORIGIN, slugs)
      expect(urls.length).toBe((STATIC_PATH_COUNT + slugs.length) * 2)
    },
  )

  test.prop([arbSlugSet])(
    "buildSitemapEntries_anySlugSet_everyUrlStartsWithOrigin",
    (slugs) => {
      const urls = buildSitemapEntries(ORIGIN, slugs)
      for (const url of urls) {
        expect(url.startsWith(ORIGIN)).toBe(true)
      }
    },
  )

  test.prop([arbSlugSet])(
    "buildSitemapEntries_eachSlug_yieldsJaAndEnDatabasesUrls",
    (slugs) => {
      const urls = buildSitemapEntries(ORIGIN, slugs)
      for (const slug of slugs) {
        expect(urls).toContain(`${ORIGIN}/databases/${slug}`)
        expect(urls).toContain(`${ORIGIN}/en/databases/${slug}`)
      }
    },
  )

  test.prop([arbSlugSet])(
    "renderSitemapXml_anyUrlList_locCountMatchesUrlCount",
    (slugs) => {
      const urls = buildSitemapEntries(ORIGIN, slugs)
      const xml = renderSitemapXml(urls)
      const matches = xml.match(/<loc>/g) ?? []
      expect(matches.length).toBe(urls.length)
    },
  )
})
