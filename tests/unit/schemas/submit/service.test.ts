import { describe, expect, test } from "vitest"

import {
  COMPANION_SERVICES,
  DESTINATION_SERVICES,
  EXTERNAL_SERVICES,
  isCompanionService,
  isDestinationService,
  isExternalService,
  isSubmissionEndpoint,
  Service,
  SERVICE_DEPENDENCIES,
  SERVICE_DEPENDENCY_ORDER,
  SERVICE_ROLE,
  serviceBadgeColor,
  ServiceRole,
  serviceRole,
  serviceRoleTagKey,
} from "../../../../app/schemas/submit"

const ALL_SERVICES = Service.options

describe("Service enum and role partition", () => {
  test("Service_twelveOptions", () => {
    expect(ALL_SERVICES).toHaveLength(12)
  })

  test("SERVICE_ROLE_keysExactlyMatchServiceOptions", () => {
    expect(new Set(Object.keys(SERVICE_ROLE))).toEqual(new Set(ALL_SERVICES))
    expect(Object.keys(SERVICE_ROLE)).toHaveLength(ALL_SERVICES.length)
  })

  test("SERVICE_ROLE_everyValueIsValidRole", () => {
    const validRoles = new Set(ServiceRole.options)
    for (const s of ALL_SERVICES) {
      expect(validRoles.has(SERVICE_ROLE[s])).toBe(true)
    }
  })

  test("serviceRole_matchesSERVICE_ROLEForEveryService", () => {
    for (const s of ALL_SERVICES) {
      expect(serviceRole(s)).toBe(SERVICE_ROLE[s])
    }
  })

  test("roleSubsets_eachMemberHasMatchingRole", () => {
    for (const s of DESTINATION_SERVICES) expect(serviceRole(s)).toBe("destination")
    for (const s of COMPANION_SERVICES) expect(serviceRole(s)).toBe("companion")
    for (const s of EXTERNAL_SERVICES) expect(serviceRole(s)).toBe("external")
  })

  test("roleSubsets_containEveryServiceOfThatRole", () => {
    expect(new Set(DESTINATION_SERVICES)).toEqual(
      new Set(ALL_SERVICES.filter((s) => SERVICE_ROLE[s] === "destination")),
    )
    expect(new Set(COMPANION_SERVICES)).toEqual(
      new Set(ALL_SERVICES.filter((s) => SERVICE_ROLE[s] === "companion")),
    )
    expect(new Set(EXTERNAL_SERVICES)).toEqual(
      new Set(ALL_SERVICES.filter((s) => SERVICE_ROLE[s] === "external")),
    )
  })

  test("roleSubsets_haveNoDuplicateEntries", () => {
    expect(new Set(DESTINATION_SERVICES).size).toBe(DESTINATION_SERVICES.length)
    expect(new Set(COMPANION_SERVICES).size).toBe(COMPANION_SERVICES.length)
    expect(new Set(EXTERNAL_SERVICES).size).toBe(EXTERNAL_SERVICES.length)
  })

  test("roleSubsets_areMutuallyExclusive", () => {
    for (const s of ALL_SERVICES) {
      const memberships = [
        DESTINATION_SERVICES.includes(s),
        COMPANION_SERVICES.includes(s),
        EXTERNAL_SERVICES.includes(s),
      ].filter(Boolean)
      expect(memberships).toHaveLength(1)
    }
  })

  test("roleSubsets_unionPartitionsAllServices", () => {
    const union = new Set([
      ...DESTINATION_SERVICES,
      ...COMPANION_SERVICES,
      ...EXTERNAL_SERVICES,
    ])
    expect(union).toEqual(new Set(ALL_SERVICES))
    expect(
      DESTINATION_SERVICES.length + COMPANION_SERVICES.length + EXTERNAL_SERVICES.length,
    ).toBe(ALL_SERVICES.length)
  })
})

