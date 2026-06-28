import type { DataForm, FileEntry, FileEntryChip, FileGroup, FileTypeKind, GroupType, Q2 } from "~/schemas/submit"
import { AlertIcon, Callout, CheckIcon, FmtCheck, FmtRadio, FormGroup, Tag, Toggle } from "~/ui"

import { applyRadio, initDraft, optionMatches, toggleCheck } from "./form-apply"
import type { FormGroupDef } from "./form-defs"
import { getRowFormDef, hasRowDetail } from "./form-defs"

type DataDetailPatch = { groupType: GroupType; dataForm: DataForm; chipTags: FileEntryChip[] }

type Draft = { groupType: GroupType; dataForm: DataForm; chipTags: FileEntryChip[] }

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
  q2: Q2 | null
  hasIdentifier: boolean
  entries: readonly FileEntry[]
  groups: readonly FileGroup[]
  labels: DataDetailPanelLabels
  isConfigured: (entryId: string) => boolean
  onCommit: (entryId: string, patch: DataDetailPatch) => void
}

type Section =
  | { kind: "toggle-section"; headingKey: string; groups: FormGroupDef[] }
  | { kind: "single"; group: FormGroupDef }

const buildSections = (groups: readonly FormGroupDef[]): Section[] => {
  const sections: Section[] = []
  for (const g of groups) {
    if (g.sectionHeadingKey !== undefined) {
      sections.push({ kind: "toggle-section", headingKey: g.sectionHeadingKey, groups: [g] })
    } else if (g.kind === "check" && g.options.length === 1) {
      const last = sections[sections.length - 1]
      if (last !== undefined && last.kind === "toggle-section") {
        last.groups.push(g)
        continue
      }
      sections.push({ kind: "single", group: g })
    } else {
      sections.push({ kind: "single", group: g })
    }
  }
  return sections
}

const isGroupDisabled = (g: FormGroupDef, draft: Draft): boolean => {
  const hasBlocking = g.disabledWhenAnyChip !== undefined
    && g.disabledWhenAnyChip.some(({ axis, value }) =>
      draft.chipTags.some((c) => c.axis === axis && c.value === value),
    )
  const missingRequired = g.disabledUnlessAnyChip !== undefined
    && !g.disabledUnlessAnyChip.some(({ axis, value }) =>
      draft.chipTags.some((c) => c.axis === axis && c.value === value),
    )
  return hasBlocking || missingRequired
}

export const DataDetailPanel = ({
  q2,
  hasIdentifier,
  entries,
  groups,
  labels,
  isConfigured,
  onCommit,
}: DataDetailPanelProps) => {
  const groupOf = (entry: FileEntry): FileGroup | undefined =>
    groups.find((g) => g.id === entry.groupId)

  const detailEntries = entries.filter((e) => hasRowDetail(e.fileTypeKind, q2))

  if (detailEntries.length === 0) {
    return <Callout tone="info">{labels.empty}</Callout>
  }

  return (
    <ol className="flex flex-col gap-3 m-0 list-none p-0">
      {detailEntries.map((entry) => {
        const def = getRowFormDef(entry.fileTypeKind, q2, hasIdentifier)
        const group = groupOf(entry)
        const draft = initDraft(entry, group)
        const configured = isConfigured(entry.id)
        const sections = buildSections(def.groups)

        return (
          <li
            key={entry.id}
            data-testid="detail-item"
            data-entry-id={entry.id}
            className="border border-border-soft rounded-card bg-surface px-4 py-3.5 flex flex-col gap-3"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <Tag kind="brand" size="sm">{labels.fileTypeKindLabel(entry.fileTypeKind)}</Tag>
              <span className="ml-auto shrink-0">
                {configured
                  ? (
                    <Tag kind="status" tone="success">
                      <span className="inline-flex items-center gap-1">
                        <CheckIcon size={11} aria-hidden />
                        {labels.configured}
                      </span>
                    </Tag>
                  )
                  : (
                    <Tag kind="status" tone="warning">
                      <span className="inline-flex items-center gap-1">
                        <AlertIcon size={11} aria-hidden />
                        {labels.unset}
                      </span>
                    </Tag>
                  )}
              </span>
            </div>
            {sections.map((section) => {
              if (section.kind === "toggle-section") {
                const head = section.groups[0]
                if (!head) return null
                return (
                  <FormGroup key={head.id} num={head.num} label={labels.groupLabel(section.headingKey)}>
                    {section.groups.map((g) => {
                      const opt = g.options[0]
                      if (!opt) return null
                      const disabled = isGroupDisabled(g, draft)
                      const checked = !disabled && optionMatches(opt, draft)
                      return (
                        <Toggle
                          key={g.id}
                          label={labels.optionLabel(opt.labelKey)}
                          sub={labels.optionSub(opt.subKey)}
                          checked={checked}
                          disabled={disabled}
                          onChange={() => onCommit(entry.id, toggleCheck(draft, opt, checked))}
                        />
                      )
                    })}
                  </FormGroup>
                )
              }

              const g = section.group
              if (g.kind === "check" && g.options.length === 1) {
                const opt = g.options[0]
                if (!opt) return null
                const disabled = isGroupDisabled(g, draft)
                const checked = !disabled && optionMatches(opt, draft)
                return (
                  <FormGroup key={g.id} num={g.num} label={labels.groupLabel(g.labelKey)}>
                    <Toggle
                      label={labels.optionLabel(opt.labelKey)}
                      sub={labels.optionSub(opt.subKey)}
                      checked={checked}
                      disabled={disabled}
                      onChange={() => onCommit(entry.id, toggleCheck(draft, opt, checked))}
                    />
                  </FormGroup>
                )
              }

              return (
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
              )
            })}
          </li>
        )
      })}
    </ol>
  )
}
