import { useEffect, useState } from "react"

import { useDynamicTranslation } from "@/i18n/useDynamicTranslation"
import type { AddFilePayload } from "@/lib/submit-alt3"
import type { ChipTag, ReferenceMeta } from "@/types/submit-alt3"

import ModalShell from "./ModalShell"
import RadioGroup from "./RadioGroup"
import TextField from "./TextField"

// + 遺伝子アノテーション modal
// SSOT: docs/submit-alt3-modals.md §+ 遺伝子アノテーション

type Target = "assembly" | "transcriptome" | "third-party" | "other"
type Format = "gff" | "genbank" | "other"

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (payload: AddFilePayload) => void
}

const AnnotationModal = ({ open, onClose, onSubmit }: Props) => {
  const { t } = useDynamicTranslation()
  const [target, setTarget] = useState<Target>("assembly")
  const [format, setFormat] = useState<Format>("gff")
  const [baseName, setBaseName] = useState("annotation")
  const [citedAccession, setCitedAccession] = useState("")
  const [doi, setDoi] = useState("")

  useEffect(() => {
    if (!open) {
      setTarget("assembly")
      setFormat("gff")
      setBaseName("annotation")
      setCitedAccession("")
      setDoi("")
    }
  }, [open])

  const handleSubmit = () => {
    const chipTags: ChipTag[] = [
      { axis: "functional-genomics", value: "other" },
    ]
    if (target === "third-party") {
      chipTags.push({ axis: "provenance", value: "third-party" })
    }

    const refMeta: ReferenceMeta = {}
    if (target === "third-party") {
      if (citedAccession.trim() !== "") {
        refMeta.citedAccessions = citedAccession.split(",").map((s) => s.trim()).filter(Boolean)
      }
      if (doi.trim() !== "") refMeta.doi = doi.trim()
    }

    const ext = format === "genbank" ? "gb" : format === "gff" ? "gff3" : "txt"

    onSubmit({
      buttonType: "annotation",
      groupType: "single",
      members: [{ displayName: `${baseName}.${ext}`, role: "single" }],
      chipTags,
      ...(target === "third-party"
        ? { groupOverrides: { referenceMeta: refMeta } }
        : {}),
    })
    // 連続追加対応: modal は閉じずに保持
  }

  return (
    <ModalShell
      open={open}
      title={t("routes.submitAlt3.modals.annotation.title")}
      onClose={onClose}
      onSubmit={handleSubmit}
      ariaId="annotation-modal-title"
    >
      <RadioGroup
        legend={t("routes.submitAlt3.modals.annotation.target.label")}
        name="annot-target"
        value={target}
        options={(
          ["assembly", "transcriptome", "third-party", "other"] as const
        ).map((v) => ({
          value: v,
          label: t(`routes.submitAlt3.modals.annotation.target.options.${v}`),
        }))}
        onChange={setTarget}
      />

      <RadioGroup
        legend={t("routes.submitAlt3.modals.annotation.format.label")}
        name="annot-format"
        value={format}
        options={(["gff", "genbank", "other"] as const).map((v) => ({
          value: v,
          label: t(`routes.submitAlt3.modals.annotation.format.options.${v}`),
        }))}
        onChange={setFormat}
      />

      <TextField
        id="annot-basename"
        label={t("routes.submitAlt3.modals.annotation.baseName.label")}
        value={baseName}
        onChange={setBaseName}
      />

      {target === "third-party" && (
        <>
          <TextField
            id="annot-cited-accession"
            label={t("routes.submitAlt3.modals.annotation.citedAccession.label")}
            value={citedAccession}
            onChange={setCitedAccession}
            placeholder="AB12345678"
          />
          <TextField
            id="annot-doi"
            label={t("routes.submitAlt3.modals.annotation.doi.label")}
            value={doi}
            onChange={setDoi}
            placeholder="10.1234/example or PubMed:38123456"
          />
        </>
      )}
    </ModalShell>
  )
}

export default AnnotationModal