describe("isDestination/Companion/External predicates", () => {
  test("predicates_agreeWithRoleForEveryService", () => {
    for (const s of ALL_SERVICES) {
      expect(isDestinationService(s)).toBe(SERVICE_ROLE[s] === "destination")
      expect(isCompanionService(s)).toBe(SERVICE_ROLE[s] === "companion")
      expect(isExternalService(s)).toBe(SERVICE_ROLE[s] === "external")
    }
  })

  test("predicates_exactlyOneTruePerService", () => {
    for (const s of ALL_SERVICES) {
      const trues = [
        isDestinationService(s),
        isCompanionService(s),
        isExternalService(s),
      ].filter(Boolean)
      expect(trues).toHaveLength(1)
    }
  })

  test("isDestinationService_dra_true", () => {
    expect(isDestinationService("dra")).toBe(true)
    expect(isCompanionService("dra")).toBe(false)
    expect(isExternalService("dra")).toBe(false)
  })

  test("isCompanionService_bioproject_true", () => {
    expect(isCompanionService("bioproject")).toBe(true)
    expect(isCompanionService("biosample")).toBe(true)
  })

  test("isExternalService_humandbs_true", () => {
    expect(isExternalService("humandbs")).toBe(true)
    expect(isExternalService("eva")).toBe(true)
  })
})

describe("serviceBadgeColor", () => {
  test("badgeColor_companionNoWarning_emerald", () => {
    for (const s of COMPANION_SERVICES) {
      expect(serviceBadgeColor({ service: s, hasWarningOrError: false })).toBe("emerald")
    }
  })

  test("badgeColor_destinationNoWarning_emerald", () => {
    for (const s of DESTINATION_SERVICES) {
      expect(serviceBadgeColor({ service: s, hasWarningOrError: false })).toBe("emerald")
    }
  })

  test("badgeColor_externalNoWarning_amber", () => {
    for (const s of EXTERNAL_SERVICES) {
      expect(serviceBadgeColor({ service: s, hasWarningOrError: false })).toBe("amber")
    }
  })

  test("badgeColor_anyServiceWithWarningOrError_rose", () => {
    for (const s of ALL_SERVICES) {
      expect(serviceBadgeColor({ service: s, hasWarningOrError: true })).toBe("rose")
    }
  })

  test("badgeColor_warningOverridesExternalAmber", () => {
    expect(serviceBadgeColor({ service: "humandbs", hasWarningOrError: false })).toBe("amber")
    expect(serviceBadgeColor({ service: "humandbs", hasWarningOrError: true })).toBe("rose")
  })
})

describe("SERVICE_DEPENDENCY_ORDER", () => {
  test("dependencyOrder_coversEveryServiceExactlyOnce", () => {
    expect(new Set(SERVICE_DEPENDENCY_ORDER)).toEqual(new Set(ALL_SERVICES))
    expect(SERVICE_DEPENDENCY_ORDER).toHaveLength(ALL_SERVICES.length)
    expect(new Set(SERVICE_DEPENDENCY_ORDER).size).toBe(SERVICE_DEPENDENCY_ORDER.length)
  })

  test("dependencyOrder_isTopologicalExtensionOfDependencies", () => {
    const idx = (s: Service) => SERVICE_DEPENDENCY_ORDER.indexOf(s)
    for (const service of ALL_SERVICES) {
      for (const dep of SERVICE_DEPENDENCIES[service]) {
        expect(idx(dep)).toBeLessThan(idx(service))
      }
    }
  })

  test("dependencyOrder_policyGateHumandbsPrecedesJga", () => {
    const idx = (s: Service) => SERVICE_DEPENDENCY_ORDER.indexOf(s)
    expect(idx("humandbs")).toBeLessThan(idx("jga"))
  })

  test("dependencyOrder_bioprojectBeforeBiosampleBeforeDra", () => {
    const idx = (s: Service) => SERVICE_DEPENDENCY_ORDER.indexOf(s)
    expect(idx("bioproject")).toBeLessThan(idx("biosample"))
    expect(idx("biosample")).toBeLessThan(idx("dra"))
  })
})

describe("serviceRoleTagKey", () => {
  test("serviceRoleTagKey_nonExternalRolesUnchanged", () => {
    for (const s of ALL_SERVICES.filter((x) => SERVICE_ROLE[x] !== "external")) {
      expect(serviceRoleTagKey(s)).toBe(SERVICE_ROLE[s])
    }
  })

  test("serviceRoleTagKey_splitsPolicyGateFromExternalRepositories", () => {
    expect(serviceRoleTagKey("humandbs")).toBe("gate")
    expect(serviceRoleTagKey("jpost")).toBe("external")
    expect(serviceRoleTagKey("eva")).toBe("external")
  })

  test("serviceRoleTagKey_neverGateForSubmissionEndpoint", () => {
    for (const s of ALL_SERVICES.filter(isSubmissionEndpoint)) {
      expect(serviceRoleTagKey(s)).not.toBe("gate")
    }
  })
})
