import { test } from "@fast-check/vitest"
import fc from "fast-check"
import { describe, expect } from "vitest"

import { NewsCategory } from "~/schemas/api-bff/news"

import { tagsToCategory } from "../../../../server/news/normalize"

const arbAnyTag = fc.string({ minLength: 0, maxLength: 30 })
const arbTagList = fc.array(arbAnyTag, { minLength: 0, maxLength: 5 })

describe("tagsToCategory PBT", () => {
  test.prop([arbTagList])(
    "tagsToCategory_anyTagList_returnsValidEnumMember",
    (tags) => {
      const result = tagsToCategory(tags)
      expect(NewsCategory.options as readonly string[]).toContain(result)
    },
  )

  test.prop([arbTagList])(
    "tagsToCategory_repeatedApplication_returnsValidEnumMember",
    (tags) => {
      const first = tagsToCategory(tags)
      const second = tagsToCategory([first])
      expect(NewsCategory.options as readonly string[]).toContain(second)
    },
  )

  test.prop([arbTagList])(
    "tagsToCategory_prependEmptyTag_doesNotAlterResult",
    (tags) => {
      expect(tagsToCategory(["", ...tags])).toBe(tagsToCategory(tags))
    },
  )

  test.prop([arbTagList, arbAnyTag])(
    "tagsToCategory_appendArbitraryTag_keepsResultIfFirstMatchPersists",
    (tags, extra) => {
      const original = tagsToCategory(tags)
      const withExtra = tagsToCategory([...tags, extra])
      // appended tag never overrides an earlier match
      expect(original === "news" || withExtra === original).toBe(true)
    },
  )
})
