import { describe, expect, test } from "vitest"

import { hydrateFromUrl } from "~/features/submit/state/url-hydration"
import type { SubmitUrlState, UrlEntry, UrlGroup } from "~/lib/submit-url"

const entry = (groupIndex: number | null): UrlEntry => ({
  fileTypeKind: "sequence",
  dataForm: null,
  groupIndex,
  chipTags: [],
})

const group = (linkedGroupIndices: number[] = []): UrlGroup => ({
  groupType: "single",
  memberEntryIndices: [],
  linkedGroupIndices,
})

const stateFor = (entries: UrlEntry[], groups: UrlGroup[]): SubmitUrlState => ({
  organismDomain: null,
  accessSection: null,
  entries,
  groups,
})

describe("hydrateFromUrl — linkedGroupIds invariant", () => {
  test("hydrate_groupReferencingDroppedSibling_doesNotLeaveDanglingId", () => {
    // entry[0] → group 0 のみ参照。 group 1 は member 不在で drop される。
    // group 0 が group 1 を linked 参照していると dangling ID が残ってしまう。
    const url = stateFor(
      [entry(0)],
      [group([1]), group()], // group 0 → links to group 1 (will be dropped)
    )

    const { submission } = hydrateFromUrl(url)
    const ids = new Set(submission.fileGroups.map((g) => g.id))
    for (const g of submission.fileGroups) {
      for (const linkedId of g.linkedGroupIds) {
        expect(ids.has(linkedId), `linkedGroupIds must not reference a dropped group; saw ${linkedId}`).toBe(true)
      }
    }
  })

  test("hydrate_groupReferencingSurvivingSibling_keepsLinkedId", () => {
    // entry[0] → group 0, entry[1] → group 1。 両方生き残るので link は維持。
    const url = stateFor(
      [entry(0), entry(1)],
      [group([1]), group([0])],
    )

    const { submission } = hydrateFromUrl(url)
    expect(submission.fileGroups).toHaveLength(2)
    const g0 = submission.fileGroups[0]!
    const g1 = submission.fileGroups[1]!
    expect(g0.linkedGroupIds).toEqual([g1.id])
    expect(g1.linkedGroupIds).toEqual([g0.id])
  })

  test("hydrate_emptyGroupsDroppedAndLinkedIdsFiltered", () => {
    // group 0 は member あり、 group 1 / 2 は member 不在で drop。
    // group 0 が group 1 / 2 を link していたら、 結果の linkedGroupIds は空。
    const url = stateFor(
      [entry(0)],
      [group([1, 2]), group(), group()],
    )

    const { submission } = hydrateFromUrl(url)
    const explicit = submission.fileGroups.filter((g) => g.memberFileIds.length > 0)
    expect(explicit).toHaveLength(1)
    expect(explicit[0]!.linkedGroupIds).toEqual([])
  })
})
