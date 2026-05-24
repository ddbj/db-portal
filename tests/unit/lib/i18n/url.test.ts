import { describe, expect, test } from "vitest"

import { getCounterpartUrl } from "~/lib/i18n/url"

describe("getCounterpartUrl to=en", () => {
  test("getCounterpartUrl_root_returnsEnRoot", () => {
    expect(getCounterpartUrl("/", "en")).toBe("/en")
  })

  test("getCounterpartUrl_path_prependsEn", () => {
    expect(getCounterpartUrl("/databases/bioproject", "en")).toBe("/en/databases/bioproject")
  })

  test("getCounterpartUrl_pathWithoutLeadingSlash_normalizes", () => {
    expect(getCounterpartUrl("search", "en")).toBe("/en/search")
  })
})

describe("getCounterpartUrl to=ja", () => {
  test("getCounterpartUrl_enRoot_returnsRoot", () => {
    expect(getCounterpartUrl("/en", "ja")).toBe("/")
  })

  test("getCounterpartUrl_enPath_stripsPrefix", () => {
    expect(getCounterpartUrl("/en/databases/bioproject", "ja")).toBe("/databases/bioproject")
  })

  test("getCounterpartUrl_jaPath_returnsAsIs", () => {
    expect(getCounterpartUrl("/databases/bioproject", "ja")).toBe("/databases/bioproject")
  })

  test("getCounterpartUrl_pathStartingWithEnButNotPrefix_doesNotStrip", () => {
    expect(getCounterpartUrl("/enrollment", "ja")).toBe("/enrollment")
  })
})
