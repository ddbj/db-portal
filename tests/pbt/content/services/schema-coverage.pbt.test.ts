import { fc, test } from "@fast-check/vitest"
import { describe, expect } from "vitest"

import { ServiceContent } from "~/schemas/content/service-content"
import { Service as SubmitService } from "~/schemas/submit"

const Bilingual = fc.record({
  ja: fc.stringMatching(/^[A-Za-z0-9 ]{1,20}$/),
  en: fc.stringMatching(/^[A-Za-z0-9 ]{1,20}$/),
})

const submitServiceArb = fc.constantFrom(...SubmitService.options)

const internalLinkArb = fc.record({
  kind: fc.constant("internal" as const),
  to: fc.constantFrom("/search", "/submit", "/databases/x"),
})

const externalLinkArb = fc.record({
  kind: fc.constant("external" as const),
  href: fc.constantFrom("https://example.com/a", "https://example.org/b"),
})

const linkArb = fc.oneof(internalLinkArb, externalLinkArb)

const topArb = fc.record({
  category: fc.constant("primary-service" as const),
  order: fc.nat({ max: 20 }),
})

const urlArb = fc.constantFrom("https://example.com/a", "https://example.org/b")

const submitArb = fc.record({
  service: submitServiceArb,
  externalUrl: fc.record({
    ja: urlArb,
    en: fc.oneof(urlArb, fc.constant(null)),
  }),
  source: fc.constantFrom("DDBJ" as const, "DBCLS" as const, null),
  accessionPlaceholders: fc.array(fc.stringMatching(/^[A-Z]{2,8}#+$/), { maxLength: 3 }),
})

describe("ServiceContent schema", () => {
  test.prop([
    fc.stringMatching(/^[a-z][a-z0-9-]{0,10}$/),
    Bilingual,
    Bilingual,
    linkArb,
    topArb,
    submitArb,
  ])(
    "serviceContent_withTopAndLink_parsesSuccessfully",
    (id, title, description, link, top, submit) => {
      const entry = { id, title, description, link, top, submit }
      const result = ServiceContent.safeParse(entry)
      expect(result.success).toBe(true)
    },
  )

  test.prop([
    fc.stringMatching(/^[a-z][a-z0-9-]{0,10}$/),
    Bilingual,
    Bilingual,
    submitArb,
  ])(
    "serviceContent_submitOnly_parsesSuccessfully",
    (id, title, description, submit) => {
      const entry = { id, title, description, submit }
      const result = ServiceContent.safeParse(entry)
      expect(result.success).toBe(true)
    },
  )

  test.prop([
    fc.stringMatching(/^[a-z][a-z0-9-]{0,10}$/),
    Bilingual,
    Bilingual,
  ])(
    "serviceContent_withNeitherTopNorSubmit_failsParse",
    (id, title, description) => {
      const entry = { id, title, description }
      const result = ServiceContent.safeParse(entry)
      expect(result.success).toBe(false)
    },
  )

  test.prop([
    fc.stringMatching(/^[a-z][a-z0-9-]{0,10}$/),
    Bilingual,
    Bilingual,
    topArb,
  ])(
    "serviceContent_topWithoutLink_failsParse",
    (id, title, description, top) => {
      const entry = { id, title, description, top }
      const result = ServiceContent.safeParse(entry)
      expect(result.success).toBe(false)
    },
  )
})
