import { describe, expect, test } from "vitest"

import { parseAssistantOutput } from "../../../../server/llm/assistant/parse"

describe("parseAssistantOutput", () => {
  test("accepts valid JSON proposal", () => {
    const raw = JSON.stringify({
      combinator: "AND",
      conditions: [{ field: "organism", op: "eq", value: "Homo sapiens" }],
    })
    const outcome = parseAssistantOutput(raw)
    if (!outcome.ok) throw new Error("expected ok")
    expect(outcome.proposal.conditions[0]?.value).toBe("Homo sapiens")
  })

  test("extracts JSON embedded inside prose", () => {
    const raw = "Sure, here you go: {\"combinator\":\"OR\",\"conditions\":[{\"field\":\"identifier\",\"op\":\"wildcard\",\"value\":\"PRJ*\"}]} thanks"
    const outcome = parseAssistantOutput(raw)
    expect(outcome.ok).toBe(true)
  })

  test("returns no_json when nothing parseable", () => {
    const outcome = parseAssistantOutput("just text, no json")
    if (outcome.ok) throw new Error("expected failure")
    expect(outcome.code).toBe("no_json")
  })

  test("returns invalid_json on broken JSON", () => {
    const outcome = parseAssistantOutput("{ not valid json")
    if (outcome.ok) throw new Error("expected failure")
    expect(outcome.code).toBe("invalid_json")
  })

  test("returns schema_violation when field is unknown", () => {
    const raw = JSON.stringify({
      combinator: "AND",
      conditions: [{ field: "bogus", op: "eq", value: "x" }],
    })
    const outcome = parseAssistantOutput(raw)
    if (outcome.ok) throw new Error("expected failure")
    expect(outcome.code).toBe("schema_violation")
  })

  test("requires at least one condition", () => {
    const raw = JSON.stringify({ combinator: "AND", conditions: [] })
    const outcome = parseAssistantOutput(raw)
    expect(outcome.ok).toBe(false)
  })
})
