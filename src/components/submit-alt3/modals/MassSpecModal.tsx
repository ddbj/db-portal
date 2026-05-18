import { useEffect, useState } from "react"

import { useDynamicTranslation } from "@/i18n/useDynamicTranslation"
import type { AddFilePayload } from "@/lib/submit-alt3"
import type {
  ChipTag,
  FileRole,
  GroupType,
  MassSpecDomain,
} from "@/types/submit-alt3"

import CheckboxField from "./CheckboxField"
import ModalShell from "./ModalShell"
import RadioGroup from "./RadioGroup"
import TextField from "./TextField"

// + 質量分析 modal
// SSOT: docs/submit-alt3-modals.md §+ 質量分析

type MetaboBankSubmissionType =
  | "LC-MS"
  | "LC-DAD-MS"
  | "GC-MS"
  | "GCGC-MS"
  | "GC-FID-MS"
  | "CE-MS"
  | "DI-MS"
  | "FIA-MS"
  | "MALDI-MS"
  | "MSI"
  | "NMR"

const METABO_SUBMISSION_TYPES: readonly MetaboBankSubmissionType[] = [
  "LC-MS",
  "LC-DAD-MS",
  "GC-MS",
  "GCGC-MS",
  "GC-FID-MS",
  "CE-MS",
  "DI-MS",
  "FIA-MS",
  "MALDI-MS",
  "NMR",
]

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (payload: AddFilePayload) => void
}

const MassSpecModal = ({ open, onClose, onSubmit }: Props) => {
  const { t } = useDynamicTranslation()
  const [domain, setDomain] = useState<MassSpecDomain>("metabolomics")
  const [submissionType, setSubmissionType] = useState<MetaboBankSubmissionType>("LC-MS")
  const [attachMaf, setAttachMaf] = useState(false)
  const [baseName, setBaseName] = useState("massspec")

  useEffect(() => {
    if (!open) {
      setDomain("metabolomics")
      setSubmissionType("LC-MS")
      setAttachMaf(false)
      setBaseName("massspec")
    }
  }, [open])

  const handleSubmit = () => {
    const chipTags: ChipTag[] = [
      { axis: "mass-spec-domain", value: domain },
      { axis: "functional-genomics", value: "other" },
    ]

    let groupType: GroupType
    let members: { displayName: string; role: FileRole }[]

    if (domain === "imaging") {
      groupType = "imaging-ms"
      members = [
        { displayName: `${baseName}.imzML`, role: "imzml" },
        { displayName: `${baseName}.ibd`, role: "ibd" },
      ]
    } else {
      groupType = "single"
      members = [{ displayName: `${baseName}.mzML`, role: "single" }]
    }

    if (attachMaf && domain !== "imaging") {
      members.push({ displayName: `${baseName}.maf.tsv`, role: "maf" })
    }

    const finalSubmissionType: string = domain === "imaging" ? "MSI" : submissionType

    onSubmit({
      buttonType: "mass-spec",
      groupType,
      members,
      chipTags,
      groupOverrides: {
        metaboBankSubmissionType: finalSubmissionType,
      },
    })
    onClose()
  }

  return (
    <ModalShell
      open={open}
      title={t("routes.submitAlt3.modals.massSpec.title")}
      onClose={onClose}
      onSubmit={handleSubmit}
      ariaId="massspec-modal-title"
    >
      <RadioGroup
        legend={t("routes.submitAlt3.modals.massSpec.domain.label")}
        name="massspec-domain"
        value={domain}
        options={(["proteomics", "metabolomics", "imaging"] as const).map((v) => ({
          value: v,
          label: t(`routes.submitAlt3.modals.massSpec.domain.options.${v}`),
        }))}
        onChange={setDomain}
      />

      {domain === "metabolomics" && (
        <RadioGroup
          legend={t("routes.submitAlt3.modals.massSpec.submissionType.label")}
          name="massspec-submission-type"
          value={submissionType}
          options={METABO_SUBMISSION_TYPES.map((v) => ({
            value: v,
            label: v,
          }))}
          onChange={setSubmissionType}
        />
      )}

      {domain !== "imaging" && (
        <CheckboxField
          label={t("routes.submitAlt3.modals.massSpec.maf.label")}
          description={t("routes.submitAlt3.modals.massSpec.maf.hint")}
          checked={attachMaf}
          onChange={setAttachMaf}
        />
      )}

      <TextField
        id="massspec-basename"
        label={t("routes.submitAlt3.modals.massSpec.baseName.label")}
        value={baseName}
        onChange={setBaseName}
      />
    </ModalShell>
  )
}

export default MassSpecModal
