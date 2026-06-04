import { describe, expect, test } from "vitest"

import { findExactMatch } from "~/features/search/results/exact-match"
import type { CrossSearchResponse, ParseNode } from "~/lib/api"

type Hit = Record<string, unknown>

const databases = (
  entries: { db: string; hits?: Hit[] }[],
): CrossSearchResponse["databases"] =>
  entries.map((entry) => ({
    db: entry.db,
    count: entry.hits?.length ?? 0,
    error: null,
    hits: entry.hits ?? [],
  })) as unknown as CrossSearchResponse["databases"]

const freeText = (value: string, isPhrase = false): ParseNode => ({
  op: "free_text",
  value,
  is_phrase: isPhrase,
})

const and = (...rules: ParseNode[]): ParseNode => ({ op: "AND", rules })

describe("findExactMatch accession", () => {
  test("findExactMatch_accessionIdentifier_returnsHitAndDb", () => {
    const dbs = databases([
      { db: "sra", hits: [{ identifier: "DRA000001", type: "sra-submission", title: "Whole genome" }] },
    ])
    const match = findExactMatch(freeText("DRA000001"), dbs)
    expect(match?.db).toBe("sra")
    expect(match?.hit.identifier).toBe("DRA000001")
  })

  test("findExactMatch_lowercaseAccession_matchesUppercaseIdentifier", () => {
    const dbs = databases([{ db: "sra", hits: [{ identifier: "DRA000001", type: "sra-submission" }] }])
    expect(findExactMatch(freeText("dra000001"), dbs)?.hit.identifier).toBe("DRA000001")
  })

  test("findExactMatch_suppressedAccession_stillReturned", () => {
    const dbs = databases([
      { db: "sra", hits: [{ identifier: "DRA000001", type: "sra-submission", status: "suppressed" }] },
    ])
    expect(findExactMatch(freeText("DRA000001"), dbs)?.hit.identifier).toBe("DRA000001")
  })

  test("findExactMatch_identifierNotInTopHits_returnsNull", () => {
    const dbs = databases([{ db: "sra", hits: [{ identifier: "DRR999999", type: "sra-run" }] }])
    expect(findExactMatch(freeText("DRA000001"), dbs)).toBeNull()
  })

  test("findExactMatch_sharedIdentifierAcrossDbs_picksCardOrderFirst", () => {
    const dbs = databases([
      { db: "sra", hits: [{ identifier: "X1", type: "sra-run" }] },
      { db: "bioproject", hits: [{ identifier: "X1", type: "bioproject" }] },
    ])
    // CARD_ORDER leads with bioproject ahead of sra.
    expect(findExactMatch(freeText("X1"), dbs)?.db).toBe("bioproject")
  })
})

describe("findExactMatch organism", () => {
  test("findExactMatch_organismName_returnsTaxonomyHit", () => {
    const dbs = databases([
      {
        db: "sra",
        hits: [{ identifier: "DRA9", type: "sra-sample", organism: { identifier: "9606", name: "Homo sapiens" } }],
      },
      { db: "taxonomy", hits: [{ identifier: "9606", type: "taxonomy", title: "Homo sapiens" }] },
    ])
    const match = findExactMatch(and(freeText("Homo"), freeText("sapiens")), dbs)
    expect(match?.db).toBe("taxonomy")
    expect(match?.hit.identifier).toBe("9606")
  })

  test("findExactMatch_organismPhrase_returnsTaxonomyHit", () => {
    const dbs = databases([{ db: "taxonomy", hits: [{ identifier: "9606", type: "taxonomy", title: "Homo sapiens" }] }])
    expect(findExactMatch(freeText("Homo sapiens", true), dbs)?.hit.identifier).toBe("9606")
  })

  test("findExactMatch_organismViaOrganismNameWhenTitleMissing_returnsTaxonomyHit", () => {
    const dbs = databases([
      { db: "taxonomy", hits: [{ identifier: "9606", type: "taxonomy", organism: { identifier: "9606", name: "Homo sapiens" } }] },
    ])
    expect(findExactMatch(freeText("Homo sapiens", true), dbs)?.hit.identifier).toBe("9606")
  })

  test("findExactMatch_sameNameNonTaxonomyHit_returnsNull", () => {
    const dbs = databases([{ db: "bioproject", hits: [{ identifier: "PRJDB1", type: "bioproject", title: "Homo sapiens" }] }])
    expect(findExactMatch(freeText("Homo sapiens", true), dbs)).toBeNull()
  })

  test("findExactMatch_bothAccessionAndOrganismMatch_prefersAccession", () => {
    const dbs = databases([
      { db: "taxonomy", hits: [{ identifier: "T1", type: "taxonomy", title: "abc" }] },
      { db: "bioproject", hits: [{ identifier: "abc", type: "bioproject" }] },
    ])
    const match = findExactMatch(freeText("abc"), dbs)
    expect(match?.db).toBe("bioproject")
    expect(match?.hit.identifier).toBe("abc")
  })
})

describe("findExactMatch gating", () => {
  test("findExactMatch_nullAst_returnsNull", () => {
    const dbs = databases([{ db: "sra", hits: [{ identifier: "DRA000001", type: "sra-submission" }] }])
    expect(findExactMatch(null, dbs)).toBeNull()
  })

  test("findExactMatch_orQuery_returnsNull", () => {
    const dbs = databases([{ db: "sra", hits: [{ identifier: "DRA000001", type: "sra-submission" }] }])
    const ast: ParseNode = { op: "OR", rules: [freeText("DRA000001"), freeText("DRR1")] }
    expect(findExactMatch(ast, dbs)).toBeNull()
  })

  test("findExactMatch_fieldLeafQuery_returnsNull", () => {
    const dbs = databases([{ db: "sra", hits: [{ identifier: "DRA000001", type: "sra-submission" }] }])
    const ast: ParseNode = { op: "eq", field: "identifier", value: "DRA000001" }
    expect(findExactMatch(ast, dbs)).toBeNull()
  })

  test("findExactMatch_freeTextAndFieldLeaf_returnsNull", () => {
    const dbs = databases([{ db: "sra", hits: [{ identifier: "DRA000001", type: "sra-submission" }] }])
    const ast = and(freeText("DRA000001"), { op: "eq", field: "title", value: "x" })
    expect(findExactMatch(ast, dbs)).toBeNull()
  })

  test("findExactMatch_wildcardValue_returnsNull", () => {
    const dbs = databases([{ db: "sra", hits: [{ identifier: "DRA*", type: "sra-run" }] }])
    expect(findExactMatch(freeText("DRA*"), dbs)).toBeNull()
  })

  test("findExactMatch_wildcardLeaf_returnsNull", () => {
    const dbs = databases([{ db: "sra", hits: [{ identifier: "DRA000001", type: "sra-submission" }] }])
    const ast: ParseNode = { op: "wildcard", field: "identifier", value: "DRA*" }
    expect(findExactMatch(ast, dbs)).toBeNull()
  })
})
