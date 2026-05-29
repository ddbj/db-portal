import { describe, expect, test } from "vitest"

import { listKindRoutes, SUBMIT_ROUTING, validateSubmitRouting } from "../../../../app/content/submit-routing/catalog"
import { RECIPE_ALLOWLIST } from "../../../../app/features/submit/flow-rules/recipes"
import { DESTINATION_SERVICES, FileTypeKind } from "../../../../app/schemas/submit"

const DESTINATION = new Set<string>(DESTINATION_SERVICES)

describe("submit routing catalog", () => {
  test("validateSubmitRouting_shippedCatalog_parses", () => {
    expect(validateSubmitRouting().success).toBe(true)
  })

  test("catalog_kindRoutes_coverEveryFileTypeKindExactlyOnce", () => {
    const ids = listKindRoutes().map((r) => r.id)
    expect(new Set(ids)).toEqual(new Set(FileTypeKind.options))
    expect(ids.length).toBe(FileTypeKind.options.length)
  })

  test("catalogVocabClosure_everyEmitService_isDestination", () => {
    for (const route of listKindRoutes()) {
      for (const rule of route.rules) {
        expect(DESTINATION.has(rule.emit.service)).toBe(true)
      }
    }
  })

  test("candidateReposParity_candidateRepos_supersetOfEmitServices", () => {
    for (const route of listKindRoutes()) {
      const emitted = new Set(route.rules.map((r) => r.emit.service))
      for (const s of emitted) {
        expect(route.candidateRepos).toContain(s)
      }
    }
  })

  test("everyKindHasFallback_lastRule_isAlways", () => {
    for (const route of listKindRoutes()) {
      const last = route.rules[route.rules.length - 1]!
      expect("always" in last.when && last.when.always === true).toBe(true)
    }
  })

  test("recipeAllowlist_isFixedToThreeNamedRecipes", () => {
    expect([...RECIPE_ALLOWLIST]).toEqual(["jga-submission", "mag-project", "sag"])
  })

  test("catalog_q1AndQ2Repos_areDestinationServices", () => {
    for (const o of [...SUBMIT_ROUTING.q1Options, ...SUBMIT_ROUTING.q2Options]) {
      for (const r of o.repos) expect(DESTINATION.has(r)).toBe(true)
    }
  })
})
