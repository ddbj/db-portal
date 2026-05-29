import { describe, expect, test } from "vitest"

import { parseAssistantOutput } from "../../../../server/llm/assistant/parse"

describe("parseAssistantOutput", () => {
  test("parseAssistantOutput_validJsonProposal_returnsParsedProposal", () => {
    const raw = JSON.stringify({
      combinator: "AND",
      conditions: [{ field: "organism_name", op: "eq", value: "Homo sapiens" }],
    })
    const outcome = parseAssistantOutput(raw)
    if (!outcome.ok) throw new Error("expected ok")
    const condition = outcome.proposal.conditions[0]
    if (condition?.op === "between") throw new Error("expected scalar condition")
    expect(condition?.value).toBe("Homo sapiens")
  })

  test("parseAssistantOutput_jsonEmbeddedInProse_extractsAndParses", () => {
    const raw = "Sure, here you go: {\"combinator\":\"OR\",\"conditions\":[{\"field\":\"identifier\",\"op\":\"wildcard\",\"value\":\"PRJ*\"}]} thanks"
    const outcome = parseAssistantOutput(raw)
    expect(outcome.ok).toBe(true)
  })

  test("parseAssistantOutput_plainText_returnsNoJsonCode", () => {
    const outcome = parseAssistantOutput("just text, no json")
    if (outcome.ok) throw new Error("expected failure")
    expect(outcome.code).toBe("no_json")
  })

  test("parseAssistantOutput_brokenJson_returnsInvalidJsonCode", () => {
    const outcome = parseAssistantOutput("{ not valid json")
    if (outcome.ok) throw new Error("expected failure")
    expect(outcome.code).toBe("invalid_json")
  })

  test("parseAssistantOutput_unknownField_returnsSchemaViolation", () => {
    const raw = JSON.stringify({
      combinator: "AND",
      conditions: [{ field: "bogus", op: "eq", value: "x" }],
    })
    const outcome = parseAssistantOutput(raw)
    if (outcome.ok) throw new Error("expected failure")
    expect(outcome.code).toBe("schema_violation")
  })

  test("parseAssistantOutput_emptyConditions_isRejected", () => {
    const raw = JSON.stringify({ combinator: "AND", conditions: [] })
    const outcome = parseAssistantOutput(raw)
    expect(outcome.ok).toBe(false)
  })
})
