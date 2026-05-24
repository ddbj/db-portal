import { describe, expect, test } from "vitest"

import { stepBadgeColor } from "../../../../../app/features/submit/flow-rules"
import type { FlowStep } from "../../../../../app/schemas/submit"
import { serviceBadgeColor } from "../../../../../app/schemas/submit"

const mkStep = (
  service: FlowStep["service"],
  notes: FlowStep["notes"] = [],
): FlowStep => ({
  id: `${service}:test`,
  service,
  scope: { groupIds: ["g"], entryIds: [] },
  notes,
})

describe("service-badge wrappers", () => {
  test("serviceBadgeColor_internalNoWarning_emerald", () => {
    expect(serviceBadgeColor({ service: "dra", hasWarningOrError: false })).toBe("emerald")
  })

  test("serviceBadgeColor_externalNoWarning_amber", () => {
    expect(serviceBadgeColor({ service: "jpost", hasWarningOrError: false })).toBe("amber")
  })

  test("stepBadgeColor_noWarning_followsServiceColor", () => {
    expect(stepBadgeColor(mkStep("biosample"))).toBe("emerald")
    expect(stepBadgeColor(mkStep("dbcls"))).toBe("amber")
  })

  test("stepBadgeColor_warningOverridesToRose", () => {
    expect(stepBadgeColor(mkStep("biosample", [
      { kind: "warning", messageKey: "x" },
    ]))).toBe("rose")
  })

  test("stepBadgeColor_errorOverridesToRose", () => {
    expect(stepBadgeColor(mkStep("dra", [
      { kind: "error", messageKey: "x" },
    ]))).toBe("rose")
  })
})
