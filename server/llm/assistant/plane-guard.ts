// The parse/serialize AST shape (ddbj-search-api ParseNode; mirrored here so the
// server does not import from app/). BoolOp + value/range leaves + free-text.
export type AstNode =
  | { op: "AND" | "OR" | "NOT"; rules: AstNode[] }
  | { field: string; op: "contains" | "eq" | "wildcard"; value: string }
  | { field: string; op: "between"; from: string; to: string }
  | { op: "free_text"; value: string; is_phrase: boolean }

// Deterministic safety net for the SRA/JGA subtype-plane trap (docs/search-fields.md
// § subtype plane 不変量). SRA/JGA documents are split by subtype and fields do not
// cross subtypes, so ANDing fields from two planes matches zero documents even though
// /db-portal/parse (which validates per-db, not per-subtype) accepts it. The prompt
// steers the model away from this, but a 32B model still leaks ~10-15% of the time, so
// the BFF repairs the resolved AST: it keeps the sample plane (organism etc.) plus the
// cross fields and drops the experiment/analysis-plane fields, folding the dropped
// primary sequencing concept back in as a free-text term (the same shape the prompt
// produces). The caller re-serializes + re-parses the result so the returned AST stays
// canonical and validated.

type Plane = "sample" | "experiment" | "analysis" | "run" | "study" | "submission" | "dataset" | "cross"

const SRA_SAMPLE = new Set(["organism_name", "organism_id", "geo_loc_name", "collection_date", "derived_from_id"])
const SRA_EXPERIMENT = new Set([
  "library_strategy", "library_source", "library_selection", "library_layout",
  "platform", "instrument_model", "library_name", "library_construction_protocol",
])
const JGA_STUDY = new Set(["study_type", "vendor", "grant_title", "grant_agency"])

// Plane priority when a query spans several: keep the highest one, drop the rest.
// sample (organism) wins so the organism condition is never the part we drop.
const SRA_PRIORITY: Plane[] = ["sample", "experiment", "analysis", "run", "study", "submission"]

// Tier-3 enum value -> the plain free-text phrase the prompt convention uses.
const STRATEGY_PHRASE: Record<string, string> = {
  "RNA-Seq": "RNA-seq", WGS: "WGS", WXS: "exome", "ChIP-Seq": "ChIP-seq",
  "ATAC-seq": "ATAC-seq", "Bisulfite-Seq": "bisulfite sequencing", AMPLICON: "amplicon",
  "Hi-C": "Hi-C", "miRNA-Seq": "miRNA-seq", "ssRNA-seq": "ssRNA-seq", WGA: "WGA",
}
const SOURCE_PHRASE: Record<string, string> = {
  "TRANSCRIPTOMIC SINGLE CELL": "single-cell RNA-seq", "GENOMIC SINGLE CELL": "single-cell",
  METAGENOMIC: "metagenomic", METATRANSCRIPTOMIC: "metatranscriptomic",
  TRANSCRIPTOMIC: "transcriptomic", GENOMIC: "genomic", "VIRAL RNA": "viral RNA", SYNTHETIC: "synthetic",
}
const PLATFORM_PHRASE: Record<string, string> = {
  OXFORD_NANOPORE: "Nanopore", PACBIO_SMRT: "PacBio", ILLUMINA: "Illumina",
  ION_TORRENT: "Ion Torrent", BGISEQ: "BGISEQ", DNBSEQ: "DNBSEQ", LS454: "LS454",
  ABI_SOLID: "SOLiD", CAPILLARY: "capillary",
}

const isBool = (n: AstNode): n is Extract<AstNode, { rules: AstNode[] }> => "rules" in n
const isLeaf = (n: AstNode): n is Extract<AstNode, { field: string }> => "field" in n
const isFreeText = (n: AstNode): boolean => "op" in n && (n as { op?: string }).op === "free_text"

const sraTypePlane = (value: string): Plane =>
  value === "sra-sample" ? "sample"
    : value === "sra-experiment" ? "experiment"
      : value === "sra-analysis" ? "analysis"
        : value === "sra-run" ? "run"
          : value === "sra-study" ? "study" : "submission"

// The plane a single leaf clause belongs to, for the resolved db. Cross (Tier-1/2)
// fields live on every subtype, so they never force a conflict.
const leafPlane = (field: string, value: string | undefined, db: string): Plane => {
  if (db === "sra") {
    if (field === "type" && value) return sraTypePlane(value)
    if (SRA_SAMPLE.has(field)) return "sample"
    if (SRA_EXPERIMENT.has(field)) return "experiment"
    if (field === "analysis_type") return "analysis"
  }
  if (db === "jga") {
    if (field === "type" && value) return value === "jga-dataset" ? "dataset" : "study"
    if (JGA_STUDY.has(field)) return "study"
    if (field === "dataset_type") return "dataset"
  }
  return "cross"
}

