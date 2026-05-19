import { useEffect, useState } from "react"

import { useDynamicTranslation } from "@/i18n/useDynamicTranslation"
import type { AddFilePayload } from "@/lib/submit-alt3"
import type { ChipTag } from "@/types/submit-alt3"

import ModalShell from "./ModalShell"
import RadioGroup from "./RadioGroup"

// + 表現型データ modal
// SSOT: docs/submit-alt3-modals.md §+ 表現型データ

type Format = "tsv" | "xlsx" | "other"
type Identifiable = "yes" | "no" | "unknown"
type Dataset = "yes" | "no"

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (payload: AddFilePayload) => void
}

const PhenotypeModal = ({ open, onClose, onSubmit }: Props) => {
  const { t } = useDynamicTranslation()
  const [format, setFormat] = useState<Format>("tsv")
  const [identifiable, setIdentifiable] = useState<Identifiable>("no")
  const [dataset, setDataset] = useState<Dataset>("no")

  useEffect(() => {
    if (!open) {
      setFormat("tsv")
      setIdentifiable("no")
      setDataset("no")
    }
  }, [open])

  const handleSubmit = () => {
    // ファイル名は FileTableSection 側で確定
    const baseName = "phenotype"
    const chipTags: ChipTag[] = [
      { axis: "functional-genomics", value: "other" },
    ]

    // 個人特定 yes / 不明 -> access=restricted を自動付与 (Rule 10c)
    const autoAccess = identifiable === "yes" || identifiable === "unknown"
      ? ("restricted" as const)
      : undefined

    const ext = format === "xlsx" ? "xlsx" : format === "tsv" ? "tsv" : "txt"

    onSubmit({
      buttonType: "phenotype",
      groupType: dataset === "yes" ? "jga-dataset" : "single",
      members: [{ displayName: `${baseName}.${ext}`, role: "phenotype-table" }],
      chipTags,
      ...(autoAccess !== undefined ? { autoAccess } : {}),
    })
    onClose()
  }

  return (
    <ModalShell
      open={open}
      title={t("routes.submitAlt3.modals.phenotype.title")}
      onClose={onClose}
      onSubmit={handleSubmit}
      ariaId="phenotype-modal-title"
    >
      <RadioGroup
        legend={t("routes.submitAlt3.modals.phenotype.format.label")}
        name="phenotype-format"
        value={format}
        options={(["tsv", "xlsx", "other"] as const).map((v) => ({
          value: v,
          label: t(`routes.submitAlt3.modals.phenotype.format.options.${v}`),
        }))}
        onChange={setFormat}
      />

      <RadioGroup
        legend={t("routes.submitAlt3.modals.phenotype.identifiable.label")}
        name="phenotype-identifiable"
        value={identifiable}
        options={(["yes", "no", "unknown"] as const).map((v) => ({
          value: v,
          label: t(`routes.submitAlt3.modals.phenotype.identifiable.options.${v}`),
        }))}
        onChange={setIdentifiable}
      />

      <RadioGroup
        legend={t("routes.submitAlt3.modals.phenotype.dataset.label")}
        name="phenotype-dataset"
        value={dataset}
        options={(["no", "yes"] as const).map((v) => ({
          value: v,
          label: t(`routes.submitAlt3.modals.phenotype.dataset.options.${v}`),
        }))}
        onChange={setDataset}
      />

    </ModalShell>
  )
}

export default PhenotypeModal
