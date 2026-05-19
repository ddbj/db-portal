import { useMemo, useState } from "react"

import { Heading } from "@/components/ui"
import { useDynamicTranslation } from "@/i18n/useDynamicTranslation"
import { BUTTON_GRID_ORDER } from "@/lib/mock-data/submit-alt3"
import type { AddFilePayload } from "@/lib/submit-alt3"
import { buildDefaultAddFilePayload } from "@/lib/submit-alt3"
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
// ボタン押下時の挙動:
//   modal を出さず、buildDefaultAddFilePayload で生成したデフォルト値で即時に行を追加する。
//   ファイル名は ButtonType ごとの prefix + 連番で自動命名 (例 read-001_R1.fastq.gz)。
//   行追加後の詳細な属性 (assembly-form / variation-form 等) は per-cell 編集 or 行の編集動線で modal を開いて確定する。
//
// 編集モード: 行の「編集」ボタン押下時、該当 file の buttonType に対応する modal を再オープンし、
// modal の「追加」submit 時に旧 Group を atomic に置換する (= 旧 Group の全 file を remove-file
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
    // 編集動線 (handleEditRow) ではなく純粋な「追加」操作: modal を出さず即追加。
    onAddFile(buildDefaultAddFilePayload(submission, type))
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
    let nextPayload = payload
    if (editingGroupId !== null) {
      const group = submission.fileGroups.find((g) => g.id === editingGroupId)
      if (group) {
        // 編集前の displayName を継承 (members 数が一致する場合のみ)。grouping を変えた (single → pair-end 等)
        // 場合は数が変わるので新 payload の default displayName をそのまま使う。
        const oldDisplayNames = group.memberFileIds
          .map((fid) => submission.fileEntries.find((f) => f.id === fid)?.displayName)
          .filter((n): n is string => n !== undefined)
        if (
          oldDisplayNames.length === payload.members.length &&
          oldDisplayNames.length === group.memberFileIds.length
        ) {
          nextPayload = {
            ...payload,
            members: payload.members.map((m, i) => ({
              ...m,
              displayName: oldDisplayNames[i] ?? m.displayName,
            })),
          }
        }
        // 旧 Group の全 file を削除 (空 Group は handleRemoveFile が自動で消す)
        for (const fid of group.memberFileIds) onRemoveFile(fid)
      }
    }
    onAddFile(nextPayload)
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
