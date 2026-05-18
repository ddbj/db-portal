import { useMemo, useState } from "react"

import { Heading } from "@/components/ui"
import { useDynamicTranslation } from "@/i18n/useDynamicTranslation"
import { BUTTON_GRID_ORDER } from "@/lib/mock-data/submit-alt3"
import type { AddFilePayload } from "@/lib/submit-alt3"
import type {
  AccessRestriction,
  ButtonType,
  ChipAxis,
  DataForm,
  Organism,
  Submission,
} from "@/types/submit-alt3"

import AddFileButtonGrid from "./AddFileButtonGrid"
import FileTable from "./FileTable"
import AnnotationModal from "./modals/AnnotationModal"
import AssembledModal, { buildExistingBsOptions } from "./modals/AssembledModal"
import ExpressionArrayModal from "./modals/ExpressionArrayModal"
import ExpressionMatrixModal from "./modals/ExpressionMatrixModal"
import MassSpecModal from "./modals/MassSpecModal"
import PhenotypeModal from "./modals/PhenotypeModal"
import SequenceReadModal from "./modals/SequenceReadModal"
import SpatialTxModal from "./modals/SpatialTxModal"
import VariationModal from "./modals/VariationModal"

interface Props {
  submission: Submission
  highlightedFileIds?: ReadonlySet<string> | undefined
  onAddFile: (payload: AddFilePayload) => void
  onEditCell: (
    fileId: string,
    column: "organism" | "accessRestriction" | "dataForm",
    value: Organism | AccessRestriction | DataForm | undefined,
  ) => void
  onRemoveFile: (fileId: string) => void
  onSetChip: (
    fileId: string,
    axis: ChipAxis,
    value: string | undefined,
    manualOverride?: boolean,
  ) => void
  onResetChipManual: (fileId: string, axis: ChipAxis) => void
}

// Section A: 9 ボタン + テーブル
// SSOT: docs/submit-alt3.md §2 / §3
//
// 編集モード: 行の「編集」ボタン押下時、該当 file の buttonType に対応する modal を再オープンし、
// modal の「追加」 submit 時に旧 Group を atomic に置換する (= 旧 Group の全 file を remove-file
// → 新規 add-file)。modal の初期値は default のまま (前回値復元は本番フェーズ送り)。
const FileTableSection = ({
  submission,
  highlightedFileIds,
  onAddFile,
  onEditCell,
  onRemoveFile,
  onSetChip,
  onResetChipManual,
}: Props) => {
  const { t } = useDynamicTranslation()
  const [openModal, setOpenModal] = useState<ButtonType | null>(null)
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)

  const handleSelectButton = (type: ButtonType) => {
    setEditingGroupId(null)
    setOpenModal(type)
  }
  const closeModal = () => {
    setOpenModal(null)
    setEditingGroupId(null)
  }

  const handleEditRow = (fileId: string) => {
    const file = submission.fileEntries.find((f) => f.id === fileId)
    if (!file) return
    const group = submission.fileGroups.find(
      (g) => g.id === file.groupId,
    )
    if (!group) return
    setEditingGroupId(group.id)
    setOpenModal(file.buttonType)
  }

  const handleSubmitWithReplace = (payload: AddFilePayload) => {
    if (editingGroupId !== null) {
      // 旧 Group の全 file を削除 (空 Group は handleRemoveFile が自動で消す)
      const group = submission.fileGroups.find((g) => g.id === editingGroupId)
      if (group) {
        for (const fid of group.memberFileIds) onRemoveFile(fid)
      }
    }
    onAddFile(payload)
  }

  const existingBsOptions = useMemo(
    () =>
      buildExistingBsOptions(
        submission.biosamples,
        submission.fileGroups,
        submission.fileEntries,
      ),
    [submission.biosamples, submission.fileGroups, submission.fileEntries],
  )

  return (
    <section className="space-y-4" aria-labelledby="submit-alt3-section-a">
      <Heading level={2} id="submit-alt3-section-a">
        {t("routes.submitAlt3.sections.fileTable")}
      </Heading>
      <p className="text-sm text-gray-600">
        {t("routes.submitAlt3.sections.fileTableHint")}
      </p>

      <AddFileButtonGrid
        enabledButtons={BUTTON_GRID_ORDER}
        onSelectButton={handleSelectButton}
      />

      <FileTable
        submission={submission}
        highlightedFileIds={highlightedFileIds}
        onEditCell={onEditCell}
        onRemoveFile={onRemoveFile}
        onEditRow={handleEditRow}
        onSetChip={onSetChip}
        onResetChipManual={onResetChipManual}
      />

      <SequenceReadModal
        open={openModal === "sequence-read"}
        onClose={closeModal}
        onSubmit={handleSubmitWithReplace}
      />
      <AssembledModal
        open={openModal === "assembled"}
        onClose={closeModal}
        onSubmit={handleSubmitWithReplace}
        existingBsOptions={existingBsOptions}
      />
      <AnnotationModal
        open={openModal === "annotation"}
        onClose={closeModal}
        onSubmit={handleSubmitWithReplace}
      />
      <VariationModal
        open={openModal === "variation"}
        onClose={closeModal}
        onSubmit={handleSubmitWithReplace}
      />
      <PhenotypeModal
        open={openModal === "phenotype"}
        onClose={closeModal}
        onSubmit={handleSubmitWithReplace}
      />
      <ExpressionArrayModal
        open={openModal === "expression-array"}
        onClose={closeModal}
        onSubmit={handleSubmitWithReplace}
      />
      <ExpressionMatrixModal
        open={openModal === "expression-matrix"}
        onClose={closeModal}
        onSubmit={handleSubmitWithReplace}
      />
      <MassSpecModal
        open={openModal === "mass-spec"}
        onClose={closeModal}
        onSubmit={handleSubmitWithReplace}
      />
      <SpatialTxModal
        open={openModal === "spatial-tx"}
        onClose={closeModal}
        onSubmit={handleSubmitWithReplace}
      />
    </section>
  )
}

export default FileTableSection
