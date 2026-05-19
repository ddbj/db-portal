import { useEffect, useState } from "react"

import { Select } from "@/components/ui"
import { useDynamicTranslation } from "@/i18n/useDynamicTranslation"
import { ASSEMBLY_FORM_TO_FUNCTIONAL_GENOMICS } from "@/lib/mock-data/submit-alt3"
import type { AddFilePayload } from "@/lib/submit-alt3"
import type {
  AssemblyForm,
  BioSampleDraft,
  ChipTag,
  FileEntry,
  HaplotypeNaming,
  ReferenceMeta,
  TpaSubtype,
} from "@/types/submit-alt3"

import CheckboxField from "./CheckboxField"
import ModalShell from "./ModalShell"
import RadioGroup from "./RadioGroup"
import TextField from "./TextField"

type AnalysisKind = "primary" | "third-party"

// + 組み立て済み配列 modal
// SSOT: docs/submit-alt3-modals.md §+ 組み立て済み配列
// assembly-form / provenance / haplotype-mode / tpa-subtype / haplotype-naming を確定

const ASSEMBLY_FORM_OPTIONS: readonly AssemblyForm[] = [
  "wgs", "gnm", "tsa", "tls", "est", "mag", "sag", "htg", "htc", "gss", "syn", "ask",
]

const TPA_SUBTYPE_OPTIONS: readonly TpaSubtype[] = ["tpa-assembly", "tpa-specialist-db"]
const HAPLOTYPE_NAMING_OPTIONS: readonly HaplotypeNaming[] = [
  "principal-alternate",
  "haplotype-1-2",
  "maternal-paternal",
]

// 「既存 BS と関連付け」select の選択肢 1 件
export interface ExistingBsOption {
  bsId: string
  // 識別用ラベル (組み立て先の代表 file displayName + organism)
  label: string
}

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (payload: AddFilePayload) => void
  // 既存 BS 一覧 (空配列なら「既存 BS と関連付け」UI は表示しない)
  existingBsOptions?: readonly ExistingBsOption[]
}

// FileTableSection から渡される helper: 既存 biosamples を fileGroups/fileEntries 経由でラベル付け
export const buildExistingBsOptions = (
  biosamples: readonly BioSampleDraft[],
  fileGroups: readonly { id: string; memberFileIds: string[] }[],
  fileEntries: readonly FileEntry[],
): ExistingBsOption[] => {
  const fileById = new Map(fileEntries.map((f) => [f.id, f] as const))
  const result: ExistingBsOption[] = []
  for (const bs of biosamples) {
    const firstGroupId = bs.sourceGroupIds[0]
    if (firstGroupId === undefined) continue
    const group = fileGroups.find((g) => g.id === firstGroupId)
    const firstFileId = group?.memberFileIds[0]
    const repFile = firstFileId !== undefined ? fileById.get(firstFileId) : undefined
    const fileName = repFile?.displayName ?? "(no files)"
    const organism = repFile?.organism ?? "?"
    result.push({ bsId: bs.id, label: `${bs.id} — ${fileName} (${organism})` })
  }

  return result
}

