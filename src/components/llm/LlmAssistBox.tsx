import { Sparkles, Wand2 } from "lucide-react"
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import { useTranslation } from "react-i18next"

import {
  Button,
  Callout,
  Chip,
  Heading,
  Skeleton,
  Textarea,
} from "@/components/ui"
import { useLanguage } from "@/i18n/useLanguage"
import type { DbId } from "@/types/db"

import { getExamples } from "./examples"

const MAX_NATURAL_TEXT = 1000

export type LlmAssistBoxMode = "advanced-search" | "db-list"

export interface LlmAssistBoxProps {
  mode: LlmAssistBoxMode
  db: DbId | null
  currentQ: string | null
  onApply: (dsl: string) => void | Promise<void>
  className?: string
}

interface SuggestSuccessBody {
  dsl: string
  totalMs: number
  promptTokens: number
  completionTokens: number
}

interface ProblemBody {
  type?: string
  title?: string
  status?: number
  detail?: string
}

interface SuggestState {
  status: "idle" | "loading" | "success" | "error"
  dsl: string | null
  totalMs: number | null
  errorTitle: string | null
  errorDetail: string | null
  errorSlug: string | null
}

const initialState: SuggestState = {
  status: "idle",
  dsl: null,
  totalMs: null,
  errorTitle: null,
  errorDetail: null,
  errorSlug: null,
}

const PROBLEM_PREFIX = "https://portal.ddbj.nig.ac.jp/problems/llm/"

const slugFromProblem = (type: string | undefined): string | null => {
  if (type === undefined) return null
  if (!type.startsWith(PROBLEM_PREFIX)) return null

  return type.slice(PROBLEM_PREFIX.length)
}

