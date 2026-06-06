import fc from "fast-check"
import { describe, expect, test } from "vitest"

import {
  ancestryRow,
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
  taxonomyCommonName,
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
    expect(entryHref(hit({ type: "ddbj", identifier: "U01317" })))
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
    expect(organismName("ddbj", hit({ organism: { name: "Homo sapiens" } }))).toBe("Homo sapiens")
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

  test("ddbj / taxonomy carry no excerpt (description is null; reference prose is detail-only)", () => {
    expect(rowExcerpt(hit({ type: "ddbj", description: null, referenceTitle: ["A paper title"] }))).toBeNull()
    expect(rowExcerpt(hit({ type: "taxonomy", description: null }))).toBeNull()
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
      { kind: "free", value: "Crassostrea gigas", labelKey: "search.facets.field.host" },
      { kind: "free", value: "Japan: Hiroshima", labelKey: "search.facets.field.geoLocName" },
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

  test("ddbj: molecularType + division (vocab) + sequenceLength (num, formatted)", () => {
    expect(signatureChips("ddbj", hit({
      type: "ddbj",
      molecularType: "DNA",
      division: "HUM",
      sequenceLength: 73308,
    }))).toEqual([
      { kind: "vocab", value: "DNA" },
      { kind: "vocab", value: "HUM" },
      { kind: "num", value: "73,308 bp" },
    ])
  })

  test("biosample: package (displayName, vocab) leads; collectionDate (free, labelled) trails", () => {
    expect(signatureChips("biosample", hit({
      type: "biosample",
      package: { name: "MIGS.ba.soil", displayName: "MIGS: soil" },
      model: ["MIGS.ba"],
      collectionDate: "2020-04",
    }))).toEqual([
      { kind: "vocab", value: "MIGS: soil" },
      { kind: "vocab", value: "MIGS.ba" },
      { kind: "free", value: "2020-04", labelKey: "search.facets.field.collectionDate" },
    ])
  })

  test("biosample: package falls back to name when displayName is absent", () => {
    expect(signatureChips("biosample", hit({ type: "biosample", package: { name: "MIGS.ba.soil", displayName: null } })))
      .toEqual([{ kind: "vocab", value: "MIGS.ba.soil" }])
  })

  test("sra-experiment surfaces librarySelection + libraryLayout (vocab)", () => {
    expect(signatureChips("sra", hit({
      type: "sra-experiment",
      librarySelection: ["RANDOM"],
      libraryLayout: "PAIRED",
    }))).toEqual([
      { kind: "vocab", value: "RANDOM" },
      { kind: "vocab", value: "PAIRED" },
    ])
  })

  test("sra-sample surfaces geoLocName + collectionDate (free, labelled)", () => {
    expect(signatureChips("sra", hit({ type: "sra-sample", geoLocName: "Japan: Hiroshima", collectionDate: "2019" })))
      .toEqual([
        { kind: "free", value: "Japan: Hiroshima", labelKey: "search.facets.field.geoLocName" },
        { kind: "free", value: "2019", labelKey: "search.facets.field.collectionDate" },
      ])
  })

  test("INSDC missing-value placeholders emit no chip across host / strain / isolate / geoLocName / collectionDate", () => {
    for (const token of ["N/A", "na", "missing", "not applicable", "not collected", "restricted access", "Unknown", "-"]) {
      expect(signatureChips("biosample", hit({
        type: "biosample",
        host: token,
        strain: token,
        isolate: token,
        geoLocName: token,
        collectionDate: token,
      }))).toEqual([])
      expect(signatureChips("sra", hit({ type: "sra-sample", geoLocName: token, collectionDate: token }))).toEqual([])
    }
  })

  test("real attribute values still emit chips alongside filtered placeholders", () => {
    expect(signatureChips("biosample", hit({ type: "biosample", isolate: "not applicable", strain: "JBKA-6" })))
      .toEqual([{ kind: "free", value: "JBKA-6" }])
  })

  test("jga-study surfaces vendor (vocab) after studyType", () => {
    expect(signatureChips("jga", hit({ type: "jga-study", studyType: ["Control Set"], vendor: ["Illumina"] })))
      .toEqual([
        { kind: "free", value: "Control Set" },
        { kind: "vocab", value: "Illumina" },
      ])
  })

  test("metabobank surfaces submissionType (vocab) after experimentType", () => {
    expect(signatureChips("metabobank", hit({ type: "metabobank", experimentType: ["LC-MS"], submissionType: ["open"] })))
      .toEqual([
        { kind: "free", value: "LC-MS" },
        { kind: "vocab", value: "open" },
      ])
  })

  test("ddbj surfaces geneName (vocab, capped at 2) after the sequence chips; no publication chip", () => {
    expect(signatureChips("ddbj", hit({
      type: "ddbj",
      molecularType: "DNA",
      geneName: ["rbcL", "matK", "trnH"],
      referenceJournal: ["Nature 405:1"],
    }))).toEqual([
      { kind: "vocab", value: "DNA" },
      { kind: "vocab", value: "rbcL" },
      { kind: "vocab", value: "matK" },
    ])
  })

  test("taxonomy chips are blastName (vocab) + first synonym (free, labelled); ranks ride the Classification row", () => {
    expect(signatureChips("taxonomy", hit({
      type: "taxonomy",
      kingdom: "Metazoa",
      genus: "Homo",
      blastName: "primates",
      synonym: ["Homo sapiens Linnaeus", "second name"],
    }))).toEqual([
      { kind: "vocab", value: "primates" },
      { kind: "free", value: "Homo sapiens Linnaeus", labelKey: "search.facets.field.synonym" },
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

describe("taxonomyCommonName", () => {
  test("taxonomy commonName, null elsewhere", () => {
    expect(taxonomyCommonName(hit({ type: "taxonomy", commonName: "human" }))).toBe("human")
    expect(taxonomyCommonName(hit({ type: "taxonomy", commonName: null }))).toBeNull()
    expect(taxonomyCommonName(hit({ type: "ddbj", commonName: "x" }))).toBeNull()
  })
})

describe("ancestryRow", () => {
  test("taxonomy → named Linnaean ranks, general→specific, present ones only", () => {
    expect(ancestryRow(hit({
      type: "taxonomy",
      kingdom: "Metazoa",
      phylum: "Arthropoda",
      class: "Insecta",
      order: "Diptera",
      family: "Drosophilidae",
      genus: "Drosophila",
    }))).toEqual(["Metazoa", "Arthropoda", "Insecta", "Diptera", "Drosophilidae", "Drosophila"])
    expect(ancestryRow(hit({ type: "taxonomy", kingdom: "Metazoa", genus: "Homo" }))).toEqual(["Metazoa", "Homo"])
  })

  test("ddbj → raw source-organism lineage (drops empty entries)", () => {
    expect(ancestryRow(hit({ type: "ddbj", lineage: ["Eukaryota", "", "Metazoa"] })))
      .toEqual(["Eukaryota", "Metazoa"])
  })

  test("empty for other DBs and when no rank / lineage is present", () => {
    expect(ancestryRow(hit({ type: "bioproject" }))).toEqual([])
    expect(ancestryRow(hit({ type: "taxonomy" }))).toEqual([])
    expect(ancestryRow(hit({ type: "ddbj" }))).toEqual([])
  })
})
