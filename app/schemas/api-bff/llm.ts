import { z } from "zod"

export const LlmHealth = z.discriminatedUnion("status", [
  z.object({ status: z.literal("unset") }),
  z.object({ status: z.literal("ok"), model: z.string() }),
  z.object({ status: z.literal("unreachable"), reason: z.string() }),
])
export type LlmHealth = z.infer<typeof LlmHealth>

// DB slugs the search assistant accepts as a locked scope (per-DB results page);
// kept here (server-importable, unlike app/lib/search-scope) for the BFF request
// schema. The parse API allowlist is the SSOT for which fields each DB allows.
export const ASSISTANT_DB_SLUGS = [
  "trad",
  "sra",
  "bioproject",
  "biosample",
  "jga",
  "gea",
  "metabobank",
  "taxonomy",
] as const

export const ADVANCED_OPS = ["eq", "contains", "wildcard", "between"] as const

export type AdvancedOp = typeof ADVANCED_OPS[number]

// The search assistant emits a DSL string that the BFF validates into a
// ParseNode AST (the `event: done` payload); see docs/llm.md. There is no flat
// proposal schema — the AST is the shared shape (`~/lib/api` ParseNode).
