import { describe, expect, test } from "vitest"

import { SUBMIT_CARDS } from "~/content/submit-routing/cards"
import { Service } from "~/schemas/submit"

describe("SUBMIT_CARDS", () => {
  test("submitCards_everyService_hasEntry", () => {
    for (const service of Service.options) {
      expect(SUBMIT_CARDS[service]).toBeDefined()
    }
  })

  test("submitCards_everyService_hasNonEmptyWizardStepsAndPrepare", () => {
    for (const service of Service.options) {
      const card = SUBMIT_CARDS[service]
      expect(card.wizardSteps.ja.length).toBeGreaterThan(0)
      expect(card.wizardSteps.en.length).toBeGreaterThan(0)
      expect(card.prepare.ja.length).toBeGreaterThan(0)
      expect(card.prepare.en.length).toBeGreaterThan(0)
    }
  })

  test("submitCards_everyService_wizardAndPrepareJaEnLengthsMatch", () => {
    for (const service of Service.options) {
      const card = SUBMIT_CARDS[service]
      expect(card.wizardSteps.ja).toHaveLength(card.wizardSteps.en.length)
      expect(card.prepare.ja).toHaveLength(card.prepare.en.length)
    }
  })

  // 引用 ID を発行する全 service は issuedNote で発行 ID を予告する (docs/submit.md「登録フロー詳細カード」)
  test("submitCards_everyService_hasBilingualIssuedNote", () => {
    for (const service of Service.options) {
      const issued = SUBMIT_CARDS[service].issuedNote
      expect(issued).toBeDefined()
      expect(issued!.ja.length).toBeGreaterThan(0)
      expect(issued!.en.length).toBeGreaterThan(0)
    }
  })

  test("submitCards_gotcha_hasBothLanguagesWhenPresent", () => {
    for (const service of Service.options) {
      const gotcha = SUBMIT_CARDS[service].gotcha
      if (gotcha === undefined) continue
      expect(gotcha.ja.length).toBeGreaterThan(0)
      expect(gotcha.en.length).toBeGreaterThan(0)
    }
  })
})
