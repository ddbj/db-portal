import { describe, expect, test } from "vitest"

import { Service, SERVICE_ROLE, usesDdbjAccount } from "~/schemas/submit"

describe("usesDdbjAccount", () => {
  test("usesDdbjAccount_nsss_false", () => {
    expect(usesDdbjAccount("nsss")).toBe(false)
  })

  test("usesDdbjAccount_externalServices_false", () => {
    const externals = Service.options.filter((s) => SERVICE_ROLE[s] === "external")
    expect(externals.length).toBeGreaterThan(0)
    expect(externals.map(usesDdbjAccount)).toEqual(externals.map(() => false))
  })

  test("usesDdbjAccount_destinationsAndCompanionsOtherThanNsss_true", () => {
    const ddbjManaged = Service.options.filter((s) => SERVICE_ROLE[s] !== "external" && s !== "nsss")
    expect(ddbjManaged.length).toBeGreaterThan(0)
    expect(ddbjManaged.map(usesDdbjAccount)).toEqual(ddbjManaged.map(() => true))
  })

  test("usesDdbjAccount_jgaAndDdbjAndMetabobank_true", () => {
    expect(usesDdbjAccount("jga")).toBe(true)
    expect(usesDdbjAccount("ddbj")).toBe(true)
    expect(usesDdbjAccount("metabobank")).toBe(true)
  })
})
