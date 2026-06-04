import { useState } from "react"

import { deriveFlowSteps, isKindEnabled, isQ2Enabled, RadioCardGroup, selectValidations } from "~/features/submit"
import { ExternalLinkButton } from "~/features/submit/components/external-link-button"
import { StepBadge } from "~/features/submit/components/step-badge"
import { getSubmitCard, getSubmitMeta } from "~/features/submit/external-links"
import { useLang, useT } from "~/lib/i18n"
import type { FileEntry, FlowStep, Q1, Q2, Service, Submission } from "~/schemas/submit"
import {
  FileTypeKind as FileTypeKindEnum,
  Q1 as Q1Enum,
  Q2 as Q2Enum,
  serviceRoleTagKey,
  stepPrerequisites,
  TYPICAL_DATA_FORM_FOR_KIND,
  TYPICAL_GROUP_TYPE_FOR_KIND,
} from "~/schemas/submit"
import { Button, Callout, PageTitle, Tag } from "~/ui"

type EntrySpec = {
  kind: FileEntry["fileTypeKind"]
  access?: FileEntry["access"]
  chips?: FileEntry["chipTags"]
}

const buildSubmission = (q1: Q1, q2: Q2, specs: readonly EntrySpec[]): Submission => {
  const fileEntries: FileEntry[] = []
  const fileGroups: Submission["fileGroups"] = []
  for (const spec of specs) {
    const id = crypto.randomUUID()
    const groupId = crypto.randomUUID()
    fileEntries.push({
      id,
      fileTypeKind: spec.kind,
      access: spec.access ?? (q1 === "restricted" ? "restricted" : "open"),
      dataForm: TYPICAL_DATA_FORM_FOR_KIND[spec.kind],
      groupId,
      chipTags: spec.chips ?? [],
    })
    fileGroups.push({
      id: groupId,
      groupType: TYPICAL_GROUP_TYPE_FOR_KIND[spec.kind],
      memberFileIds: [id],
      linkedGroupIds: [],
    })
  }

  return { preconditions: { q1, q2 }, fileEntries, fileGroups, notes: "" }
}

const emptySubmission = (): Submission => ({
  preconditions: { q1: null, q2: null },
  fileEntries: [],
  fileGroups: [],
  notes: "",
})

// 登録先の違いが一目で出る代表ケース。単一登録先 / 前提ゲート / 第三者の確認 / 複数登録先を網羅する。
const PRESETS: readonly { label: string; build: () => Submission }[] = [
  { label: "公開ヒト reads → DRA", build: () => buildSubmission("public", "human", [{ kind: "sequence-read" }]) },
  { label: "制限公開ヒト reads → JGA", build: () => buildSubmission("restricted", "human", [{ kind: "sequence-read" }]) },
  { label: "第三者 配列 → DDBJ (MSS)", build: () => buildSubmission("third-party", "eukaryote", [{ kind: "sequence-nucleotide" }]) },
  {
    label: "公開ヒト multi-omics",
    build: () => buildSubmission("public", "human", [
      { kind: "sequence-read" },
      { kind: "expression-matrix" },
      { kind: "mass-spectrometry" },
    ]),
  },
  {
    label: "プロテオミクス → jPOST",
    build: () => buildSubmission("public", "human", [
      { kind: "mass-spectrometry", chips: [{ axis: "mass-spec-domain", value: "proteomics" }] },
    ]),
  },
]

