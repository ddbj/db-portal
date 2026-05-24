import { describe, expect, test } from "vitest"

import {
  EXTERNAL_SERVICES,
  INTERNAL_SERVICES,
  isExternalService,
  isInternalService,
  Service,
  SERVICE_PHYSICAL_ORDER,
  serviceBadgeColor,
} from "../../../../app/schemas/submit"

describe("Service enum and helpers", () => {
  test("Service_fourteenOptions", () => {
    expect(Service.options).toHaveLength(14)
  })

  test("INTERNAL_and_EXTERNAL_partitionService", () => {
    const internalSet = new Set(INTERNAL_SERVICES)
    const externalSet = new Set(EXTERNAL_SERVICES)
    for (const s of Service.options) {
      const isI = internalSet.has(s)
      const isE = externalSet.has(s)
      expect(isI !== isE).toBe(true)
    }
    expect(internalSet.size + externalSet.size).toBe(Service.options.length)
  })

  test("isInternalService_bioproject_true", () => {
    expect(isInternalService("bioproject")).toBe(true)
  })

  test("isExternalService_humandbs_true", () => {
    expect(isExternalService("humandbs")).toBe(true)
  })

  test("serviceBadgeColor_internalNoWarning_emerald", () => {
    expect(serviceBadgeColor({ service: "bioproject", hasWarningOrError: false })).toBe("emerald")
  })

  test("serviceBadgeColor_externalNoWarning_amber", () => {
    expect(serviceBadgeColor({ service: "eva", hasWarningOrError: false })).toBe("amber")
  })

  test("serviceBadgeColor_anyServiceWithWarning_rose", () => {
    expect(serviceBadgeColor({ service: "biosample", hasWarningOrError: true })).toBe("rose")
    expect(serviceBadgeColor({ service: "jpost", hasWarningOrError: true })).toBe("rose")
  })

  test("SERVICE_PHYSICAL_ORDER_coversAllServices", () => {
    expect(new Set(SERVICE_PHYSICAL_ORDER)).toEqual(new Set(Service.options))
  })

  test("SERVICE_PHYSICAL_ORDER_umbrellaBeforeBioproject", () => {
    const umIdx = SERVICE_PHYSICAL_ORDER.indexOf("umbrella-bioproject")
    const bpIdx = SERVICE_PHYSICAL_ORDER.indexOf("bioproject")
    const bsIdx = SERVICE_PHYSICAL_ORDER.indexOf("biosample")
    expect(umIdx).toBeLessThan(bpIdx)
    expect(bpIdx).toBeLessThan(bsIdx)
  })
})
