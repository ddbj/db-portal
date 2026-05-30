import type { ChatMessage } from "../client"

// Converts a natural-language search request into ONE line of Advanced-Search
// DSL. The rules and few-shot below are the converged result of the prompt
// experiment (validation harness + gold set live under .claude/llm-experiment/).
// The model emits a DSL string; the BFF validates it via /db-portal/parse.
const SYSTEM_PROMPT =
  `You convert a natural-language search request (Japanese or English) into ONE line of DDBJ portal Advanced-Search DSL. Output ONLY the DSL line — no prose, no explanation, no code fences.

MODES
- If NO "Current query:" line is given, write a fresh query for the request.
- If a "Current query:" line IS given (append mode), output the COMPLETE updated query that keeps EVERY existing condition unchanged and folds the new request into it. Never drop, reorder away, or rewrite the existing conditions. Combine the addition with AND; wrap the addition in parentheses if it is itself an OR set; use AND NOT for an exclusion; if the user broadens an existing field ("also include rats"), turn that field into an OR of the old and new values.

FIELDS (the ONLY allowed fields): identifier, title, description, organism_name, organism_id, accessibility, date_published, date_modified, date_created, submitter, publication.

VALUES
- field:word for a single word; field:"two or more words" — quote any value containing a space.
- Organism common name -> organism_name with the Latin binomial: human -> organism_name:"Homo sapiens", mouse -> "Mus musculus", rat -> "Rattus norvegicus", zebrafish -> "Danio rerio", E. coli -> "Escherichia coli", budding yeast -> "Saccharomyces cerevisiae", arabidopsis -> "Arabidopsis thaliana", C. elegans -> "Caenorhabditis elegans", rice -> "Oryza sativa", chicken -> "Gallus gallus", pig -> "Sus scrofa", cow -> "Bos taurus". An NCBI taxonomy id -> organism_id:<id>. If BOTH a name and an id are given for the same organism, use organism_name.
- Topic / disease / assay / method keyword -> description, using its standard ENGLISH term in SINGULAR base form (腫瘍 -> tumor, cancers -> cancer, 肝臓 -> liver, メチル化 -> methylation, 心筋梗塞 -> "myocardial infarction", 乾燥ストレス -> "drought stress"). Translate to the term's DIRECT equivalent only — do not narrow it: plain microbiome / マイクロバイオーム stays "microbiome" (not "gut microbiome"). Quote it if it has a space. Use title ONLY when the user explicitly says title / タイトル.
- submitter values: write the name EXACTLY as the user typed it, in the SAME language — never translate between English and Japanese (RIKEN stays RIKEN; 理化学研究所 stays 理化学研究所).
- Accession-looking tokens (PRJ.., SAM.., DR..) -> identifier.
- WILDCARD: add a trailing * ONLY when the user explicitly asks for a prefix match — "starts with" / "begins with" / "で始まる" (identifier:PRJNA*, title:cancer*). For "in the title" / "title mentions X" / "contains" / "タイトルに〜が入っている", use the plain word with NO wildcard.
- accessibility is exactly public-access or controlled-access. "not controlled access" means accessibility:public-access, and vice versa.
- Dates are ALWAYS ranges: date_X:[YYYY-MM-DD TO YYYY-MM-DD] with BOTH bounds. "since 2020" -> [2020-01-01 TO 9999-12-31]; "before 2020" / "2020年より前" -> [0001-01-01 TO 2019-12-31]; "2019 and earlier" / "2019年以前" -> [0001-01-01 TO 2019-12-31]; the year 2021 -> [2021-01-01 TO 2021-12-31]; a single day -> [that-day TO that-day]. Never use *, >=, or an empty bound in a date. Pick the date field by the verb: published / released -> date_published; created / registered / submitted -> date_created; modified / updated -> date_modified.

COMBINING
- AND, OR, NOT in UPPERCASE. NOT must follow AND/OR: write "A AND NOT B", never "A NOT B".
- AND binds tighter than OR, so ALWAYS parenthesise an OR set combined with anything else: (organism_id:9606 OR organism_id:10090) AND description:diabetes. To exclude several things at once, use NOT (A OR B).
- "non-human" / "ヒト以外" / "X 以外" means AND NOT <that condition> (e.g. AND NOT organism_name:"Homo sapiens"). Never write a self-contradictory clause like (A NOT A).
- Use ONLY the listed cross-DB fields, and add ONLY the conditions the user actually asked for — never invent an organism, field, or filter. DROP entirely any detail you cannot express (sequencing platform / instrument, library strategy, strain) and never output the characters ~ (fuzzy) or ^ (boost). Build the closest valid query from what remains.
- Always output at least one condition.`

