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

  const handleSelectButton = (type: ButtonType) => setOpenModal(type)
  const closeModal = () => setOpenModal(null)

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
        onSetChip={onSetChip}
        onResetChipManual={onResetChipManual}
      />

      <SequenceReadModal
        open={openModal === "sequence-read"}
        onClose={closeModal}
        onSubmit={onAddFile}
      />
      <AssembledModal
        open={openModal === "assembled"}
        onClose={closeModal}
        onSubmit={onAddFile}
        existingBsOptions={existingBsOptions}
      />
      <AnnotationModal
        open={openModal === "annotation"}
        onClose={closeModal}
        onSubmit={onAddFile}
      />
      <VariationModal
        open={openModal === "variation"}
        onClose={closeModal}
        onSubmit={onAddFile}
      />
      <PhenotypeModal
        open={openModal === "phenotype"}
        onClose={closeModal}
        onSubmit={onAddFile}
      />
      <ExpressionArrayModal
        open={openModal === "expression-array"}
        onClose={closeModal}
        onSubmit={onAddFile}
      />
      <ExpressionMatrixModal
        open={openModal === "expression-matrix"}
        onClose={closeModal}
        onSubmit={onAddFile}
      />
      <MassSpecModal
        open={openModal === "mass-spec"}
        onClose={closeModal}
        onSubmit={onAddFile}
      />
      <SpatialTxModal
        open={openModal === "spatial-tx"}
        onClose={closeModal}
        onSubmit={onAddFile}
      />
    </section>
  )
}

export default FileTableSection
