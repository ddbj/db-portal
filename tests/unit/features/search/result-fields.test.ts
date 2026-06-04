import fc from "fast-check"
import { describe, expect, test } from "vitest"

import {
  type DbHit,
  entryHref,
  isControlled,
  isSuppressed,
  organismName,
  rowDate,
  rowExcerpt,
  rowTitle,
  signatureChips,
  subtypeBadge,
  taxonomyExtras,
} from "~/features/search/results/result-fields"

const hit = (o: Record<string, unknown>): DbHit => o as unknown as DbHit

describe("entryHref", () => {
  test("ES hits use the DDBJ Search entry path keyed by fine-grained type", () => {
    expect(entryHref(hit({ type: "bioproject", identifier: "PRJDB1" })))
      .toBe("https://ddbj.nig.ac.jp/search/entry/bioproject/PRJDB1")
    expect(entryHref(hit({ type: "sra-analysis", identifier: "DRZ012283" })))
      .toBe("https://ddbj.nig.ac.jp/search/entry/sra-analysis/DRZ012283")
    expect(entryHref(hit({ type: "jga-dataset", identifier: "JGAD000228" })))
      .toBe("https://ddbj.nig.ac.jp/search/entry/jga-dataset/JGAD000228")
  })

  test("Solr hits use their own canonical hosts", () => {
    expect(entryHref(hit({ type: "trad", identifier: "U01317" })))
      .toBe("https://getentry.ddbj.nig.ac.jp/getentry?database=ddbj&accession_number=U01317")
    expect(entryHref(hit({ type: "taxonomy", identifier: "9606" })))
      .toBe("https://ddbj.nig.ac.jp/tx_search/9606?view=info")
  })

  test("identifier is URL-encoded", () => {
    expect(entryHref(hit({ type: "bioproject", identifier: "PRJDB99/x" })))
      .toBe("https://ddbj.nig.ac.jp/search/entry/bioproject/PRJDB99%2Fx")
  })
})

describe("rowDate", () => {
  test("prefers datePublished", () => {
    expect(rowDate(hit({ datePublished: "2024-01-15", dateModified: "2020-01-01", dateCreated: "2019-01-01" })))
      .toBe("2024-01-15")
  })

  test("falls back published → modified → created", () => {
    expect(rowDate(hit({ datePublished: null, dateModified: "2020-06-01", dateCreated: "2019-01-01" }))).toBe("2020-06-01")
    expect(rowDate(hit({ datePublished: null, dateModified: null, dateCreated: "2019-01-01" }))).toBe("2019-01-01")
    expect(rowDate(hit({ datePublished: null, dateModified: null, dateCreated: null }))).toBeNull()
  })

  test("returns the first present date in priority order (PBT)", () => {
    const maybe = fc.oneof(fc.constant(null), fc.string({ minLength: 1 }))
    fc.assert(
      fc.property(maybe, maybe, maybe, (published, modified, created) => {
        expect(rowDate(hit({ datePublished: published, dateModified: modified, dateCreated: created })))
          .toBe(published ?? modified ?? created ?? null)
      }),
    )
  })
})

describe("rowTitle", () => {
  test("uses title when present", () => {
    expect(rowTitle(hit({ identifier: "X1", title: "Real title" }))).toEqual({ text: "Real title", isIdentifier: false })
  })

  test("falls back to identifier when title is empty", () => {
    expect(rowTitle(hit({ identifier: "JGAC000001", title: null }))).toEqual({ text: "JGAC000001", isIdentifier: true })
    expect(rowTitle(hit({ identifier: "JGAC000001", title: "" }))).toEqual({ text: "JGAC000001", isIdentifier: true })
  })
})

describe("subtypeBadge", () => {
  test("strips the index prefix for multi-subtype DBs", () => {
    expect(subtypeBadge(hit({ type: "sra-experiment" }))).toBe("experiment")
    expect(subtypeBadge(hit({ type: "sra-submission" }))).toBe("submission")
    expect(subtypeBadge(hit({ type: "jga-dac" }))).toBe("dac")
  })

  test("taxonomy uses rank, bioproject flags Umbrella, others have no badge", () => {
    expect(subtypeBadge(hit({ type: "taxonomy", rank: "species" }))).toBe("species")
    expect(subtypeBadge(hit({ type: "taxonomy", rank: null }))).toBeNull()
    expect(subtypeBadge(hit({ type: "bioproject", objectType: "UmbrellaBioProject" }))).toBe("umbrella")
    expect(subtypeBadge(hit({ type: "bioproject", objectType: "BioProject" }))).toBeNull()
    expect(subtypeBadge(hit({ type: "biosample" }))).toBeNull()
    expect(subtypeBadge(hit({ type: "metabobank" }))).toBeNull()
  })
})

describe("organismName", () => {
  test("returned where it carries signal", () => {
    expect(organismName("biosample", hit({ organism: { name: "gut metagenome" } }))).toBe("gut metagenome")
    expect(organismName("trad", hit({ organism: { name: "Homo sapiens" } }))).toBe("Homo sapiens")
  })

  test("suppressed for jga (always Homo sapiens) and taxonomy (organism is the taxon)", () => {
    expect(organismName("jga", hit({ organism: { name: "Homo sapiens" } }))).toBeNull()
    expect(organismName("taxonomy", hit({ organism: { name: "Homo sapiens" } }))).toBeNull()
  })

  test("null when absent", () => {
    expect(organismName("gea", hit({ organism: null }))).toBeNull()
  })
})

