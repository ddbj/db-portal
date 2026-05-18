import { useEffect, useState } from "react"

import { useDynamicTranslation } from "@/i18n/useDynamicTranslation"
import type { AddFilePayload } from "@/lib/submit-alt3"
import type { ChipTag, FunctionalGenomics } from "@/types/submit-alt3"

import CheckboxField from "./CheckboxField"
import ModalShell from "./ModalShell"
import RadioGroup from "./RadioGroup"
import TextField from "./TextField"

// + 配列リード modal (Phase B 拡張版)
// SSOT: docs/submit-alt3-modals.md §+ 配列リード
// Phase B 追加: 10x / BAM / PacBio HDF5 / multiplex 構成、Hybrid Assembly チェック

type Layout = "single-end" | "pair-end" | "10x" | "bam" | "pacbio-hdf5"
type MultiplexState = "single-sample" | "demultiplexed"
type Q1 = "yes" | "no"
type Q2Value = Exclude<FunctionalGenomics, "yes">

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (payload: AddFilePayload) => void
}

const SequenceReadModal = ({ open, onClose, onSubmit }: Props) => {
  const { t } = useDynamicTranslation()
  const [layout, setLayout] = useState<Layout>("pair-end")
  const [multiplex, setMultiplex] = useState<MultiplexState>("single-sample")
  const [hybrid, setHybrid] = useState(false)
  const [q1, setQ1] = useState<Q1>("yes")
  const [q2, setQ2] = useState<Q2Value>("wgs-target")
  const [baseName, setBaseName] = useState("sample")
  const [sampleCount, setSampleCount] = useState("3")

  useEffect(() => {
    if (!open) {
      setLayout("pair-end")
      setMultiplex("single-sample")
      setHybrid(false)
      setQ1("yes")
      setQ2("wgs-target")
      setBaseName("sample")
      setSampleCount("3")
    }
  }, [open])

  const handleSubmit = () => {
    const fg: FunctionalGenomics = q1 === "yes" ? "yes" : q2
    const chipTags: ChipTag[] = [{ axis: "functional-genomics", value: fg }]

    // multiplex は事前 demultiplex 済みのみを許容 (modals.md §+配列リード)
    if (multiplex === "demultiplexed") {
      const n = Math.max(1, parseInt(sampleCount, 10) || 1)
      const members = Array.from({ length: n }, (_, i) => ({
        displayName: `${baseName}_sample${i + 1}.fastq.gz`,
        role: "demultiplexed-per-sample" as const,
      }))
      onSubmit({
        buttonType: "sequence-read",
        groupType: "multiplex",
        members,
        chipTags,
      })
      // 連続追加対応: modal は閉じずに保持

      return
    }

    let payload: AddFilePayload
    switch (layout) {
      case "pair-end":
        payload = {
          buttonType: "sequence-read",
          groupType: "pair-end",
          members: [
            { displayName: `${baseName}_R1.fastq.gz`, role: "r1" },
            { displayName: `${baseName}_R2.fastq.gz`, role: "r2" },
          ],
          chipTags,
        }
        break
      case "10x":
        payload = {
          buttonType: "sequence-read",
          groupType: "10x",
          members: [
            { displayName: `${baseName}_I1.fastq.gz`, role: "i1" },
            { displayName: `${baseName}_R1.fastq.gz`, role: "r1" },
            { displayName: `${baseName}_R2.fastq.gz`, role: "r2" },
          ],
          chipTags,
        }
        break
      case "pacbio-hdf5":
        payload = {
          buttonType: "sequence-read",
          groupType: "pacbio-hdf5",
          members: [
            { displayName: `${baseName}.bas.h5`, role: "bas-h5" },
            { displayName: `${baseName}.1.bax.h5`, role: "bax-h5" },
            { displayName: `${baseName}.2.bax.h5`, role: "bax-h5" },
            { displayName: `${baseName}.3.bax.h5`, role: "bax-h5" },
          ],
          chipTags,
        }
        break
      case "bam":
        payload = {
          buttonType: "sequence-read",
          groupType: "single",
          members: [{ displayName: `${baseName}.bam`, role: "bam" }],
          chipTags,
        }
        break
      default:
        payload = {
          buttonType: "sequence-read",
          groupType: "single",
          members: [{ displayName: `${baseName}.fastq.gz`, role: "single" }],
          chipTags,
        }
    }

    if (hybrid) {
      // Phase C で hybrid メタ Group の構築を generateFlowCard 側で扱う。
      // Phase B では Group 自体は通常通り作り、後段の Group 連結 UI は別タスク (open-questions §10.1)。
      payload = { ...payload, chipTags: [...chipTags] }
    }

    onSubmit(payload)
    // 連続追加対応: modal は閉じずに保持 (キャンセル / ESC / 背景クリックで閉じる)
  }

  const layoutOptions = (
    [
      { value: "single-end", label: t("routes.submitAlt3.modals.sequenceRead.layout.singleEnd") },
      { value: "pair-end", label: t("routes.submitAlt3.modals.sequenceRead.layout.pairEnd") },
      { value: "10x", label: t("routes.submitAlt3.modals.sequenceRead.layout.tenx") },
      { value: "bam", label: t("routes.submitAlt3.modals.sequenceRead.layout.bam") },
      { value: "pacbio-hdf5", label: t("routes.submitAlt3.modals.sequenceRead.layout.pacbioHdf5") },
    ] as const
  ).map((o) => ({ value: o.value, label: o.label }))

  const showMultiplexQuestion =
    layout === "single-end" || layout === "pair-end" || layout === "bam"

  return (
    <ModalShell
      open={open}
      title={t("routes.submitAlt3.modals.sequenceRead.title")}
      onClose={onClose}
      onSubmit={handleSubmit}
      ariaId="seqread-modal-title"
    >
      <RadioGroup
        legend={t("routes.submitAlt3.modals.sequenceRead.layout.label")}
        name="seqread-layout"
        value={layout}
        options={layoutOptions}
        onChange={setLayout}
      />

      {showMultiplexQuestion && (
        <RadioGroup
          legend={t("routes.submitAlt3.modals.sequenceRead.multiplex.label")}
          name="seqread-multiplex"
          value={multiplex}
          options={[
            {
              value: "single-sample",
              label: t("routes.submitAlt3.modals.sequenceRead.multiplex.singleSample"),
            },
            {
              value: "demultiplexed",
              label: t("routes.submitAlt3.modals.sequenceRead.multiplex.demultiplexed"),
              description: t("routes.submitAlt3.modals.sequenceRead.multiplex.demultiplexedHint"),
            },
          ]}
          onChange={setMultiplex}
        />
      )}

      <TextField
        id="seqread-basename"
        label={t("routes.submitAlt3.modals.sequenceRead.baseName.label")}
        value={baseName}
        onChange={setBaseName}
      />

      {multiplex === "demultiplexed" && (
        <TextField
          id="seqread-samplecount"
          label={t("routes.submitAlt3.modals.sequenceRead.multiplex.sampleCount")}
          value={sampleCount}
          onChange={setSampleCount}
        />
      )}

      <CheckboxField
        label={t("routes.submitAlt3.modals.sequenceRead.hybrid.label")}
        description={t("routes.submitAlt3.modals.sequenceRead.hybrid.hint")}
        checked={hybrid}
        onChange={setHybrid}
      />

      <RadioGroup
        legend={t("routes.submitAlt3.modals.sequenceRead.q1.label")}
        name="seqread-q1"
        value={q1}
        options={[
          { value: "yes", label: t("routes.submitAlt3.modals.sequenceRead.q1.yes") },
          { value: "no", label: t("routes.submitAlt3.modals.sequenceRead.q1.no") },
        ]}
        onChange={setQ1}
      />

      {q1 === "no" && (
        <RadioGroup
          legend={t("routes.submitAlt3.modals.sequenceRead.q2.label")}
          name="seqread-q2"
          value={q2}
          options={(
            [
              "wgs-target",
              "tsa-target",
              "metagenome-target",
              "variation-target",
              "wes-target",
              "other",
            ] as const
          ).map((v) => ({
            value: v,
            label: t(`routes.submitAlt3.modals.sequenceRead.q2.options.${v}`),
          }))}
          onChange={setQ2}
        />
      )}
    </ModalShell>
  )
}

export default SequenceReadModal
