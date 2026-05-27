import { test } from "@fast-check/vitest"
import fc from "fast-check"
import { describe, expect } from "vitest"

import { NewsCategory, NewsSource } from "~/schemas/api-bff/news"

import { tagsToCategory } from "../../../../server/news/normalize"

const arbAnyTag = fc.string({ minLength: 0, maxLength: 30 })
const arbTagList = fc.array(arbAnyTag, { minLength: 0, maxLength: 5 })
const arbSource = fc.constantFrom(...NewsSource.options)

const DDBJ_KNOWN = [
  "お知らせ",
  "Announcement",
  "データ公開",
  "Data Release",
  "メンテナンス",
  "Maintenance",
] as const

const DBCLS_KNOWN = ["public_relations", "events", "registration", "services", "other"] as const

const DDBJ_EXPECTED: Record<(typeof DDBJ_KNOWN)[number], string> = {
  "お知らせ": "announcement",
  "Announcement": "announcement",
  "データ公開": "data-release",
  "Data Release": "data-release",
  "メンテナンス": "maintenance",
  "Maintenance": "maintenance",
}

const DBCLS_EXPECTED: Record<(typeof DBCLS_KNOWN)[number], string> = {
  public_relations: "announcement",
  events: "event",
  registration: "event",
  services: "service",
  other: "other",
}

describe("tagsToCategory PBT", () => {
  test.prop([arbSource, arbTagList])(
    "tagsToCategory_anyTagList_returnsValidEnumMember",
    (source, tags) => {
      const result = tagsToCategory(source, tags)
      expect(NewsCategory.options as readonly string[]).toContain(result)
    },
  )

  test.prop([arbSource, arbTagList])(
    "tagsToCategory_repeatedApplication_returnsValidEnumMember",
    (source, tags) => {
      const first = tagsToCategory(source, tags)
      const second = tagsToCategory(source, [first])
      expect(NewsCategory.options as readonly string[]).toContain(second)
    },
  )

  test.prop([arbSource, arbTagList])(
    "tagsToCategory_prependEmptyTag_doesNotAlterResult",
    (source, tags) => {
      expect(tagsToCategory(source, ["", ...tags])).toBe(tagsToCategory(source, tags))
    },
  )

  test.prop([arbSource, arbTagList, arbAnyTag])(
    "tagsToCategory_appendArbitraryTag_keepsResultIfFirstMatchPersists",
    (source, tags, extra) => {
      const original = tagsToCategory(source, tags)
      const withExtra = tagsToCategory(source, [...tags, extra])
      expect(original === "other" || withExtra === original).toBe(true)
    },
  )

  test("tagsToCategory_ddbjKnownTags_mapToExpectedCategory", () => {
    for (const tag of DDBJ_KNOWN) {
      expect(tagsToCategory("ddbj", [tag])).toBe(DDBJ_EXPECTED[tag])
    }
  })

  test("tagsToCategory_dbclsKnownTags_mapToExpectedCategory", () => {
    for (const tag of DBCLS_KNOWN) {
      expect(tagsToCategory("dbcls", [tag])).toBe(DBCLS_EXPECTED[tag])
    }
  })

  test("tagsToCategory_mappingsAreSourceScoped", () => {
    // DDBJ-only tag should not match against DBCLS source
    expect(tagsToCategory("dbcls", ["お知らせ"])).toBe("other")
    // DBCLS-only tag should not match against DDBJ source
    expect(tagsToCategory("ddbj", ["public_relations"])).toBe("other")
  })
})
