import { useState } from "react"

import { deriveFlowSteps, enabledKinds, isKindEnabled, isQ2Enabled, SegmentedControl } from "~/features/submit"
import { useT } from "~/lib/i18n"
import type { Access, ChipAxis, FileEntry, FlowStep, FlowStepOrigin, GroupType, Q1, Q2, Submission } from "~/schemas/submit"
import {
  Access as AccessEnum,
  ALLOWED_CHIP_VALUES,
  ChipAxis as ChipAxisEnum,
  FileTypeKind as FileTypeKindEnum,
  GroupType as GroupTypeEnum,
  Q1 as Q1Enum,
  Q2 as Q2Enum,
  TYPICAL_DATA_FORM_FOR_KIND,
  TYPICAL_GROUP_TYPE_FOR_KIND,
} from "~/schemas/submit"
import { Button, Callout, cn, PageTitle, Select, Tag } from "~/ui"

const ORIGIN_LABEL: Record<FlowStepOrigin, string> = {
  tier1: "Tier1 rule",
  tier2: "Tier2 aggregate",
  recipe: "named recipe",
}

const ORIGIN_CLASS: Record<FlowStepOrigin, string> = {
  tier1: "bg-brand-softer text-brand-deep border-brand-light/50",
  tier2: "bg-surface-subtle text-ink-mid border-border-soft",
  recipe: "bg-brand-soft text-brand-deep border-brand-light/50",
}

const emptySubmission = (): Submission => ({
  preconditions: { q1: null, q2: null },
  fileEntries: [],
  fileGroups: [],
  notes: "",
})

