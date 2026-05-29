import { test } from "@fast-check/vitest"
import fc from "fast-check"
import { describe, expect } from "vitest"

import { ServiceCategory } from "~/schemas/api-bff/service"

import {
  dbclsCategoriesFrom,
  ddbjTagsToCategories,
  nameSlug,
} from "../../../../server/services/normalize"

const ENUM = ServiceCategory.options as readonly string[]

const isValidAndDeduped = (categories: readonly string[]): boolean =>
  categories.length > 0
  && categories.every((c) => ENUM.includes(c))
  && categories.length === new Set(categories).size

const ddbjKnown = fc.constantFrom("database", "submission", "search", "analysis", "annotation")
const arbTag = fc.oneof(ddbjKnown, fc.string({ maxLength: 12 }))
const arbTagList = fc.array(arbTag, { maxLength: 6 })

const categoryFlags = fc.record(
  Object.fromEntries(
    Array.from({ length: 10 }, (_, i) => [`Category_${i + 1}`, fc.boolean()]),
  ),
)

describe("ddbjTagsToCategories PBT", () => {
  test.prop([arbTagList])("any tag list yields a valid, non-empty, deduped category set", (tags) => {
    expect(isValidAndDeduped(ddbjTagsToCategories(tags))).toBe(true)
  })

  test("known tags map to expected categories", () => {
    expect(ddbjTagsToCategories(["database"])).toEqual(["repository"])
    expect(ddbjTagsToCategories(["submission"])).toEqual(["repository"])
    expect(ddbjTagsToCategories(["search"])).toEqual(["search"])
    expect(ddbjTagsToCategories(["analysis"])).toEqual(["analysis"])
    expect(ddbjTagsToCategories(["annotation"])).toEqual(["annotation"])
  })

  test("unknown tags fall back to other", () => {
    expect(ddbjTagsToCategories(["unknown", "xyz"])).toEqual(["other"])
    expect(ddbjTagsToCategories([])).toEqual(["other"])
  })
})

describe("dbclsCategoriesFrom PBT", () => {
  test.prop([categoryFlags])("any Category flag combo yields a valid, non-empty, deduped set", (flags) => {
    expect(isValidAndDeduped(dbclsCategoriesFrom(flags).categories)).toBe(true)
  })

  test("known Category flags map to expected categories", () => {
    expect(dbclsCategoriesFrom({ Category_1: true }).categories).toEqual(["integration"])
    expect(dbclsCategoriesFrom({ Category_9: true }).categories).toEqual(["search"])
    expect(dbclsCategoriesFrom({ Category_2: true }).categories).toEqual(["visualization"])
    expect(dbclsCategoriesFrom({ Category_6: true }).categories).toEqual(["analysis"])
    expect(dbclsCategoriesFrom({ Category_10: true }).categories).toEqual(["integration"])
  })

  test("domain-only Category flags fall back to other", () => {
    expect(dbclsCategoriesFrom({ Category_3: true }).categories).toEqual(["other"])
    expect(dbclsCategoriesFrom({ Category_4: true, Category_7: true }).categories).toEqual(["other"])
  })
})

describe("nameSlug PBT", () => {
  test.prop([fc.string({ maxLength: 40 })])("output is empty or a clean kebab token", (input) => {
    const slug = nameSlug(input)
    expect(slug === "" || /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)).toBe(true)
  })
})
