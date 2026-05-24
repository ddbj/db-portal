import { fc, test } from "@fast-check/vitest"
import { expect } from "vitest"

import {
  ButtonType,
  DataForm,
  EXTERNAL_SERVICES,
  GroupType,
  INTERNAL_SERVICES,
  Service,
  TYPICAL_DATA_FORM_FOR_BUTTON,
  TYPICAL_GROUP_TYPE_FOR_BUTTON,
} from "../../../app/schemas/submit"

const numRuns = 1000
const buttonValues = ButtonType.options
const dataFormValues = new Set(DataForm.options)
const groupTypeValues = new Set(GroupType.options)
const serviceValues = new Set(Service.options)

test.prop({ bt: fc.constantFrom(...buttonValues) }, { numRuns })(
  "TYPICAL_DATA_FORM_FOR_BUTTON_anyButtonType_mapsToValidDataForm",
  ({ bt }) => {
    expect(dataFormValues.has(TYPICAL_DATA_FORM_FOR_BUTTON[bt])).toBe(true)
  },
)

test.prop({ bt: fc.constantFrom(...buttonValues) }, { numRuns })(
  "TYPICAL_GROUP_TYPE_FOR_BUTTON_anyButtonType_mapsToValidGroupType",
  ({ bt }) => {
    expect(groupTypeValues.has(TYPICAL_GROUP_TYPE_FOR_BUTTON[bt])).toBe(true)
  },
)

test.prop({ s: fc.constantFrom(...Service.options) }, { numRuns })(
  "Service_anyValue_isCoveredByInternalOrExternal",
  ({ s }) => {
    const isInternal = INTERNAL_SERVICES.includes(s)
    const isExternal = EXTERNAL_SERVICES.includes(s)
    expect(isInternal !== isExternal).toBe(true)
    expect(serviceValues.has(s)).toBe(true)
  },
)
