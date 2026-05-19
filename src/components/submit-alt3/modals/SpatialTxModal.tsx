import { useEffect, useState } from "react"

import { useDynamicTranslation } from "@/i18n/useDynamicTranslation"
import type { AddFilePayload } from "@/lib/submit-alt3"
import type {
  ChipTag,
  FileRole,
  GroupType,
  ReferenceMeta,
  SpatialPlatform,
} from "@/types/submit-alt3"

import CheckboxField from "./CheckboxField"
import ModalShell from "./ModalShell"
import RadioGroup from "./RadioGroup"

// + 空間トランスクリプトーム modal
// SSOT: docs/submit-alt3-modals.md §+ 空間トランスクリプトーム

const PLATFORMS: readonly SpatialPlatform[] = [
  "visium",
  "xenium",
  "merfish",
  "stereo-seq",
  "slide-seq",
  "geomx",
  "other",
]

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (payload: AddFilePayload) => void
}

const SpatialTxModal = ({ open, onClose, onSubmit }: Props) => {
  const { t } = useDynamicTranslation()
  const [platform, setPlatform] = useState<SpatialPlatform>("visium")
  const [geomxReadout, setGeomxReadout] = useState<"ngs" | "ncounter">("ngs")
  const [attachMageTab, setAttachMageTab] = useState(false)

  useEffect(() => {
    if (!open) {
      setPlatform("visium")
      setGeomxReadout("ngs")
      setAttachMageTab(false)
    }
  }, [open])

  const handleSubmit = () => {
    // ファイル名は FileTableSection 側で確定
    const baseName = "spatial"
    const chipTags: ChipTag[] = [
      { axis: "functional-genomics", value: "yes" },
      { axis: "spatial-platform", value: platform },
    ]

    const groupType: GroupType = attachMageTab ? "mage-tab" : "single"
    const members: { displayName: string; role: FileRole }[] = [
      {
        displayName: `${baseName}_matrix.tsv`,
        role: attachMageTab ? "processed" : "single",
      },
    ]
    if (attachMageTab) {
      members.push({ displayName: `${baseName}.idf.txt`, role: "idf" })
      members.push({ displayName: `${baseName}.sdrf.txt`, role: "sdrf" })
    }

    const refMeta: ReferenceMeta | undefined = platform === "geomx"
      ? { geomxReadout }
      : undefined

    onSubmit({
      buttonType: "spatial-tx",
      groupType,
      members,
      chipTags,
      ...(refMeta !== undefined
        ? { groupOverrides: { referenceMeta: refMeta } }
        : {}),
    })
    onClose()
  }

  return (
    <ModalShell
      open={open}
      title={t("routes.submitAlt3.modals.spatialTx.title")}
      onClose={onClose}
      onSubmit={handleSubmit}
      ariaId="spatialtx-modal-title"
    >
      <RadioGroup
        legend={t("routes.submitAlt3.modals.spatialTx.platform.label")}
        name="spatialtx-platform"
        value={platform}
        options={PLATFORMS.map((v) => ({
          value: v,
          label: t(`routes.submitAlt3.modals.spatialTx.platform.options.${v}`),
        }))}
        onChange={setPlatform}
      />

      {platform === "geomx" && (
        <RadioGroup
          legend={t("routes.submitAlt3.modals.spatialTx.geomxReadout.label")}
          name="spatialtx-readout"
          value={geomxReadout}
          options={(["ngs", "ncounter"] as const).map((v) => ({
            value: v,
            label: t(`routes.submitAlt3.modals.spatialTx.geomxReadout.options.${v}`),
          }))}
          onChange={setGeomxReadout}
        />
      )}

      <CheckboxField
        label={t("routes.submitAlt3.modals.spatialTx.mageTab.label")}
        description={t("routes.submitAlt3.modals.spatialTx.mageTab.hint")}
        checked={attachMageTab}
        onChange={setAttachMageTab}
      />
    </ModalShell>
  )
}

export default SpatialTxModal
