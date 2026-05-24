import type { components } from "./openapi-types"

type Schemas = components["schemas"]

type Leaves =
  | Schemas["DbPortalParseLeafValue"]
  | Schemas["DbPortalParseLeafRange"]
  | Schemas["DbPortalParseFreeText"]

export type ParseNode =
  | Schemas["DbPortalParseBoolOp-Output"]
  | Leaves

export type ParseNodeInput =
  | Schemas["DbPortalParseBoolOp-Input"]
  | Leaves
