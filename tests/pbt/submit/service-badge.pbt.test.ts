import { fc, test } from "@fast-check/vitest"
import { expect } from "vitest"

import {
  EXTERNAL_SERVICES,
  INTERNAL_SERVICES,
  Service,
  serviceBadgeColor,
} from "../../../app/schemas/submit"

const numRuns = 1000
const serviceArb = fc.constantFrom(...Service.options)

test.prop({ s: serviceArb, w: fc.boolean() }, { numRuns })(
  "serviceBadgeColor_anyServiceAndFlag_returnsOneOfThreeColors",
  ({ s, w }) => {
    const color = serviceBadgeColor({ service: s, hasWarningOrError: w })
    expect(["emerald", "amber", "rose"]).toContain(color)
  },
)

test.prop({ s: serviceArb }, { numRuns })(
  "serviceBadgeColor_anyServiceWithWarning_isRose",
  ({ s }) => {
    expect(serviceBadgeColor({ service: s, hasWarningOrError: true })).toBe("rose")
  },
)

test.prop({ s: fc.constantFrom(...INTERNAL_SERVICES) }, { numRuns })(
  "serviceBadgeColor_internalServiceNoWarning_isEmerald",
  ({ s }) => {
    expect(serviceBadgeColor({ service: s, hasWarningOrError: false })).toBe("emerald")
  },
)

test.prop({ s: fc.constantFrom(...EXTERNAL_SERVICES) }, { numRuns })(
  "serviceBadgeColor_externalServiceNoWarning_isAmber",
  ({ s }) => {
    expect(serviceBadgeColor({ service: s, hasWarningOrError: false })).toBe("amber")
  },
)
