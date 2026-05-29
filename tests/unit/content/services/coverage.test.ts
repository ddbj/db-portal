import { describe, expect, test } from "vitest"

import { getServiceBySubmit, listServices } from "~/lib/content"
import { Service as SubmitService } from "~/schemas/submit"

describe("services collection coverage", () => {
  test("services_allEntriesParseSuccessfully", () => {
    expect(listServices().length).toBeGreaterThan(0)
  })

  test("services_coversAllSubmitServiceEnumValues", () => {
    const missing: string[] = []
    for (const service of SubmitService.options) {
      if (getServiceBySubmit(service) === undefined) {
        missing.push(service)
      }
    }
    expect(missing).toEqual([])
  })

  test("services_submitUsage_hasExternalUrl", () => {
    for (const service of SubmitService.options) {
      const entry = getServiceBySubmit(service)
      expect(entry?.submit?.externalUrl).toBeTypeOf("string")
    }
  })

  test("services_topPrimaryService_hasInternalOrExternalLink", () => {
    const primary = listServices().filter((s) => s.top?.category === "primary-service")
    expect(primary.length).toBeGreaterThan(0)
    for (const s of primary) {
      expect(s.link).toBeDefined()
    }
  })
})
