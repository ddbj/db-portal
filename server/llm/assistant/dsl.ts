// Turn a model completion into a single clean DSL line. The prompt asks for a
// bare DSL line, but a small model occasionally wraps it in a code fence or adds
// a stray Lucene fuzzy/boost modifier the grammar rejects, so normalise both.

export const extractDsl = (raw: string): string => {
  let text = raw.trim()
  if (text.startsWith("```")) {
    const lines = text.split("\n").slice(1)
    if (lines.length > 0 && lines[lines.length - 1]?.trim().startsWith("```")) {
      lines.pop()
    }
    text = lines.join("\n").trim()
  }
  for (const line of text.split("\n")) {
    const cleaned = line.trim().replace(/^`+|`+$/g, "").trim()
    if (cleaned.length > 0) return cleaned
  }

  return text
}

// fuzzy (`term~2`) and boost (`term^3`) are reserved/unsupported; drop the
// operator and any numeric argument so the rest of the query still validates.
export const stripUnsupported = (dsl: string): string =>
  dsl.replace(/[~^]\d*(?:\.\d+)?/g, "").trim()
