import { useEffect, useState } from "react"

import { useDynamicTranslation } from "@/i18n/useDynamicTranslation"
import type { AddFilePayload } from "@/lib/submit-alt3"
import type { ChipTag, FileRole, GroupType } from "@/types/submit-alt3"

import CheckboxField from "./CheckboxField"
import ModalShell from "./ModalShell"
import RadioGroup from "./RadioGroup"
import TextField from "./TextField"

// + マイクロアレイ発現 modal
// SSOT: docs/submit-alt3-modals.md §+ マイクロアレイ発現

type Color = "single-color" | "two-color"

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (payload: AddFilePayload) => void
}

const ExpressionArrayModal = ({ open, onClose, onSubmit }: Props) => {
  const { t } = useDynamicTranslation()
  const [color, setColor] = useState<Color>("single-color")
  const [attachMageTab, setAttachMageTab] = useState(false)
  const [baseName, setBaseName] = useState("array")

  useEffect(() => {
    if (!open) {
      setColor("single-color")
      setAttachMageTab(false)
      setBaseName("array")
    }
  }, [open])

  const handleSubmit = () => {
    const chipTags: ChipTag[] = [{ axis: "functional-genomics", value: "yes" }]

    let groupType: GroupType
    let members: { displayName: string; role: FileRole }[]

    if (color === "two-color") {
      groupType = "two-color"
      members = [
        { displayName: `${baseName}_Cy3.cel`, role: "cy3" },
        { displayName: `${baseName}_Cy5.cel`, role: "cy5" },
      ]
    } else {
      groupType = attachMageTab ? "mage-tab" : "single"
      members = [{ displayName: `${baseName}.cel`, role: attachMageTab ? "raw" : "single" }]
    }

    if (attachMageTab) {
      // MAGE-TAB セット (IDF + SDRF) を Group に追加
      members.push({ displayName: `${baseName}.idf.txt`, role: "idf" })
      members.push({ displayName: `${baseName}.sdrf.txt`, role: "sdrf" })
      if (groupType === "single" || groupType === "two-color") {
        groupType = "mage-tab"
      }
    }

    onSubmit({
      buttonType: "expression-array",
      groupType,
      members,
      chipTags,
    })
    // 連続追加対応: modal は閉じずに保持
  }

  return (
    <ModalShell
      open={open}
      title={t("routes.submitAlt3.modals.expressionArray.title")}
      onClose={onClose}
      onSubmit={handleSubmit}
      ariaId="exparray-modal-title"
    >
      <RadioGroup
        legend={t("routes.submitAlt3.modals.expressionArray.color.label")}
        name="exparray-color"
        value={color}
        options={(["single-color", "two-color"] as const).map((v) => ({
          value: v,
          label: t(`routes.submitAlt3.modals.expressionArray.color.options.${v}`),
        }))}
        onChange={setColor}
      />

      <CheckboxField
        label={t("routes.submitAlt3.modals.expressionArray.mageTab.label")}
        description={t("routes.submitAlt3.modals.expressionArray.mageTab.hint")}
        checked={attachMageTab}
        onChange={setAttachMageTab}
      />

      <TextField
        id="exparray-basename"
        label={t("routes.submitAlt3.modals.expressionArray.baseName.label")}
        value={baseName}
        onChange={setBaseName}
      />
    </ModalShell>
  )
}

export default ExpressionArrayModal
