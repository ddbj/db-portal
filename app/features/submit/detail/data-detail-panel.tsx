import type { DataForm, FileEntry, FileEntryChip, FileGroup, FileTypeKind, GroupType } from "~/schemas/submit"
import { Callout, FmtCheck, FmtRadio, FormGroup, Tag } from "~/ui"

import { applyRadio, initDraft, optionMatches, toggleCheck } from "../modals/form-apply"
import { hasRowDetail, ROW_FORM_DEFS } from "../modals/form-defs"

type DataDetailPatch = { groupType: GroupType; dataForm: DataForm; chipTags: FileEntryChip[] }

type DataDetailPanelLabels = {
  empty: string
  configured: string
  unset: string
  fileTypeKindLabel: (kind: FileTypeKind) => string
  groupLabel: (labelKey: string) => string
  optionLabel: (labelKey: string) => string
  optionSub: (subKey: string | undefined) => string | undefined
}

type DataDetailPanelProps = {
  entries: readonly FileEntry[]
  groups: readonly FileGroup[]
  labels: DataDetailPanelLabels
  isConfigured: (entryId: string) => boolean
  onCommit: (entryId: string, patch: DataDetailPatch) => void
}

export const DataDetailPanel = ({
  entries,
  groups,
  labels,
  isConfigured,
  onCommit,
}: DataDetailPanelProps) => {
  const detailEntries = entries.filter((e) => hasRowDetail(e.fileTypeKind))

  if (detailEntries.length === 0) {
    return <Callout tone="info">{labels.empty}</Callout>
  }

  return (
    <ol className="flex flex-col gap-3 m-0 list-none p-0">
      {detailEntries.map((entry) => {
        const def = ROW_FORM_DEFS[entry.fileTypeKind]
        const group = groups.find((g) => g.id === entry.groupId)
        const draft = initDraft(entry, group)
        const configured = isConfigured(entry.id)

        return (
          <li
            key={entry.id}
            data-testid="detail-item"
            data-entry-id={entry.id}
            className="border border-border-soft rounded-card bg-surface px-4 py-3.5 flex flex-col gap-3"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <Tag kind="tag" size="sm">{labels.fileTypeKindLabel(entry.fileTypeKind)}</Tag>
              <span className="font-mono text-fs-micro text-ink-mid truncate">{entry.filename}</span>
              <span className="ml-auto shrink-0">
                {configured
                  ? <Tag kind="status" tone="success">{labels.configured}</Tag>
                  : <Tag kind="status" tone="warning">{labels.unset}</Tag>}
              </span>
            </div>
            {def.groups.map((g) => (
              <FormGroup key={g.id} num={g.num} label={labels.groupLabel(g.labelKey)}>
                {g.options.map((opt) => {
                  const checked = optionMatches(opt, draft)
                  const label = labels.optionLabel(opt.labelKey)
                  const sub = labels.optionSub(opt.subKey)
                  if (g.kind === "radio") {
                    return (
                      <FmtRadio
                        key={opt.value}
                        name={`detail-${entry.id}-${g.id}`}
                        label={label}
                        sub={sub}
                        value={opt.value}
                        checked={checked}
                        onChange={() => onCommit(entry.id, applyRadio(draft, opt, g.options))}
                      />
                    )
                  }
                  return (
                    <FmtCheck
                      key={opt.value}
                      name={`detail-${entry.id}-${g.id}`}
                      label={label}
                      sub={sub}
                      value={opt.value}
                      checked={checked}
                      onChange={() => onCommit(entry.id, toggleCheck(draft, opt, checked))}
                    />
                  )
                })}
              </FormGroup>
            ))}
          </li>
        )
      })}
    </ol>
  )
}
