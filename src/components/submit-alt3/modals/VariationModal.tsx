import { useEffect, useState } from "react"

import { useDynamicTranslation } from "@/i18n/useDynamicTranslation"
import type { AddFilePayload } from "@/lib/submit-alt3"
import type { ChipTag, VariationForm, VariationType } from "@/types/submit-alt3"

import ModalShell from "./ModalShell"
import RadioGroup from "./RadioGroup"
import TextField from "./TextField"

// + 変異情報 modal
// SSOT: docs/submit-alt3-modals.md §+ 変異情報

type ReferenceChoice = "none" | "attach" | "reference-only"

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (payload: AddFilePayload) => void
}

const VariationModal = ({ open, onClose, onSubmit }: Props) => {
  const { t } = useDynamicTranslation()
  const [form, setForm] = useState<VariationForm>("per-sample")
  const [variationType, setVariationType] = useState<VariationType>("snp-indel")
  const [reference, setReference] = useState<ReferenceChoice>("none")
  const [referenceAccession, setReferenceAccession] = useState("")

  useEffect(() => {
    if (!open) {
      setForm("per-sample")
      setVariationType("snp-indel")
      setReference("none")
      setReferenceAccession("")
    }
  }, [open])

  const handleSubmit = () => {
    // ファイル名は FileTableSection 側で確定
    const baseName = "variants"
    const chipTags: ChipTag[] = [
      { axis: "variation-form", value: form },
      { axis: "variation-type", value: variationType },
      { axis: "functional-genomics", value: "variation-target" },
    ]

    const refMeta = reference === "reference-only" && referenceAccession.trim() !== ""
      ? { citedAccessions: [referenceAccession.trim()] }
      : undefined

    if (reference === "attach") {
      onSubmit({
        buttonType: "variation",
        groupType: "variation-ref",
        members: [
          { displayName: `${baseName}.vcf.gz`, role: "vcf" },
          { displayName: `${baseName}_reference.fasta`, role: "reference-fasta" },
        ],
        chipTags,
      })
    } else {
      onSubmit({
        buttonType: "variation",
        groupType: "single",
        members: [{ displayName: `${baseName}.vcf.gz`, role: "vcf" }],
        chipTags,
        ...(refMeta !== undefined ? { groupOverrides: { referenceMeta: refMeta } } : {}),
      })
    }
    onClose()
  }

  return (
    <ModalShell
      open={open}
      title={t("routes.submitAlt3.modals.variation.title")}
      onClose={onClose}
      onSubmit={handleSubmit}
      ariaId="variation-modal-title"
    >
      <RadioGroup
        legend={t("routes.submitAlt3.modals.variation.form.label")}
        name="variation-form"
        value={form}
        options={(["per-sample", "aggregate"] as const).map((v) => ({
          value: v,
          label: t(`routes.submitAlt3.modals.variation.form.options.${v}`),
        }))}
        onChange={setForm}
      />

      <RadioGroup
        legend={t("routes.submitAlt3.modals.variation.type.label")}
        name="variation-type"
        value={variationType}
        options={(["snp-indel", "sv", "cnv"] as const).map((v) => ({
          value: v,
          label: t(`routes.submitAlt3.modals.variation.type.options.${v}`),
        }))}
        onChange={setVariationType}
      />

      <RadioGroup
        legend={t("routes.submitAlt3.modals.variation.reference.label")}
        name="variation-reference"
        value={reference}
        options={(["none", "attach", "reference-only"] as const).map((v) => ({
          value: v,
          label: t(`routes.submitAlt3.modals.variation.reference.options.${v}`),
        }))}
        onChange={setReference}
      />

      {reference === "reference-only" && (
        <TextField
          id="variation-ref-accession"
          label={t("routes.submitAlt3.modals.variation.referenceAccession.label")}
          value={referenceAccession}
          onChange={setReferenceAccession}
          placeholder="GCF_000001405.40 or PRJDB#####"
        />
      )}
    </ModalShell>
  )
}

export default VariationModal
