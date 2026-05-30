import { type SubmitKindRoute,SubmitRoutingCatalog } from "~/schemas/content/submit-routing-content"
import type { FileTypeKind, Q1, Q2, Service } from "~/schemas/submit"

// Tier1 ルーティング・カタログ (データ駆動)。DDBJ が編集し、起動時 Zod 検証で typo が落ちる。
// rules は first-match。emit.service は登録エンドポイント (destination ∪ {jpost, eva})。
// JGA 分岐は access=restricted ∧ q2=human (ヒト個人のみ。メタゲノム/環境は対象外)。
const catalogData = {
  // カスケード: allowedRepos = Q1.repos ∩ Q2.repos。rules を実行せず repos を読むだけで判定する。
  // repos は DDBJ 内登録先 (role=destination) のみ。塩基配列の Web 登録窓口 nsss を含む。
  q1Options: [
    { id: "public", repos: ["dra", "ddbj-trad", "nsss", "togovar", "gea", "metabobank"] },
    { id: "restricted", repos: ["jga"] },
    { id: "third-party", repos: ["ddbj-trad", "metabobank"] },
  ],
  q2Options: [
    { id: "human", repos: ["dra", "jga", "ddbj-trad", "nsss", "togovar", "gea", "metabobank"] },
    { id: "eukaryote", repos: ["dra", "ddbj-trad", "nsss", "togovar", "gea", "metabobank"] },
    { id: "prokaryote", repos: ["dra", "ddbj-trad", "nsss", "togovar", "gea", "metabobank"] },
    { id: "virus", repos: ["dra", "ddbj-trad", "nsss", "togovar", "gea", "metabobank"] },
    { id: "metagenome", repos: ["dra", "ddbj-trad", "nsss", "togovar", "gea", "metabobank"] },
  ],
  kindRoutes: [
    {
      id: "sequence-read",
      candidateRepos: ["dra", "jga"],
      rules: [
        {
          when: { and: [{ access: "restricted" }, { q2: "human" }] },
          emit: {
            service: "jga",
            scope: "entry",
            notes: [
              { kind: "info", messageKey: "submit.sequenceRead.jga.intro" },
              { kind: "info", messageKey: "submit.sequenceRead.jga.dbclsPolicy" },
            ],
          },
        },
        {
          when: { always: true },
          emit: {
            service: "dra",
            scope: "entry",
            notes: [
              { kind: "info", messageKey: "submit.sequenceRead.dra.intro" },
              {
                kind: "info",
                messageKey: "submit.sequenceRead.dra.restrictedNonHumanEmbargo",
                whenAny: { access: "restricted" },
              },
            ],
          },
        },
      ],
    },
    {
      id: "sequence-nucleotide",
      candidateRepos: ["ddbj-trad", "nsss", "dra"],
      rules: [
        {
          when: { and: [{ groupType: "mag-sag-chain" }, { anyChip: { axis: "assembly-form", value: "mag" } }] },
          emit: {
            service: "ddbj-trad",
            scope: "group",
            notes: [
              { kind: "info", messageKey: "submit.ddbjTrad.mag.envGenomeEntry" },
              { kind: "warning", messageKey: "submit.ddbjTrad.mag.rawReadsToDraRequired" },
            ],
          },
        },
        {
          when: { and: [{ groupType: "mag-sag-chain" }, { anyChip: { axis: "assembly-form", value: "sag" } }] },
          emit: {
            service: "ddbj-trad",
            scope: "group",
            notes: [{ kind: "info", messageKey: "submit.ddbjTrad.sag.misagPackage" }],
          },
        },
        {
          when: { or: [{ q1: "third-party" }, { anyChip: { axis: "provenance", value: "third-party" } }] },
          emit: {
            service: "ddbj-trad",
            scope: "entry",
            notes: [
              { kind: "info", messageKey: "submit.ddbjTrad.tpa.intro" },
              { kind: "warning", messageKey: "submit.ddbjTrad.tpa.primaryAccessionRequired" },
            ],
          },
        },
        {
          when: { always: true },
          emit: {
            service: "nsss",
            scope: "entry",
            notes: [
              { kind: "info", messageKey: "submit.nsss.intro" },
              { kind: "info", messageKey: "submit.nsss.specialToMss" },
              { kind: "warning", messageKey: "submit.nsss.notForReads", whenAny: { dataForm: "raw" } },
            ],
          },
        },
      ],
    },
    {
      id: "sequence-annotation",
      candidateRepos: ["ddbj-trad"],
      rules: [
        {
          when: { groupType: "assembly-annotation" },
          emit: {
            service: "ddbj-trad",
            scope: "group",
            notes: [
              { kind: "info", messageKey: "submit.ddbjTrad.assemblyAnnotation.intro" },
              { kind: "info", messageKey: "submit.ddbjTrad.assemblyAnnotation.filenamePairing" },
              {
                kind: "info",
                messageKey: "submit.ddbjTrad.locusTagPrefix",
                whenAny: { anyChip: { axis: "assembly-form", value: "mag" } },
              },
            ],
          },
        },
        {
          when: { or: [{ q1: "third-party" }, { anyChip: { axis: "provenance", value: "third-party" } }] },
          emit: {
            service: "ddbj-trad",
            scope: "entry",
            notes: [
              { kind: "info", messageKey: "submit.ddbjTrad.tpa.intro" },
              { kind: "warning", messageKey: "submit.ddbjTrad.tpa.primaryAccessionRequired" },
            ],
          },
        },
        {
          when: { always: true },
          emit: {
            service: "ddbj-trad",
            scope: "entry",
            notes: [
              { kind: "info", messageKey: "submit.ddbjTrad.annotation.intro" },
              { kind: "warning", messageKey: "submit.ddbjTrad.annotation.needsSequencePair" },
            ],
          },
        },
      ],
    },
    {
      id: "variant",
      candidateRepos: ["togovar", "eva", "jga"],
      rules: [
        {
          when: { and: [{ access: "restricted" }, { q2: "human" }] },
          emit: {
            service: "jga",
            scope: "entry",
            notes: [
              { kind: "info", messageKey: "submit.variant.jga.intro" },
              {
                kind: "info",
                messageKey: "submit.variant.referenceByName",
                whenAny: { groupType: "variation-with-reference" },
              },
              { kind: "info", messageKey: "submit.variant.jga.policyDelegated" },
            ],
          },
        },
        {
          when: { q2: "human" },
          emit: {
            service: "togovar",
            scope: "entry",
            notes: [
              { kind: "info", messageKey: "submit.variant.togovar.intro" },
              {
                kind: "info",
                messageKey: "submit.variant.referenceByName",
                whenAny: { groupType: "variation-with-reference" },
              },
            ],
          },
        },
        {
          when: { always: true },
          emit: {
            service: "eva",
            scope: "entry",
            notes: [
              { kind: "info", messageKey: "submit.variant.eva.nonHuman" },
              {
                kind: "info",
                messageKey: "submit.variant.referenceByName",
                whenAny: { groupType: "variation-with-reference" },
              },
            ],
          },
        },
      ],
    },
    {
      id: "expression-matrix",
      candidateRepos: ["gea"],
      rules: [
        {
          when: { always: true },
          emit: {
            service: "gea",
            scope: "entry",
            notes: [{ kind: "info", messageKey: "submit.gea.expressionMatrix.intro" }],
          },
        },
      ],
    },
    {
      id: "microarray-expression",
      candidateRepos: ["gea", "jga"],
      rules: [
        {
          when: { and: [{ access: "restricted" }, { q2: "human" }] },
          emit: {
            service: "jga",
            scope: "entry",
            notes: [{ kind: "info", messageKey: "submit.jga.array.intro" }],
          },
        },
        {
          when: { always: true },
          emit: {
            service: "gea",
            scope: "entry",
            notes: [{ kind: "info", messageKey: "submit.gea.microarray.intro" }],
          },
        },
      ],
    },
    {
      id: "spatial-transcriptomics",
      candidateRepos: ["gea"],
      rules: [
        {
          when: { always: true },
          emit: {
            service: "gea",
            scope: "group",
            notes: [
              { kind: "info", messageKey: "submit.gea.spatial.intro" },
              {
                kind: "info",
                messageKey: "submit.gea.spatial.sequencingRawToDra",
                whenAny: {
                  or: [
                    { anyChip: { axis: "spatial-platform", value: "visium" } },
                    { anyChip: { axis: "spatial-platform", value: "stereo-seq" } },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
    {
      id: "spatial-image",
      candidateRepos: ["gea"],
      rules: [
        {
          when: { always: true },
          emit: {
            service: "gea",
            scope: "group",
            notes: [
              { kind: "info", messageKey: "submit.gea.spatialImage.intro" },
              {
                kind: "warning",
                messageKey: "submit.gea.spatialImage.largeImageGeneralist",
                whenAny: { anyChip: { axis: "spatial-platform", value: "merfish" } },
              },
            ],
          },
        },
      ],
    },
    {
      id: "mass-spectrometry",
      candidateRepos: ["metabobank", "jpost"],
      rules: [
        {
          when: { anyChip: { axis: "mass-spec-domain", value: "proteomics" } },
          emit: {
            service: "jpost",
            scope: "entry",
            notes: [{ kind: "info", messageKey: "submit.jpost.proteomics" }],
          },
        },
        {
          when: { always: true },
          emit: {
            service: "metabobank",
            scope: "entry",
            notes: [
              { kind: "info", messageKey: "submit.metabobank.ms.intro" },
              {
                kind: "info",
                messageKey: "submit.metabobank.ms.imagingImageFiles",
                whenAny: { groupType: "imaging-ms" },
              },
            ],
          },
        },
      ],
    },
    {
      id: "nmr",
      candidateRepos: ["metabobank"],
      rules: [
        {
          when: { always: true },
          emit: {
            service: "metabobank",
            scope: "entry",
            notes: [{ kind: "info", messageKey: "submit.metabobank.nmr.intro" }],
          },
        },
      ],
    },
    {
      id: "metabolite-assignment",
      candidateRepos: ["metabobank", "jpost"],
      rules: [
        {
          when: { anyChip: { axis: "mass-spec-domain", value: "proteomics" } },
          emit: {
            service: "jpost",
            scope: "entry",
            notes: [{ kind: "info", messageKey: "submit.jpost.proteomics" }],
          },
        },
        {
          when: { always: true },
          emit: {
            service: "metabobank",
            scope: "entry",
            notes: [{ kind: "info", messageKey: "submit.metabobank.maf.intro" }],
          },
        },
      ],
    },
  ],
}

export const validateSubmitRouting = () => SubmitRoutingCatalog.safeParse(catalogData)

const parsed = validateSubmitRouting()
if (!parsed.success) {
  const messages = parsed.error.issues
    .map((i) => `  ${i.path.join(".") || "<root>"}: ${i.message}`)
    .join("\n")
  throw new Error(`Submit routing catalog validation failed:\n${messages}`)
}

export const SUBMIT_ROUTING = parsed.data

const routeByKind = new Map<FileTypeKind, SubmitKindRoute>(
  SUBMIT_ROUTING.kindRoutes.map((r) => [r.id, r]),
)
const q1ReposById = new Map<Q1, readonly Service[]>(SUBMIT_ROUTING.q1Options.map((o) => [o.id, o.repos]))
const q2ReposById = new Map<Q2, readonly Service[]>(SUBMIT_ROUTING.q2Options.map((o) => [o.id, o.repos]))

export const listKindRoutes = (): readonly SubmitKindRoute[] => SUBMIT_ROUTING.kindRoutes

export const getKindRoute = (kind: FileTypeKind): SubmitKindRoute => {
  const route = routeByKind.get(kind)
  if (route === undefined) throw new Error(`no KindRoute for "${kind}"`)

  return route
}

export const getQ1Repos = (q1: Q1): readonly Service[] => q1ReposById.get(q1) ?? []

export const getQ2Repos = (q2: Q2): readonly Service[] => q2ReposById.get(q2) ?? []

export const allCatalogMessageKeys = (): readonly string[] => {
  const keys = new Set<string>()
  for (const route of SUBMIT_ROUTING.kindRoutes) {
    for (const rule of route.rules) {
      for (const note of rule.emit.notes) keys.add(note.messageKey)
    }
  }

  return [...keys]
}
