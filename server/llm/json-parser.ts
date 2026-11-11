import express from "express"

// The LLM prompt body is short natural-language text, so 32 KB is enough. A
// larger global limit would make every request pay the parse cost before the
// LLM rate limit runs, so mount this parser only on POST /api/llm/*.
// inflate: false rejects a body with Content-Encoding with 415 instead of
// decompressing it, so compressed data from outside never reaches the zlib or
// brotli decoder.
export const llmJsonParser = express.json({ limit: "32kb", inflate: false })
