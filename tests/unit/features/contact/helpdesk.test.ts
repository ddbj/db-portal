import { describe, expect, test } from "vitest"

import {
  DDBJ_CONTACT_URL,
  DDBJ_FAQ_URL,
  HELPDESK_EMAIL,
  NIG_SUPERCOMPUTER_CONTACT_URL,
} from "~/features/contact"

describe("HELPDESK_EMAIL", () => {
  // 画面に平文で出し clipboard にそのまま渡すため、 encode を要する文字を含まない。
  test("HELPDESK_EMAIL_isAPlainAddressNeedingNoEncoding", () => {
    expect(HELPDESK_EMAIL).toMatch(/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]+$/)
    expect(encodeURIComponent(HELPDESK_EMAIL)).toBe(HELPDESK_EMAIL.replace("@", "%40"))
  })
})

describe("external desk URLs", () => {
  const LOCALIZED = {
    DDBJ_FAQ_URL,
    DDBJ_CONTACT_URL,
    NIG_SUPERCOMPUTER_CONTACT_URL,
  }

  test.each(Object.entries(LOCALIZED))("%s_coversBothLangsWithHttps", (_name, urls) => {
    expect(Object.keys(urls).sort()).toEqual(["en", "ja"])
    for (const url of Object.values(urls)) {
      expect(new URL(url).protocol).toBe("https:")
    }
  })

  // ja / en が同値なら片方の翻訳漏れ。 DDBJ / 遺伝研 SC はいずれも英語版を持つ。
  test.each(Object.entries(LOCALIZED))("%s_pointsToADistinctUrlPerLang", (_name, urls) => {
    expect(urls.ja).not.toBe(urls.en)
  })
})
