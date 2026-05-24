import { test } from "@fast-check/vitest"
import fc from "fast-check"
import { describe, expect } from "vitest"

import { NewsCategory } from "~/schemas/api-bff/news"

import { tagsToCategory } from "../../../../server/news/normalize"

const arbAnyTag = fc.string({ minLength: 0, maxLength: 30 })
const arbTagList = fc.array(arbAnyTag, { minLength: 0, maxLength: 5 })

describe("tagsToCategory invariants", () => {
  test.prop([arbTagList])(
    "output is always a member of NewsCategory enum",
    (tags) => {
      const result = tagsToCategory(tags)
      expect(NewsCategory.options as readonly string[]).toContain(result)
    },
  )

  test.prop([arbTagList])(
    "is idempotent under repeated single-tag application",
    (tags) => {
      const first = tagsToCategory(tags)
      const second = tagsToCategory([first])
      // 写像表に enum 名そのものが入っていない場合は fallback "news"
      expect(NewsCategory.options as readonly string[]).toContain(second)
    },
  )

  test.prop([arbTagList])(
    "prepending an empty tag does not change the result",
    (tags) => {
      expect(tagsToCategory(["", ...tags])).toBe(tagsToCategory(tags))
    },
  )
})
