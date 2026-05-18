import { useEffect, useState } from "react"

import { useDynamicTranslation } from "@/i18n/useDynamicTranslation"
import type { AddFilePayload } from "@/lib/submit-alt3"
import type { ChipTag, FileRole, GroupType } from "@/types/submit-alt3"

import CheckboxField from "./CheckboxField"
import ModalShell from "./ModalShell"
import RadioGroup from "./RadioGroup"
import TextField from "./TextField"

// + RNA-seq 発現マトリクス modal
// SSOT: docs/submit-alt3-modals.md §+ RNA-seq 発現マトリクス

type Content = "counts" | "normalized" | "other"
type ExperimentCategory =
  | "bulk-rnaseq"
  | "single-cell"
  | "mirna"
  | "bisulfite"
  | "chipseq"
  | "hic"
  | "ripseq"
  | "genotyping"
  | "other"

const CATEGORIES: readonly ExperimentCategory[] = [
  "bulk-rnaseq",
  "single-cell",
  "mirna",
  "bisulfite",
  "chipseq",
  "hic",
  "ripseq",
  "genotyping",
  "other",
]

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (payload: AddFilePayload) => void
}

const ExpressionMatrixModal = ({ open, onClose, onSubmit }: Props) => {
  const { t } = useDynamicTranslation()
  const [content, setContent] = useState<Content>("counts")
  const [category, setCategory] = useState<ExperimentCategory>("bulk-rnaseq")
  const [attachMageTab, setAttachMageTab] = useState(false)
  const [baseName, setBaseName] = useState("matrix")

  useEffect(() => {
    if (!open) {
      setContent("counts")
      setCategory("bulk-rnaseq")
      setAttachMageTab(false)
      setBaseName("matrix")
    }
  }, [open])

  const handleSubmit = () => {
    const chipTags: ChipTag[] = [{ axis: "functional-genomics", value: "yes" }]
    const groupType: GroupType = attachMageTab ? "mage-tab" : "single"
    const members: { displayName: string; role: FileRole }[] = [
      {
        displayName: `${baseName}_${content === "normalized" ? "tpm" : content}.tsv`,
        role: attachMageTab ? "processed" : "single",
      },
    ]
    if (attachMageTab) {
      members.push({ displayName: `${baseName}.idf.txt`, role: "idf" })
      members.push({ displayName: `${baseName}.sdrf.txt`, role: "sdrf" })
    }

    onSubmit({
      buttonType: "expression-matrix",
      groupType,
      members,
      chipTags,
      groupOverrides: { experimentTypeHint: category },
    })
    onClose()
  }

  return (
    <ModalShell
      open={open}
      title={t("routes.submitAlt3.modals.expressionMatrix.title")}
      onClose={onClose}
      onSubmit={handleSubmit}
      ariaId="expmatrix-modal-title"
    >
      <RadioGroup
        legend={t("routes.submitAlt3.modals.expressionMatrix.content.label")}
        name="expmatrix-content"
        value={content}
        options={(["counts", "normalized", "other"] as const).map((v) => ({
          value: v,
          label: t(`routes.submitAlt3.modals.expressionMatrix.content.options.${v}`),
        }))}
        onChange={setContent}
      />

      <RadioGroup
        legend={t("routes.submitAlt3.modals.expressionMatrix.category.label")}
        name="expmatrix-category"
        value={category}
        options={CATEGORIES.map((v) => ({
          value: v,
          label: t(`routes.submitAlt3.modals.expressionMatrix.category.options.${v}`),
        }))}
        onChange={setCategory}
      />

      <CheckboxField
        label={t("routes.submitAlt3.modals.expressionMatrix.mageTab.label")}
        description={t("routes.submitAlt3.modals.expressionMatrix.mageTab.hint")}
        checked={attachMageTab}
        onChange={setAttachMageTab}
      />

      <TextField
        id="expmatrix-basename"
        label={t("routes.submitAlt3.modals.expressionMatrix.baseName.label")}
        value={baseName}
        onChange={setBaseName}
      />
    </ModalShell>
  )
}

export default ExpressionMatrixModal