const SubmitFlowExplorer = () => {
  const t = useT()
  const [mode, setMode] = useState<"builder" | "matrix">("builder")
  const [submission, setSubmission] = useState<Submission>(emptySubmission)
  const { q1, q2 } = submission.preconditions

  const setQ1 = (value: Q1) => setSubmission((s) => ({ ...s, preconditions: { ...s.preconditions, q1: value } }))
  const setQ2 = (value: Q2) => setSubmission((s) => ({ ...s, preconditions: { ...s.preconditions, q2: value } }))

  const addEntry = (kind: FileEntry["fileTypeKind"]) => {
    const id = crypto.randomUUID()
    const groupId = crypto.randomUUID()
    setSubmission((s) => ({
      ...s,
      fileEntries: [
        ...s.fileEntries,
        {
          id,
          fileTypeKind: kind,
          filename: `${kind}.dat`,
          access: q1 === "restricted" ? "restricted" : "open",
          dataForm: TYPICAL_DATA_FORM_FOR_KIND[kind],
          groupId,
          chipTags: [],
        },
      ],
      fileGroups: [
        ...s.fileGroups,
        { id: groupId, groupType: TYPICAL_GROUP_TYPE_FOR_KIND[kind], memberFileIds: [id], linkedGroupIds: [] },
      ],
    }))
  }

  const patchEntry = (id: string, patch: Partial<FileEntry>) =>
    setSubmission((s) => ({
      ...s,
      fileEntries: s.fileEntries.map((e) => (e.id === id ? { ...e, ...patch, id: e.id, fileTypeKind: e.fileTypeKind } : e)),
    }))

  const setGroupType = (entry: FileEntry, groupType: GroupType) =>
    setSubmission((s) => ({
      ...s,
      fileGroups: s.fileGroups.map((g) => (g.id === entry.groupId ? { ...g, groupType } : g)),
    }))

  const setChip = (entry: FileEntry, axis: ChipAxis, value: string) =>
    patchEntry(entry.id, {
      chipTags: [
        ...entry.chipTags.filter((c) => c.axis !== axis),
        ...(value === "" ? [] : [{ axis, value }]),
      ],
    })

  const removeEntry = (id: string) =>
    setSubmission((s) => ({
      ...s,
      fileEntries: s.fileEntries.filter((e) => e.id !== id),
      fileGroups: s.fileGroups
        .map((g) => ({ ...g, memberFileIds: g.memberFileIds.filter((m) => m !== id) }))
        .filter((g) => g.memberFileIds.length > 0),
    }))

  const groupTypeOf = (entry: FileEntry): GroupType =>
    submission.fileGroups.find((g) => g.id === entry.groupId)?.groupType ?? "single"

  const steps = deriveFlowSteps(submission)

  return (
    <div className="flex flex-col gap-section-md">
      <PageTitle
        eyebrow="Design preview"
        title="Submit flow explorer"
        subtitle="任意の入力から導出される FlowStep を全件プレビューし、由来 (Tier1 / Tier2 / recipe) を確認する。マトリクスモードで Q1 x Q2 x 種別の到達可能性を一覧する。"
      />
      <Callout tone="info">この画面は production build では生成されない開発専用ツール。</Callout>

      <div className="flex gap-2">
        <Button kind={mode === "builder" ? "primary" : "secondary"} onClick={() => setMode("builder")}>
          Builder
        </Button>
        <Button kind={mode === "matrix" ? "primary" : "secondary"} onClick={() => setMode("matrix")}>
          Matrix
        </Button>
      </div>

      {mode === "builder" && (
        <div className="grid grid-cols-2 gap-6">
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-fs-body-sm font-semibold text-ink mt-0 mb-2">Q1</p>
              <SegmentedControl
                ariaLabel="Q1"
                value={q1}
                segments={Q1Enum.options.map((v) => ({ value: v, label: v }))}
                onChange={(v) => setQ1(v as Q1)}
              />
            </div>
            <div>
              <p className="text-fs-body-sm font-semibold text-ink mt-0 mb-2">Q2</p>
              <SegmentedControl
                ariaLabel="Q2"
                value={q2}
                segments={Q2Enum.options.map((v) => ({
                  value: v,
                  label: v,
                  disabled: !isQ2Enabled(q1, v),
                  disabledReason: "disabled by Q1",
                }))}
                onChange={(v) => setQ2(v as Q2)}
              />
            </div>
            <div>
              <p className="text-fs-body-sm font-semibold text-ink mt-0 mb-2">Add file type</p>
              <div className="grid grid-cols-2 gap-2">
                {FileTypeKindEnum.options.map((kind) => (
                  <Button
                    key={kind}
                    kind="secondary"
                    size="sm"
                    disabled={!isKindEnabled(q1, q2, kind)}
                    onClick={() => addEntry(kind)}
                  >
                    {kind}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {submission.fileEntries.map((entry) => (
                <div key={entry.id} className="border border-border-soft rounded-card p-3 bg-surface flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <Tag kind="tag" size="sm">{entry.fileTypeKind}</Tag>
                    <Button kind="ghost" size="sm" onClick={() => removeEntry(entry.id)}>remove</Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      ariaLabel="access"
                      value={entry.access}
                      options={AccessEnum.options.map((a) => ({ value: a, label: a }))}
                      onChange={(v) => patchEntry(entry.id, { access: v as Access })}
                    />
                    <Select
                      ariaLabel="groupType"
                      value={groupTypeOf(entry)}
                      options={GroupTypeEnum.options.map((g) => ({ value: g, label: g }))}
                      onChange={(v) => setGroupType(entry, v as GroupType)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {ChipAxisEnum.options
                      .filter((axis) => ALLOWED_CHIP_VALUES[axis].length > 0)
                      .map((axis) => (
                        <Select
                          key={axis}
                          ariaLabel={axis}
                          value={entry.chipTags.find((c) => c.axis === axis)?.value ?? ""}
                          options={[
                            { value: "", label: `${axis}: (none)` },
                            ...ALLOWED_CHIP_VALUES[axis].map((val) => ({ value: val, label: `${axis}: ${val}` })),
                          ]}
                          onChange={(v) => setChip(entry, axis, v)}
                        />
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-fs-body-sm font-semibold text-ink m-0">FlowStep[] ({steps.length})</p>
            {steps.length === 0 && <p className="text-ink-mid text-fs-body-sm m-0">no steps</p>}
            {steps.map((step: FlowStep) => (
              <div key={step.id} className="border border-border-soft rounded-card p-3 bg-surface flex flex-col gap-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-semibold text-ink">{step.service}</span>
                  <span className={cn("text-fs-micro px-2 py-0.5 rounded-pill border", ORIGIN_CLASS[step.origin])}>
                    {ORIGIN_LABEL[step.origin]}
                  </span>
                </div>
                <p className="text-fs-micro text-ink-soft m-0 font-mono break-all">
                  entries: [{step.scope.entryIds.join(", ")}] groups: [{step.scope.groupIds.join(", ")}]
                </p>
                {step.notes.map((note, i) => (
                  <p
                    key={i}
                    className={cn("text-fs-micro m-0", note.kind === "info" ? "text-ink-mid" : "text-red")}
                  >
                    [{note.kind}] {t(note.messageKey)}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {mode === "matrix" && (
        <div className="overflow-x-auto">
          <table className="border-collapse text-fs-micro">
            <thead>
              <tr>
                <th className="border border-border-soft px-2 py-1 text-left">Q1 \\ Q2</th>
                {Q2Enum.options.map((qq2) => (
                  <th key={qq2} className="border border-border-soft px-2 py-1 text-left">{qq2}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Q1Enum.options.map((qq1) => (
                <tr key={qq1}>
                  <th className="border border-border-soft px-2 py-1 text-left">{qq1}</th>
                  {Q2Enum.options.map((qq2) => {
                    const enabled = isQ2Enabled(qq1, qq2)
                    const kinds = enabled ? enabledKinds(qq1, qq2) : []

                    return (
                      <td
                        key={qq2}
                        className={cn(
                          "border border-border-soft px-2 py-1 align-top",
                          enabled ? "bg-surface" : "bg-surface-subtle text-ink-soft",
                        )}
                      >
                        {!enabled
                          ? <span>dead-end (disabled)</span>
                          : (
                            <ul className="list-none m-0 p-0 flex flex-col gap-0.5">
                              {kinds.map((k) => <li key={k} className="font-mono">{k}</li>)}
                            </ul>
                          )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default SubmitFlowExplorer