describe("isControlled", () => {
  test("true only for controlled-access", () => {
    expect(isControlled(hit({ accessibility: "controlled-access" }))).toBe(true)
    expect(isControlled(hit({ accessibility: "public-access" }))).toBe(false)
    expect(isControlled(hit({}))).toBe(false)
  })
})

describe("isSuppressed", () => {
  test("true only for status=suppressed", () => {
    expect(isSuppressed(hit({ status: "suppressed" }))).toBe(true)
    expect(isSuppressed(hit({ status: "public" }))).toBe(false)
    expect(isSuppressed(hit({ status: "private" }))).toBe(false)
    expect(isSuppressed(hit({ status: "withdrawn" }))).toBe(false)
    expect(isSuppressed(hit({}))).toBe(false)
  })
})

describe("rowExcerpt", () => {
  test("description when present, null otherwise", () => {
    expect(rowExcerpt(hit({ description: "abc" }))).toBe("abc")
    expect(rowExcerpt(hit({ description: null }))).toBeNull()
    expect(rowExcerpt(hit({}))).toBeNull()
  })
})

describe("signatureChips", () => {
  test("bioproject: projectType + relevance, capped", () => {
    const chips = signatureChips("bioproject", hit({
      type: "bioproject",
      projectType: ["genome", "metagenome", "third"],
      relevance: ["Medical"],
    }))
    expect(chips).toEqual([
      { kind: "vocab", value: "genome" },
      { kind: "vocab", value: "metagenome" },
      { kind: "vocab", value: "Medical" },
    ])
  })

  test("biosample: model (vocab) + host/geo (free, labelled)", () => {
    const chips = signatureChips("biosample", hit({
      type: "biosample",
      model: ["MIGS.ba"],
      host: "Crassostrea gigas",
      geoLocName: "Japan: Hiroshima",
    }))
    expect(chips).toEqual([
      { kind: "vocab", value: "MIGS.ba" },
      { kind: "free", value: "Crassostrea gigas", labelKey: "search.results.row.host" },
      { kind: "free", value: "Japan: Hiroshima", labelKey: "search.results.row.geo" },
    ])
  })

  test("sra-experiment surfaces library/platform; sra-analysis surfaces analysisType", () => {
    expect(signatureChips("sra", hit({
      type: "sra-experiment",
      libraryStrategy: ["WGS"],
      platform: "ILLUMINA",
      instrumentModel: ["Illumina HiSeq 4000"],
    }))).toEqual([
      { kind: "vocab", value: "WGS" },
      { kind: "vocab", value: "ILLUMINA" },
      { kind: "vocab", value: "Illumina HiSeq 4000" },
    ])
    expect(signatureChips("sra", hit({ type: "sra-analysis", analysisType: "REFERENCE_ALIGNMENT" })))
      .toEqual([{ kind: "vocab", value: "REFERENCE_ALIGNMENT" }])
  })

  test("free-form type values render as free chips (jga / gea / metabobank)", () => {
    expect(signatureChips("jga", hit({ type: "jga-dataset", datasetType: ["Whole genome sequencing"] })))
      .toEqual([{ kind: "free", value: "Whole genome sequencing" }])
    expect(signatureChips("gea", hit({ type: "gea", experimentType: ["RNA-seq of coding RNA"] })))
      .toEqual([{ kind: "free", value: "RNA-seq of coding RNA" }])
    expect(signatureChips("metabobank", hit({
      type: "metabobank",
      experimentType: ["CE-MS"],
      studyType: ["metabolite profiling"],
    }))).toEqual([
      { kind: "free", value: "CE-MS" },
      { kind: "free", value: "metabolite profiling" },
    ])
  })

  test("trad: molecularType + division (vocab) + sequenceLength (num, formatted)", () => {
    expect(signatureChips("trad", hit({
      type: "trad",
      molecularType: "DNA",
      division: "HUM",
      sequenceLength: 73308,
    }))).toEqual([
      { kind: "vocab", value: "DNA" },
      { kind: "vocab", value: "HUM" },
      { kind: "num", value: "73,308 bp" },
    ])
  })

  test("empty / null signature fields produce no chips", () => {
    expect(signatureChips("bioproject", hit({ type: "bioproject", projectType: null, relevance: [] }))).toEqual([])
    expect(signatureChips("sra", hit({ type: "sra-run" }))).toEqual([])
    expect(signatureChips("taxonomy", hit({ type: "taxonomy" }))).toEqual([])
  })

  test("every emitted chip value is a non-empty string", () => {
    const strOrNull = fc.oneof(fc.constant(null), fc.string())
    fc.assert(
      fc.property(
        fc.array(strOrNull, { maxLength: 4 }),
        strOrNull,
        (model, host) => {
          const chips = signatureChips("biosample", hit({ type: "biosample", model, host }))
          chips.forEach((c) => {
            expect(typeof c.value).toBe("string")
            expect(c.value.length).toBeGreaterThan(0)
          })
        },
      ),
    )
  })
})

describe("taxonomyExtras", () => {
  test("extracts commonName / lineage (array)", () => {
    expect(taxonomyExtras(hit({
      type: "taxonomy",
      commonName: "human",
      lineage: ["Homo", "Homininae", "Hominidae"],
    }))).toEqual({ commonName: "human", lineage: ["Homo", "Homininae", "Hominidae"] })
  })

  test("splits a string lineage", () => {
    expect(taxonomyExtras(hit({ type: "taxonomy", lineage: "Homo; Homininae; Hominidae" }))?.lineage)
      .toEqual(["Homo", "Homininae", "Hominidae"])
  })

  test("null for non-taxonomy hits", () => {
    expect(taxonomyExtras(hit({ type: "trad" }))).toBeNull()
  })
})