const SubmitResultSummary = () => {
  const t = useT()
  const lang = useLang()
  const [submission, setSubmission] = useState<Submission>(emptySubmission)
  const { q1, q2 } = submission.preconditions

  const setQ1 = (value: Q1) => setSubmission((s) => ({ ...s, preconditions: { ...s.preconditions, q1: value } }))
  const setQ2 = (value: Q2) => setSubmission((s) => ({ ...s, preconditions: { ...s.preconditions, q2: value } }))

  const addEntry = (kind: FileEntry["fileTypeKind"]) =>
    setSubmission((s) => {
      const id = crypto.randomUUID()
      const groupId = crypto.randomUUID()

      return {
        ...s,
        fileEntries: [
          ...s.fileEntries,
          {
            id,
            fileTypeKind: kind,
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
      }
    })

  const removeEntry = (id: string) =>
    setSubmission((s) => ({
      ...s,
      fileEntries: s.fileEntries.filter((e) => e.id !== id),
      fileGroups: s.fileGroups
        .map((g) => ({ ...g, memberFileIds: g.memberFileIds.filter((m) => m !== id) }))
        .filter((g) => g.memberFileIds.length > 0),
    }))

  const steps = deriveFlowSteps(submission)
  const validations = selectValidations({ submission })

  const serviceTitle = (service: Service): string => t(`submit.flow.${service}.title`)
  const serviceDescription = (service: Service): string => t(`submit.flow.${service}.description`)
  const roleLabel = (service: Service): string => t(`submit.flow.roleTag.${serviceRoleTagKey(service)}`)
  const noteKindLabel = (kind: "warning" | "error"): string =>
    kind === "error" ? t("submit.flow.noteError") : t("submit.flow.noteWarning")
  const hasWarnOrError = (step: FlowStep): boolean =>
    step.notes.some((n) => n.kind === "warning" || n.kind === "error")

  const present = new Set(steps.map((s) => s.service))
  const labelClass = "text-fs-label font-bold text-ink-mid m-0"

  return (
    <div className="flex flex-col gap-section-md">
      <PageTitle
        eyebrow="Design preview"
        title="Submit result summary"
        subtitle="右の step 一覧を「登録先サマリー」として rich にした案の試作。判定は出さず、導出した登録先ごとに、なぜそこか (routing 理由) / 説明 / source / 外部リンク / 先に要るものを見せる。"
      />
      <Callout tone="info">この画面は production build では生成されない開発専用ツール。本番 /submit には未反映。</Callout>

      <div className="flex flex-wrap gap-2">
        <span className="text-fs-body-sm text-ink-mid self-center mr-1">プリセット:</span>
        {PRESETS.map((preset) => (
          <Button key={preset.label} kind="secondary" size="sm" onClick={() => setSubmission(preset.build())}>
            {preset.label}
          </Button>
        ))}
        <Button kind="ghost" size="sm" onClick={() => setSubmission(emptySubmission())}>クリア</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="flex flex-col gap-4">
          <p className="text-fs-h2 font-bold text-ink m-0">入力 (builder)</p>
          <div>
            <p className="text-fs-body-sm font-semibold text-ink mt-0 mb-2">Q1 公開方法</p>
            <RadioCardGroup
              ariaLabel="Q1"
              name="summary-q1"
              value={q1}
              options={Q1Enum.options.map((v) => ({ value: v, label: t(`submit.preconditions.q1.${v}.label`) }))}
              onChange={(v) => setQ1(v as Q1)}
            />
          </div>
          <div>
            <p className="text-fs-body-sm font-semibold text-ink mt-0 mb-2">Q2 生物ドメイン</p>
            <RadioCardGroup
              ariaLabel="Q2"
              name="summary-q2"
              value={q2}
              options={Q2Enum.options.map((v) => ({
                value: v,
                label: t(`submit.preconditions.q2.${v}.label`),
                disabled: !isQ2Enabled(q1, v),
                disabledReason: t("submit.preconditions.q2DisabledReason"),
              }))}
              onChange={(v) => setQ2(v as Q2)}
            />
          </div>
          <div>
            <p className="text-fs-body-sm font-semibold text-ink mt-0 mb-2">データ種別を追加</p>
            <div className="grid grid-cols-2 gap-2">
              {FileTypeKindEnum.options.map((kind) => (
                <Button
                  key={kind}
                  kind="secondary"
                  size="sm"
                  disabled={!isKindEnabled(q1, q2, kind)}
                  onClick={() => addEntry(kind)}
                >
                  {t(`submit.fileType.${kind}.label`)}
                </Button>
              ))}
            </div>
          </div>
          {submission.fileEntries.length > 0 && (
            <ul className="flex flex-col gap-2 m-0 list-none p-0">
              {submission.fileEntries.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between gap-2 border border-border-soft rounded-card bg-surface px-3 py-2"
                >
                  <span className="inline-flex items-center gap-2 min-w-0">
                    <Tag size="sm">{t(`submit.fileType.${entry.fileTypeKind}.label`)}</Tag>
                    <span className="font-mono text-fs-micro text-ink-soft">{entry.access}</span>
                  </span>
                  <Button kind="ghost" size="sm" onClick={() => removeEntry(entry.id)}>削除</Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <section
          data-testid="result-summary"
          className="flex flex-col gap-5 border border-border-soft rounded-card bg-surface shadow-card p-5"
        >
          <p className="text-fs-h2 font-bold text-ink m-0">登録先サマリー</p>

          {steps.length === 0
            ? <p className="text-fs-body-sm text-ink-soft m-0 leading-relaxed">{t("submit.flow.empty")}</p>
            : (
              <>
                <ol className="flex flex-col m-0 list-none p-0">
                  {steps.map((step, i) => {
                    const meta = getSubmitMeta(step.service, lang)
                    const issuedNote = getSubmitCard(step.service).issuedNote?.[lang]
                    const prereqs = stepPrerequisites(step.service, present).map(serviceTitle)
                    const count = step.scope.entryIds.length

                    return (
                      <li
                        key={step.id}
                        className="flex gap-2.5 items-start py-4 border-b border-border-soft first:pt-0 last:border-b-0 last:pb-0"
                      >
                        <StepBadge index={i + 1} pending={hasWarnOrError(step)} />
                        <div className="min-w-0 flex-1 flex flex-col gap-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-fs-body-sm font-semibold text-ink">{serviceTitle(step.service)}</span>
                            <Tag size="sm">{roleLabel(step.service)}</Tag>
                            {meta?.source != null && (
                              <Tag kind="source" name={meta.source} size="sm">{meta.source}</Tag>
                            )}
                            {count > 0 && (
                              <span className="font-mono text-fs-micro text-ink-soft ml-auto">{count} 件</span>
                            )}
                          </div>

                          <p className="text-fs-body-sm text-ink-mid m-0 leading-relaxed">
                            {serviceDescription(step.service)}
                          </p>

                          {step.notes.length > 0 && (
                            <ul className="flex flex-col gap-1 m-0 list-none p-0">
                              {step.notes.map((note, ni) =>
                                note.kind === "info"
                                  ? (
                                    <li
                                      key={ni}
                                      className="flex gap-1.5 text-fs-body-sm text-ink-mid leading-relaxed"
                                    >
                                      <span className="text-ink-soft shrink-0">→</span>
                                      <span className="min-w-0">{t(note.messageKey)}</span>
                                    </li>
                                  )
                                  : (
                                    <li key={ni} className="flex gap-1.5 items-start">
                                      <Tag
                                        kind="status"
                                        tone={note.kind === "error" ? "critical" : "warning"}
                                        size="sm"
                                      >
                                        {noteKindLabel(note.kind)}
                                      </Tag>
                                      <span className="text-fs-body-sm text-warn-fg leading-relaxed min-w-0">
                                        {t(note.messageKey)}
                                      </span>
                                    </li>
                                  ),
                              )}
                            </ul>
                          )}

                          {prereqs.length > 0 && (
                            <span className="text-fs-micro text-ink-soft leading-snug">
                              先に: {prereqs.join(" · ")}
                            </span>
                          )}

                          {meta?.externalUrl !== undefined && (
                            <div className="flex items-center gap-2 flex-wrap pt-0.5">
                              <ExternalLinkButton url={meta.externalUrl} label={t("submit.flow.ctaLabel")} />
                              {issuedNote !== undefined && issuedNote.length > 0 && (
                                <span className="text-fs-micro text-ink-soft leading-snug min-w-0">{issuedNote}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ol>

                {validations.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <p className={labelClass}>確認事項</p>
                    <ul className="flex flex-col gap-2 m-0 list-none p-0">
                      {validations.map((v, i) => (
                        <li key={i} className="flex gap-2 items-start">
                          <Tag kind="status" tone="warning" size="sm">確認</Tag>
                          <span className="text-fs-body-sm text-ink-mid leading-relaxed">
                            {t(`submit.validations.${v.kind}`)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
        </section>
      </div>
    </div>
  )
}

export default SubmitResultSummary
