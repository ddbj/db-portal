import { describe, expect, test } from "vitest"

import { allCatalogMessageKeys } from "~/content/submit-routing/catalog"
import { ALL_ENGINE_MESSAGE_KEYS } from "~/features/submit/flow-rules"
import { en, flattenKeys, ja } from "~/lib/i18n"

const jaKeys = new Set(flattenKeys(ja))
const enKeys = new Set(flattenKeys(en))
const referenced = [...new Set([...allCatalogMessageKeys(), ...ALL_ENGINE_MESSAGE_KEYS])]

describe("submit messageKey existence", () => {
  test("messageKeyExistence_everyCatalogAndEngineKey_existsInJa", () => {
    for (const key of referenced) {
      expect(jaKeys.has(key), `missing ja key: ${key}`).toBe(true)
    }
  })

  test("messageKeyExistence_everyCatalogAndEngineKey_existsInEn", () => {
    for (const key of referenced) {
      expect(enKeys.has(key), `missing en key: ${key}`).toBe(true)
    }
  })
})