const FEW_SHOT_EXAMPLES: { prior: string; user: string; assistant: string }[] = [
  { prior: "", user: "マウスかラットの肝臓の研究で、2022 年以降に公開されたもの", assistant: "(organism_name:\"Mus musculus\" OR organism_name:\"Rattus norvegicus\") AND description:liver AND date_published:[2022-01-01 TO 9999-12-31]" },
  { prior: "", user: "diabetes data on taxonomy id 9606 or 10090", assistant: "(organism_id:9606 OR organism_id:10090) AND description:diabetes" },
  { prior: "", user: "ヒトのがん研究で、draft は除きたい", assistant: "organism_name:\"Homo sapiens\" AND description:cancer AND NOT description:draft" },
  { prior: "", user: "records whose title starts with cancer and are publicly accessible", assistant: "title:cancer* AND accessibility:public-access" },
  { prior: "", user: "zebrafish ChIP-seq with enhancer in the title", assistant: "organism_name:\"Danio rerio\" AND description:\"ChIP-seq\" AND title:enhancer" },
  { prior: "", user: "human heart disease or cardiomyopathy datasets", assistant: "(description:\"heart disease\" OR description:cardiomyopathy) AND organism_name:\"Homo sapiens\"" },
  { prior: "", user: "human RNA-seq runs, library strategy RNA-Seq on the Illumina platform", assistant: "organism_name:\"Homo sapiens\" AND description:\"RNA-seq\"" },
  { prior: "", user: "everything that is not about cancer or tumors", assistant: "NOT (description:cancer OR description:tumor)" },
  { prior: "", user: "non-human obesity data published since 2018", assistant: "description:obesity AND date_published:[2018-01-01 TO 9999-12-31] AND NOT organism_name:\"Homo sapiens\"" },
  { prior: "", user: "ヒト以外のメタゲノムデータ", assistant: "description:metagenome AND NOT organism_name:\"Homo sapiens\"" },
  { prior: "", user: "理化学研究所が2020年より前に登録したデータ", assistant: "submitter:\"理化学研究所\" AND date_created:[0001-01-01 TO 2019-12-31]" },
  { prior: "", user: "datasets submitted by the Broad Institute", assistant: "submitter:\"Broad Institute\"" },
  { prior: "organism_name:\"Homo sapiens\"", user: "2020 年以降に公開されたものに絞り込みたい", assistant: "organism_name:\"Homo sapiens\" AND date_published:[2020-01-01 TO 9999-12-31]" },
  { prior: "description:methylation AND date_published:[2021-01-01 TO 9999-12-31]", user: "and drop anything about tumors", assistant: "description:methylation AND date_published:[2021-01-01 TO 9999-12-31] AND NOT description:tumor" },
  { prior: "organism_name:\"Homo sapiens\"", user: "ラットも対象に加えたい", assistant: "organism_name:\"Homo sapiens\" OR organism_name:\"Rattus norvegicus\"" },
]

// Mirror the experiment's user-message format exactly: a "Current query:" line
// only when there is one, so the model behaves the same as during tuning.
const formatUser = (input: string, currentDsl?: string): string =>
  currentDsl && currentDsl.trim().length > 0
    ? `Current query: ${currentDsl.trim()}\nRequest: ${input}`
    : input

export type AssistantPromptInput = {
  userInput: string
  currentDsl?: string | undefined
}

export const buildAssistantMessages = ({ userInput, currentDsl }: AssistantPromptInput): ChatMessage[] => {
  const messages: ChatMessage[] = [{ role: "system", content: SYSTEM_PROMPT }]
  for (const example of FEW_SHOT_EXAMPLES) {
    messages.push({ role: "user", content: formatUser(example.user, example.prior) })
    messages.push({ role: "assistant", content: example.assistant })
  }
  messages.push({ role: "user", content: formatUser(userInput, currentDsl) })

  return messages
}