const LlmAssistBox = ({
  mode,
  db,
  currentQ,
  onApply,
  className,
}: LlmAssistBoxProps) => {
  const { t } = useTranslation()
  const tDynamic = t as unknown as (key: string, options?: { defaultValue?: string }) => string
  const { lang } = useLanguage()
  const [text, setText] = useState("")
  const [state, setState] = useState<SuggestState>(initialState)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => () => abortRef.current?.abort(), [])

  const submit = useCallback(async () => {
    const trimmed = text.trim()
    if (trimmed === "") return
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setState({ ...initialState, status: "loading" })
    try {
      const res = await fetch("/api/llm/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: "search-dsl",
          naturalText: trimmed,
          db,
          currentQ,
          lang,
        }),
        signal: controller.signal,
      })
      if (!res.ok) {
        let problem: ProblemBody = {}
        try {
          problem = (await res.json()) as ProblemBody
        } catch {
          problem = {}
        }
        const slug = slugFromProblem(problem.type)
        setState({
          status: "error",
          dsl: null,
          totalMs: null,
          errorTitle: problem.title ?? `HTTP ${res.status}`,
          errorDetail: problem.detail ?? "",
          errorSlug: slug,
        })

        return
      }
      const data = (await res.json()) as SuggestSuccessBody
      setState({
        status: "success",
        dsl: data.dsl,
        totalMs: data.totalMs,
        errorTitle: null,
        errorDetail: null,
        errorSlug: null,
      })
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return
      setState({
        status: "error",
        dsl: null,
        totalMs: null,
        errorTitle: t("components.llm.errors.network_error.title"),
        errorDetail: err instanceof Error ? err.message : String(err),
        errorSlug: "network-error",
      })
    }
  }, [text, db, currentQ, lang, t])

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      void submit()

      return
    }
    if (e.key === "Escape") {
      e.preventDefault()
      abortRef.current?.abort()
      setState(initialState)
    }
  }

  const [applying, setApplying] = useState(false)
  const [applyError, setApplyError] = useState<string | null>(null)

  const handleApply = async () => {
    if (state.status !== "success" || state.dsl === null) return
    setApplyError(null)
    setApplying(true)
    try {
      await onApply(state.dsl)
      setText("")
      setState(initialState)
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : String(err))
    } finally {
      setApplying(false)
    }
  }

  const handleReset = () => {
    abortRef.current?.abort()
    setText("")
    setState(initialState)
  }

  const placeholder = mode === "advanced-search"
    ? t("components.llm.placeholder.advancedSearch")
    : t("components.llm.placeholder.dbList")

  const helperKey = mode === "advanced-search"
    ? "components.llm.helper.advancedSearch"
    : "components.llm.helper.dbList"

  const errorMessageKey = state.errorSlug !== null
    ? `components.llm.errors.${state.errorSlug.replace(/-/g, "_")}.title`
    : null
  const localizedFromSlug = errorMessageKey !== null
    ? tDynamic(errorMessageKey, { defaultValue: "" })
    : ""
  const errorTitleResolved = localizedFromSlug !== ""
    ? localizedFromSlug
    : (state.errorTitle ?? t("components.llm.errors.unknown.title"))

  return (
    <section
      className={[
        "rounded-lg border border-primary-200 bg-primary-50 p-4 shadow-sm",
        className ?? "",
      ].join(" ")}
      aria-label={t("components.llm.label")}
    >
      <div className="mb-2 flex items-center gap-2">
        <Sparkles className="text-primary-700 h-4 w-4" aria-hidden />
        <Heading level={3} className="text-primary-900 text-sm font-semibold">
          {t("components.llm.title")}
        </Heading>
        <span className="bg-primary-100 text-primary-700 rounded px-1.5 py-0.5 text-[10px] font-medium tracking-wide">
          BETA
        </span>
      </div>
      <p className="mb-2 text-xs text-gray-600">{t(helperKey)}</p>

      {(() => {
        const examples = getExamples(mode, db, lang)
        if (examples.length === 0) return null

        return (
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            <span className="text-primary-700 mr-1 text-[10px] font-semibold tracking-wide uppercase">
              {t("components.llm.examples.label")}
            </span>
            {examples.map((ex) => (
              <Chip
                key={ex.id}
                onClick={() => {
                  setText(ex.text)
                  setApplyError(null)
                  setState(initialState)
                }}
              >
                {ex.text}
              </Chip>
            ))}
          </div>
        )
      })()}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={2}
            maxLength={MAX_NATURAL_TEXT}
            disabled={state.status === "loading"}
            aria-label={t("components.llm.inputLabel")}
            className="bg-white"
          />
          <div className="mt-1 flex items-center justify-between text-[10px] text-gray-500">
            <span>{t("components.llm.shortcutHint")}</span>
            <span>
              {text.length}/{MAX_NATURAL_TEXT}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            variant="primary"
            size="md"
            onClick={() => void submit()}
            disabled={text.trim() === "" || state.status === "loading"}
          >
            <Wand2 className="mr-1 h-4 w-4" aria-hidden />
            {state.status === "loading"
              ? t("components.llm.actions.generating")
              : t("components.llm.actions.generate")}
          </Button>
          {(state.status === "success" || state.status === "error" || text !== "") && (
            <Button variant="tertiary" size="md" onClick={handleReset}>
              {t("components.llm.actions.reset")}
            </Button>
          )}
        </div>
      </div>

      {state.status === "loading" && (
        <div className="mt-3 space-y-1.5">
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      )}

      {state.status === "success" && state.dsl !== null && (
        <div className="mt-3">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-primary-800 text-[10px] font-semibold tracking-wide uppercase">
              {t("components.llm.suggestion.label")}
            </span>
            <span className="text-[10px] text-gray-500">
              {state.totalMs !== null
                ? `${(state.totalMs / 1000).toFixed(1)}s`
                : ""}
            </span>
          </div>
          <div className="border-primary-200 rounded-md border bg-white p-2.5 font-mono text-sm break-all text-gray-800 select-text">
            {state.dsl}
          </div>
          <p className="mt-1 text-[10px] text-gray-500">
            {t("components.llm.suggestion.disclaimer")}
          </p>
          {applyError !== null && (
            <Callout type="error" className="mt-2">
              <p className="font-semibold">
                {tDynamic("components.llm.errors.apply_failed.title", {
                  defaultValue: "選択した DSL を適用できませんでした",
                })}
              </p>
              <p className="mt-1 text-xs text-gray-700">{applyError}</p>
            </Callout>
          )}
          <div className="mt-2 flex justify-end">
            <Button
              variant="primary"
              size="sm"
              onClick={() => void handleApply()}
              disabled={applying}
            >
              {applying
                ? tDynamic("components.llm.actions.applying", { defaultValue: "適用中..." })
                : t("components.llm.actions.apply")}
            </Button>
          </div>
        </div>
      )}

      {state.status === "error" && (
        <div className="mt-3">
          <Callout type="error">
            <p className="font-semibold">{errorTitleResolved}</p>
            {state.errorDetail !== null && state.errorDetail !== "" && (
              <p className="mt-1 text-xs text-gray-700">{state.errorDetail}</p>
            )}
          </Callout>
        </div>
      )}
    </section>
  )
}

export default LlmAssistBox
