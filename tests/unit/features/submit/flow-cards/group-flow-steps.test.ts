import { describe, expect, test } from "vitest"

import { type FlowStepGroup, groupFlowSteps } from "~/features/submit/flow-cards/group-flow-steps"
import type { Access, FileEntry, FileTypeKind, FlowStep, Service } from "~/schemas/submit"

const entry = (id: string, access: Access, fileTypeKind: FileTypeKind = "expression-matrix"): FileEntry => ({
  id,
  fileTypeKind,
  access,
  dataForm: "matrix",
  groupId: `g-${id}`,
  chipTags: [],
})

const step = (service: Service, entryIds: readonly string[]): FlowStep => ({
  id: `step-${service}`,
  service,
  origin: "tier2",
  scope: { entryIds: [...entryIds], groupIds: [] },
  notes: [],
})

const shapeOf = (groups: readonly FlowStepGroup[]): [string, string[]][] =>
  groups.map((g) => [g.key, g.steps.map((s) => s.service)])

describe("groupFlowSteps", () => {
  test("groupFlowSteps_humanAllOpenWithHumandbs_putsHumandbsInGateGroupNotRestricted", () => {
    const entries = [entry("e1", "open")]
    const steps = [
      step("humandbs", ["e1"]),
      step("bioproject", ["e1"]),
      step("biosample", ["e1"]),
      step("gea", ["e1"]),
    ]

    expect(shapeOf(groupFlowSteps(steps, entries, true))).toEqual([
      ["companion", ["bioproject", "biosample"]],
      ["gate", ["humandbs"]],
      ["open", ["gea"]],
    ])
  })

  test("groupFlowSteps_humanMixedAccess_ordersCompanionGateRestrictedOpen", () => {
    const entries = [entry("e1", "restricted", "sequence-read"), entry("e2", "open")]
    const steps = [
      step("humandbs", ["e1", "e2"]),
      step("bioproject", ["e2"]),
      step("biosample", ["e2"]),
      step("jga", ["e1"]),
      step("gea", ["e2"]),
    ]

    expect(shapeOf(groupFlowSteps(steps, entries, true))).toEqual([
      ["companion", ["bioproject", "biosample"]],
      ["gate", ["humandbs"]],
      ["restricted", ["jga"]],
      ["open", ["gea"]],
    ])
  })

  test("groupFlowSteps_humanAllRestricted_keepsHumandbsOutOfRestrictedGroup", () => {
    const entries = [entry("e1", "restricted", "sequence-read")]
    const steps = [step("humandbs", ["e1"]), step("jga", ["e1"])]

    expect(shapeOf(groupFlowSteps(steps, entries, true))).toEqual([
      ["gate", ["humandbs"]],
      ["restricted", ["jga"]],
    ])
  })

  test("groupFlowSteps_humanWithoutHumandbs_omitsGateGroup", () => {
    const entries = [entry("e1", "open", "sequence-read")]
    const steps = [step("bioproject", ["e1"]), step("biosample", ["e1"]), step("dra", ["e1"])]

    expect(shapeOf(groupFlowSteps(steps, entries, true))).toEqual([
      ["companion", ["bioproject", "biosample"]],
      ["open", ["dra"]],
    ])
  })

  test("groupFlowSteps_stepScopedToOpenAndRestrictedEntries_goesToRestrictedGroup", () => {
    const entries = [entry("e1", "restricted"), entry("e2", "open")]
    const steps = [step("gea", ["e1", "e2"])]

    expect(shapeOf(groupFlowSteps(steps, entries, true))).toEqual([["restricted", ["gea"]]])
  })

  test("groupFlowSteps_externalEndpointForHuman_isGroupedByAccessNotAsGate", () => {
    const entries = [entry("e1", "open", "proteome")]
    const steps = [step("jpost", ["e1"])]

    expect(shapeOf(groupFlowSteps(steps, entries, true))).toEqual([["open", ["jpost"]]])
  })

  test("groupFlowSteps_nonHuman_putsEveryNonCompanionStepInDestinationGroup", () => {
    const entries = [entry("e1", "open", "sequence-read"), entry("e2", "open")]
    const steps = [
      step("bioproject", ["e1", "e2"]),
      step("biosample", ["e1", "e2"]),
      step("dra", ["e1", "e2"]),
      step("gea", ["e2"]),
    ]

    expect(shapeOf(groupFlowSteps(steps, entries, false))).toEqual([
      ["companion", ["bioproject", "biosample"]],
      ["destination", ["dra", "gea"]],
    ])
  })

  test("groupFlowSteps_noSteps_returnsNoGroups", () => {
    expect(groupFlowSteps([], [entry("e1", "open")], true)).toEqual([])
    expect(groupFlowSteps([], [], false)).toEqual([])
  })
})
