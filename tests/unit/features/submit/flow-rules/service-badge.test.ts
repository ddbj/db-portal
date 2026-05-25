import { describe, expect, test } from "vitest"

import { stepBadgeColor } from "../../../../../app/features/submit/flow-rules"
import {
  EXTERNAL_SERVICES,
  INTERNAL_SERVICES,
  Service,
  serviceBadgeColor,
} from "../../../../../app/schemas/submit"
import { mkStep } from "./_helpers"

describe("service-badge wrappers", () => {
  test.each(Service.options)(
    "serviceBadgeColor_%s_withWarning_isRose",
    (s) => {
      expect(serviceBadgeColor({ service: s, hasWarningOrError: true })).toBe("rose")
    },
  )

  test.each(INTERNAL_SERVICES)(
    "serviceBadgeColor_internal_%s_noWarning_isEmerald",
    (s) => {
      expect(serviceBadgeColor({ service: s, hasWarningOrError: false })).toBe("emerald")
    },
  )

  test.each(EXTERNAL_SERVICES)(
    "serviceBadgeColor_external_%s_noWarning_isAmber",
    (s) => {
      expect(serviceBadgeColor({ service: s, hasWarningOrError: false })).toBe("amber")
    },
  )

  test("stepBadgeColor_noWarningInternalService_isEmerald", () => {
    expect(stepBadgeColor(mkStep({ service: "biosample" }))).toBe("emerald")
  })

  test("stepBadgeColor_noWarningExternalService_isAmber", () => {
    expect(stepBadgeColor(mkStep({ service: "dbcls" }))).toBe("amber")
  })

  test("stepBadgeColor_warningNote_isRose", () => {
    expect(
      stepBadgeColor(mkStep({
        service: "biosample",
        notes: [{ kind: "warning", messageKey: "x" }],
      })),
    ).toBe("rose")
  })

  test("stepBadgeColor_errorNote_isRose", () => {
    expect(
      stepBadgeColor(mkStep({
        service: "dra",
        notes: [{ kind: "error", messageKey: "x" }],
      })),
    ).toBe("rose")
  })
})
