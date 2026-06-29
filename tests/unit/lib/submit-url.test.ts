import { describe, expect, test } from "vitest"

import {
  DEFAULT_URL_ACCESS_SECTION,
  EMPTY_SUBMIT_URL_STATE,
  readSubmitParams,
  submitParamsSearchString,
  writeSubmitParams,
} from "../../../app/lib/submit-url"

describe("submit-url kebab key", () => {
  test("readSubmitParams_kebabOrganismDomain_parses", () => {
    const state = readSubmitParams(new URLSearchParams("organism-domain=human"))
    expect(state.organismDomain).toBe("human")
  })

  test("readSubmitParams_camelCaseOrganismDomain_isIgnored", () => {
    const state = readSubmitParams(new URLSearchParams("organismDomain=human"))
    expect(state.organismDomain).toBeNull()
  })

  test("readSubmitParams_kebabAccessFlags_parsed", () => {
    const state = readSubmitParams(
      new URLSearchParams("access=restricted-preference,ethics-compliance"),
    )
    expect(state.accessSection).toEqual({
      restrictedPreference: true,
      hasIdentifier: false,
      ethicsCompliance: true,
      publiclyAvailable: false,
      microbialAnalysis: false,
    })
  })

  test("readSubmitParams_camelCaseAccessFlags_areIgnored", () => {
    const state = readSubmitParams(
      new URLSearchParams("access=restrictedPreference,ethicsCompliance"),
    )
    expect(state.accessSection).toEqual({
      restrictedPreference: false,
      hasIdentifier: false,
      ethicsCompliance: false,
      publiclyAvailable: false,
      microbialAnalysis: false,
    })
  })

  test("writeSubmitParams_organismDomain_emitsKebabKey", () => {
    const params = writeSubmitParams({ ...EMPTY_SUBMIT_URL_STATE, organismDomain: "human" })
    expect(params.get("organism-domain")).toBe("human")
    expect(params.get("organismDomain")).toBeNull()
  })

  test("writeSubmitParams_accessFlags_emitsKebabValues", () => {
    const params = writeSubmitParams({
      ...EMPTY_SUBMIT_URL_STATE,
      accessSection: {
        restrictedPreference: true,
        hasIdentifier: true,
        ethicsCompliance: false,
        publiclyAvailable: false,
        microbialAnalysis: false,
      },
    })
    expect(params.get("access")).toBe("restricted-preference,has-identifier")
  })

  test("writeSubmitParams_defaultAccessSection_omitsAccessParam", () => {
    const params = writeSubmitParams({
      ...EMPTY_SUBMIT_URL_STATE,
      accessSection: DEFAULT_URL_ACCESS_SECTION,
    })
    expect(params.has("access")).toBe(false)
  })

  test("submitParamsSearchString_kebabAcrossAllParams_buildsExpectedQuery", () => {
    const search = submitParamsSearchString({
      organismDomain: "human",
      accessSection: {
        restrictedPreference: true,
        hasIdentifier: false,
        ethicsCompliance: true,
        publiclyAvailable: false,
        microbialAnalysis: true,
      },
      entries: [],
      groups: [],
    })
    expect(search).toBe(
      "?organism-domain=human&access=restricted-preference%2Cethics-compliance%2Cmicrobial-analysis",
    )
  })
})
