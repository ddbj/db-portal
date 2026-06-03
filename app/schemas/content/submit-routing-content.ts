import { z } from "zod"

import {
  DESTINATION_SERVICES,
  FileTypeKind,
  FlowNoteKind,
  MAX_WHEN_DEPTH,
  Q1,
  Q2,
  Service,
  SUBMISSION_ENDPOINTS,
  When,
  whenDepth,
} from "~/schemas/submit"

// q1/q2 カスケード repos は DDBJ 内登録先 (role=destination) のみ。
// emit.service / candidateRepos は登録エンドポイント (destination ∪ {jpost, eva}) を許す。
const DESTINATION_SET: ReadonlySet<Service> = new Set(DESTINATION_SERVICES)
const ENDPOINT_SET: ReadonlySet<Service> = new Set(SUBMISSION_ENDPOINTS)

const RoutingScope = z.enum(["entry", "group"])
type RoutingScope = z.infer<typeof RoutingScope>

const RoutingNote = z
  .object({
    kind: FlowNoteKind,
    messageKey: z.string().min(1),
    whenAny: When.optional(),
  })
  .strict()

const Emit = z
  .object({
    service: Service,
    scope: RoutingScope,
    notes: z.array(RoutingNote).default([]),
  })
  .strict()

const Rule = z
  .object({
    when: When,
    emit: Emit,
  })
  .strict()

const KindRoute = z
  .object({
    id: FileTypeKind,
    candidateRepos: z.array(Service).min(1),
    rules: z.array(Rule).min(1),
  })
  .strict()

const QOption = <T extends z.ZodTypeAny>(id: T) =>
  z.object({ id, repos: z.array(Service) }).strict()

const isAlways = (when: When): boolean => "always" in when && when.always === true

const allWhensOf = (rule: z.infer<typeof Rule>): When[] => [
  rule.when,
  ...rule.emit.notes.flatMap((n) => (n.whenAny === undefined ? [] : [n.whenAny])),
]

export const SubmitRoutingCatalog = z
  .object({
    q1Options: z.array(QOption(Q1)),
    q2Options: z.array(QOption(Q2)),
    kindRoutes: z.array(KindRoute),
  })
  .strict()
  .superRefine((cat, ctx) => {
    const fail = (message: string, path: (string | number)[]) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, message, path })

    // q1/q2 カスケード repos は role=destination のみ
    const checkDestinationRepos = (repos: Service[], path: (string | number)[]) => {
      for (const r of repos) {
        if (!DESTINATION_SET.has(r)) fail(`repos "${r}" is not a destination service`, path)
      }
    }
    // candidateRepos は登録エンドポイント (destination ∪ {jpost, eva})
    const checkEndpointRepos = (repos: Service[], path: (string | number)[]) => {
      for (const r of repos) {
        if (!ENDPOINT_SET.has(r)) fail(`repos "${r}" is not a submission endpoint`, path)
      }
    }
    const q1Ids = cat.q1Options.map((o) => o.id)
    const q2Ids = cat.q2Options.map((o) => o.id)
    if (new Set(q1Ids).size !== Q1.options.length || !Q1.options.every((q) => q1Ids.includes(q))) {
      fail("q1Options must cover every Q1 exactly once", ["q1Options"])
    }
    if (new Set(q2Ids).size !== Q2.options.length || !Q2.options.every((q) => q2Ids.includes(q))) {
      fail("q2Options must cover every Q2 exactly once", ["q2Options"])
    }
    cat.q1Options.forEach((o, i) => checkDestinationRepos(o.repos, ["q1Options", i, "repos"]))
    cat.q2Options.forEach((o, i) => checkDestinationRepos(o.repos, ["q2Options", i, "repos"]))

    // kindRoutes は全 FileTypeKind をちょうど 1 つずつ持つ
    const kindIds = cat.kindRoutes.map((k) => k.id)
    if (
      new Set(kindIds).size !== FileTypeKind.options.length
      || !FileTypeKind.options.every((k) => kindIds.includes(k))
    ) {
      fail("kindRoutes must cover every FileTypeKind exactly once", ["kindRoutes"])
    }

    cat.kindRoutes.forEach((route, ki) => {
      const path = ["kindRoutes", ki] as (string | number)[]
      checkEndpointRepos(route.candidateRepos, [...path, "candidateRepos"])
      // candidateRepos-parity: candidateRepos は rules の全 emit.service を包含
      const emitted = new Set(route.rules.map((r) => r.emit.service))
      for (const s of emitted) {
        // catalog-vocab-closure: emit.service は登録エンドポイント
        if (!ENDPOINT_SET.has(s)) {
          fail(`emit.service "${s}" is not a submission endpoint`, [...path, "rules"])
        }
        if (!route.candidateRepos.includes(s)) {
          fail(`candidateRepos must include emit.service "${s}"`, [...path, "candidateRepos"])
        }
      }
      // every-kind-has-fallback: 末尾 rule は {always}
      const last = route.rules.at(-1)
      if (last !== undefined && !isAlways(last.when)) {
        fail("the last rule must be an {always} fallback", [...path, "rules", route.rules.length - 1])
      }
      // when のネスト深さ上限
      route.rules.forEach((rule, ri) => {
        for (const w of allWhensOf(rule)) {
          if (whenDepth(w) > MAX_WHEN_DEPTH) {
            fail(`when nesting exceeds depth ${MAX_WHEN_DEPTH}`, [...path, "rules", ri])
          }
        }
      })
    })
  })

export type SubmitRoutingCatalog = z.infer<typeof SubmitRoutingCatalog>
export type SubmitKindRoute = z.infer<typeof KindRoute>