const AssembledModal = ({
  open,
  onClose,
  onSubmit,
  existingBsOptions = [],
}: Props) => {
  const { t } = useDynamicTranslation()
  const [form, setForm] = useState<AssemblyForm>("wgs")
  const [analysisKind, setAnalysisKind] = useState<AnalysisKind>("primary")
  const [tpaSubtype, setTpaSubtype] = useState<TpaSubtype>("tpa-assembly")
  const [phased, setPhased] = useState(false)
  const [naming, setNaming] = useState<HaplotypeNaming>("principal-alternate")
  const [citedAccession, setCitedAccession] = useState("")
  const [doi, setDoi] = useState("")
  // ""は「新しい sample として登録」、それ以外は既存 BS id (data-model §4.3.1)
  const [linkToBsId, setLinkToBsId] = useState("")

  const resetForm = (): void => {
    setForm("wgs")
    setAnalysisKind("primary")
    setTpaSubtype("tpa-assembly")
    setPhased(false)
    setNaming("principal-alternate")
    setCitedAccession("")
    setDoi("")
    setLinkToBsId("")
  }

  useEffect(() => {
    if (!open) resetForm()
  }, [open])

  const handleSubmit = () => {
    // ファイル名は新規追加時 / 編集時とも FileTableSection 側で確定する (defaultPayload / handleSubmitWithReplace)。
    const baseName = "assembly"
    const thirdParty = analysisKind === "third-party"
    const chipTags: ChipTag[] = [
      { axis: "assembly-form", value: form },
      {
        axis: "functional-genomics",
        value: ASSEMBLY_FORM_TO_FUNCTIONAL_GENOMICS[form],
      },
    ]
    if (thirdParty) {
      chipTags.push({ axis: "provenance", value: "third-party" })
      chipTags.push({ axis: "tpa-subtype", value: tpaSubtype })
    }
    if (phased) {
      chipTags.push({ axis: "haplotype-mode", value: "phased" })
      chipTags.push({ axis: "haplotype-naming", value: naming })
    }

    const refMeta: ReferenceMeta = {}
    if (thirdParty && citedAccession.trim() !== "") {
      refMeta.citedAccessions = citedAccession.split(",").map((s) => s.trim()).filter(Boolean)
    }
    if (thirdParty && doi.trim() !== "") refMeta.doi = doi.trim()

    onSubmit({
      buttonType: "assembled",
      groupType: "single",
      members: [{ displayName: `${baseName}.fasta`, role: "single" }],
      chipTags,
      ...(thirdParty && (refMeta.citedAccessions || refMeta.doi)
        ? { groupOverrides: { referenceMeta: refMeta } }
        : {}),
      ...(linkToBsId !== "" ? { linkToBsId } : {}),
    })
    onClose()
  }

  return (
    <ModalShell
      open={open}
      title={t("routes.submitAlt3.modals.assembled.title")}
      onClose={onClose}
      onSubmit={handleSubmit}
      ariaId="assembled-modal-title"
    >
      <RadioGroup
        legend={t("routes.submitAlt3.modals.assembled.form.label")}
        name="assembled-form"
        value={form}
        options={ASSEMBLY_FORM_OPTIONS.map((v) => ({
          value: v,
          label: t(`routes.submitAlt3.modals.assembled.form.options.${v}`),
        }))}
        onChange={setForm}
      />

      <RadioGroup
        legend={t("routes.submitAlt3.modals.assembled.analysisKind.label", {
          defaultValue: "解析の種類",
        })}
        name="assembled-analysis-kind"
        value={analysisKind}
        options={[
          {
            value: "primary",
            label: t("routes.submitAlt3.modals.assembled.analysisKind.options.primary", {
              defaultValue: "Primary 解析 (新規アセンブル、既定)",
            }),
          },
          {
            value: "third-party",
            label: t("routes.submitAlt3.modals.assembled.analysisKind.options.thirdParty", {
              defaultValue: "Third-party 解析 (TPA、公開配列を再アセンブル)",
            }),
          },
        ]}
        onChange={setAnalysisKind}
      />

      {analysisKind === "third-party" && (
        <>
          <RadioGroup
            legend={t("routes.submitAlt3.modals.assembled.tpaSubtype.label")}
            name="assembled-tpa"
            value={tpaSubtype}
            options={TPA_SUBTYPE_OPTIONS.map((v) => ({
              value: v,
              label: t(`routes.submitAlt3.modals.assembled.tpaSubtype.options.${v}`),
            }))}
            onChange={setTpaSubtype}
          />
          <TextField
            id="assembled-cited-accession"
            label={t("routes.submitAlt3.modals.assembled.citedAccession.label")}
            value={citedAccession}
            onChange={setCitedAccession}
            placeholder="PRJDB1234567, SRR12345678"
          />
          <TextField
            id="assembled-doi"
            label={t("routes.submitAlt3.modals.assembled.doi.label")}
            value={doi}
            onChange={setDoi}
            placeholder="10.1234/example or PubMed:38123456"
          />
        </>
      )}

      <CheckboxField
        label={t("routes.submitAlt3.modals.assembled.phased.label")}
        description={t("routes.submitAlt3.modals.assembled.phased.hint")}
        checked={phased}
        onChange={setPhased}
      />

      {phased && (
        <RadioGroup
          legend={t("routes.submitAlt3.modals.assembled.naming.label")}
          name="assembled-naming"
          value={naming}
          options={HAPLOTYPE_NAMING_OPTIONS.map((v) => ({
            value: v,
            label: t(`routes.submitAlt3.modals.assembled.naming.options.${v}`),
          }))}
          onChange={setNaming}
        />
      )}

      {existingBsOptions.length > 0 && (
        <div className="space-y-1">
          <label
            htmlFor="assembled-link-to-bs"
            className="block text-xs font-semibold tracking-wide text-gray-700"
          >
            {t("routes.submitAlt3.modals.assembled.linkToBs.label", {
              defaultValue: "既存 sample (BioSample) と関連付け",
            })}
          </label>
          <Select
            id="assembled-link-to-bs"
            data-testid="assembled-link-to-bs"
            selectSize="sm"
            value={linkToBsId}
            options={[
              {
                value: "",
                label: t("routes.submitAlt3.modals.assembled.linkToBs.newSample", {
                  defaultValue: "新しい sample として登録 (既定)",
                }),
              },
              ...existingBsOptions.map((o) => ({ value: o.bsId, label: o.label })),
            ]}
            onChange={(e) => setLinkToBsId(e.target.value)}
          />
          <p className="text-[10px] text-gray-500">
            {t("routes.submitAlt3.modals.assembled.linkToBs.hint", {
              defaultValue:
                "raw リードと組み立て結果が同一 sample 由来なら、関連付けて 1 つの BioSample に集約します",
            })}
          </p>
        </div>
      )}
    </ModalShell>
  )
}

export default AssembledModal