const collectLeaves = (node: AstNode, out: AstNode[]): void => {
  if (isLeaf(node) || isFreeText(node)) out.push(node)
  else if (isBool(node)) node.rules.forEach((c) => collectLeaves(c, out))
}

// The free-text phrase for the primary dropped sequencing concept, mirroring the
// prompt convention (single-cell library_source wins; then library_strategy; then a
// bare library_source / platform / instrument_model / analysis_type).
const synthFreeText = (dropped: { field: string; value: string }[]): string | null => {
  const by = (f: string) => dropped.find((d) => d.field === f)?.value
  const src = by("library_source")
  const strat = by("library_strategy")
  if (src && (src === "TRANSCRIPTOMIC SINGLE CELL" || src === "GENOMIC SINGLE CELL")) return SOURCE_PHRASE[src] ?? src.toLowerCase()
  if (strat) return STRATEGY_PHRASE[strat] ?? strat
  if (src) return SOURCE_PHRASE[src] ?? src.toLowerCase()
  const plat = by("platform")
  if (plat) return PLATFORM_PHRASE[plat] ?? plat
  const instr = by("instrument_model")
  if (instr) return instr.replace(/^Illumina /, "")
  const ana = by("analysis_type")
  if (ana) return ana
  return null
}

// Drop every clause that belongs to a plane other than `keep`; preserve structure.
// Returns null when a whole subtree was dropped.
const prune = (node: AstNode, db: string, keep: Plane): AstNode | null => {
  if (isFreeText(node)) return node
  if (isLeaf(node)) {
    const plane = leafPlane(node.field, "value" in node ? node.value : undefined, db)
    return plane === "cross" || plane === keep ? node : null
  }
  if (isBool(node)) {
    if (node.op === "NOT") {
      const child = node.rules[0] ? prune(node.rules[0], db, keep) : null
      return child ? { op: "NOT", rules: [child] } : null
    }
    const kept = node.rules.map((c) => prune(c, db, keep)).filter((c): c is AstNode => c !== null)
    if (kept.length === 0) return null
    if (kept.length === 1) return kept[0] ?? null
    return { op: node.op, rules: kept }
  }

  return node
}

// If the resolved query mixes two subtype planes (so it would match zero documents),
// return a repaired AST that keeps the highest-priority plane + cross fields and folds
// the dropped primary sequencing concept back in as a free-text term. Returns null when
// the query is already plane-safe (no change needed).
export const repairCrossPlane = (ast: AstNode, db: string | null): AstNode | null => {
  if (db !== "sra" && db !== "jga") return null

  const leaves: AstNode[] = []
  collectLeaves(ast, leaves)
  const planes = new Set<Plane>()
  for (const leaf of leaves) {
    if (isLeaf(leaf)) {
      const p = leafPlane(leaf.field, "value" in leaf ? leaf.value : undefined, db)
      if (p !== "cross") planes.add(p)
    }
  }
  if (planes.size < 2) return null // already plane-safe

  const priority = db === "sra" ? SRA_PRIORITY : (["study", "dataset"] as Plane[])
  const keep = priority.find((p) => planes.has(p))
  if (keep === undefined) return null

  // Capture the dropped experiment-plane field values before pruning, to rebuild a
  // free-text term for the primary one.
  const dropped = leaves
    .filter((n): n is Extract<AstNode, { field: string; value: string }> =>
      isLeaf(n) && "value" in n)
    .filter((n) => {
      const p = leafPlane(n.field, n.value, db)
      return p !== "cross" && p !== keep
    })
    .map((n) => ({ field: n.field, value: n.value }))

  const pruned = prune(ast, db, keep)
  if (pruned === null) return null

  // Fold the dropped concept back in as a single free-text term, unless the query
  // already carries a free-text term (only one is allowed).
  const prunedLeaves: AstNode[] = []
  collectLeaves(pruned, prunedLeaves)
  const hasFreeText = prunedLeaves.some(isFreeText)
  const phrase = keep === "sample" && !hasFreeText ? synthFreeText(dropped) : null
  if (phrase === null) return pruned

  const ft: AstNode = { op: "free_text", value: phrase, is_phrase: true } as AstNode
  if (isBool(pruned) && pruned.op === "AND") return { op: "AND", rules: [...pruned.rules, ft] }

  return { op: "AND", rules: [pruned, ft] }
}
