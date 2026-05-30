import { describe, expect, test } from "vitest"

import { stepBadgeColor } from "../../../../../app/features/submit/flow-rules"
import type { FlowStep, FlowStepNote, FlowStepOrigin, Service } from "../../../../../app/schemas/submit"
import {
  COMPANION_SERVICES,
  DESTINATION_SERVICES,
  EXTERNAL_SERVICES,
  Service as ServiceEnum,
  serviceBadgeColor,
} from "../../../../../app/schemas/submit"

const mkStep = (over: Partial<FlowStep> = {}): FlowStep => ({
  id: "step-1",
  service: "dra",
  origin: "tier1",
  scope: { groupIds: [], entryIds: [] },
  notes: [],
  ...over,
})

const ROLE_COLORED_SERVICES: readonly Service[] = [
  ...DESTINATION_SERVICES,
  ...COMPANION_SERVICES,
]

const ORIGINS: readonly FlowStepOrigin[] = ["tier1", "tier2", "recipe"]

describe("stepBadgeColor", () => {
  test.each(EXTERNAL_SERVICES)(
    "stepBadgeColor_external_%s_noNotes_isAmber",
    (service) => {
      expect(stepBadgeColor(mkStep({ service, notes: [] }))).toBe("amber")
    },
  )

  test.each(ROLE_COLORED_SERVICES)(
    "stepBadgeColor_destinationOrCompanion_%s_noNotes_isEmerald",
    (service) => {
      expect(stepBadgeColor(mkStep({ service, notes: [] }))).toBe("emerald")
    },
  )

  // warning/error が role を上書きして rose になる: 全 service で成立する
  test.each(ServiceEnum.options)(
    "stepBadgeColor_%s_warningNote_isRose",
    (service) => {
      const notes: FlowStepNote[] = [{ kind: "warning", messageKey: "humanRefOnly" }]
      expect(stepBadgeColor(mkStep({ service, notes }))).toBe("rose")
    },
  )

  test.each(ServiceEnum.options)(
    "stepBadgeColor_%s_errorNote_isRose",
    (service) => {
      const notes: FlowStepNote[] = [{ kind: "error", messageKey: "noDestination" }]
      expect(stepBadgeColor(mkStep({ service, notes }))).toBe("rose")
    },
  )

  // info note は warning/error ではないので role 色のまま (境界: info を昇格させない)
  test.each(EXTERNAL_SERVICES)(
    "stepBadgeColor_external_%s_infoNoteOnly_staysAmber",
    (service) => {
      const notes: FlowStepNote[] = [{ kind: "info", messageKey: "tpaHint" }]
      expect(stepBadgeColor(mkStep({ service, notes }))).toBe("amber")
    },
  )

  test.each(ROLE_COLORED_SERVICES)(
    "stepBadgeColor_destinationOrCompanion_%s_infoNoteOnly_staysEmerald",
    (service) => {
      const notes: FlowStepNote[] = [{ kind: "info", messageKey: "tpaHint" }]
      expect(stepBadgeColor(mkStep({ service, notes }))).toBe("emerald")
    },
  )

  // info が混ざっても warning が 1 つでもあれば rose
  test("stepBadgeColor_infoBeforeWarning_isRose", () => {
    const notes: FlowStepNote[] = [
      { kind: "info", messageKey: "tpaHint" },
      { kind: "warning", messageKey: "humanRefOnly" },
    ]
    expect(stepBadgeColor(mkStep({ service: "togovar", notes }))).toBe("rose")
  })

  test("stepBadgeColor_warningBeforeInfo_isRose", () => {
    const notes: FlowStepNote[] = [
      { kind: "warning", messageKey: "humanRefOnly" },
      { kind: "info", messageKey: "tpaHint" },
    ]
    expect(stepBadgeColor(mkStep({ service: "togovar", notes }))).toBe("rose")
  })

  test("stepBadgeColor_errorOnExternalService_isRose", () => {
    const notes: FlowStepNote[] = [{ kind: "error", messageKey: "noDestination" }]
    expect(stepBadgeColor(mkStep({ service: "humandbs", notes }))).toBe("rose")
  })

  // origin は色決定に影響しない
  test.each(ORIGINS)(
    "stepBadgeColor_origin_%s_doesNotAffectColor",
    (origin) => {
      expect(stepBadgeColor(mkStep({ service: "dra", origin, notes: [] }))).toBe("emerald")
      expect(stepBadgeColor(mkStep({ service: "humandbs", origin, notes: [] }))).toBe("amber")
    },
  )

  // stepBadgeColor は notes から hasWarningOrError を導出した serviceBadgeColor と一致する
  test.each(ServiceEnum.options)(
    "stepBadgeColor_%s_matchesServiceBadgeColorOverNoteCombos",
    (service) => {
      const kindCombos: FlowStepNote[][] = [
        [],
        [{ kind: "info", messageKey: "k" }],
        [{ kind: "warning", messageKey: "k" }],
        [{ kind: "error", messageKey: "k" }],
        [
          { kind: "info", messageKey: "k1" },
          { kind: "info", messageKey: "k2" },
        ],
        [
          { kind: "info", messageKey: "k1" },
          { kind: "error", messageKey: "k2" },
        ],
      ]
      for (const notes of kindCombos) {
        const hasWarningOrError = notes.some(
          (n) => n.kind === "warning" || n.kind === "error",
        )
        expect(stepBadgeColor(mkStep({ service, notes }))).toBe(
          serviceBadgeColor({ service, hasWarningOrError }),
        )
      }
    },
  )
})
