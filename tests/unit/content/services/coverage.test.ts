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

  test("services_popularDdbj_hasMonogram", () => {
    const ddbj = listServices().filter((s) => s.top?.category === "popular-ddbj")
    expect(ddbj.length).toBeGreaterThan(0)
    for (const s of ddbj) {
      const top = s.top
      if (top === undefined || top.category !== "popular-ddbj") continue
      expect(top.monogram).toMatch(/^[A-Z][A-Z0-9]{1,2}$/)
    }
  })

  test("services_popularDbcls_hasMonogram", () => {
    const dbcls = listServices().filter((s) => s.top?.category === "popular-dbcls")
    expect(dbcls.length).toBeGreaterThan(0)
    for (const s of dbcls) {
      const top = s.top
      if (top === undefined || top.category !== "popular-dbcls") continue
      expect(top.monogram).toMatch(/^[A-Z][A-Z0-9]{1,2}$/)
    }
  })
})
