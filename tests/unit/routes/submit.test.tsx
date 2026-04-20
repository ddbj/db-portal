import { describe, expect, it } from "vitest"

import { loader } from "@/routes/submit"

type LoaderArgs = Parameters<typeof loader>[0]

// unstable_url / unstable_pattern 等の React Router v7 内部型フィールドは
// loader 本体が読まないため、最低限の形状のみで十分。型アサーションで回避する。
const mkArgs = (url: string, cookie = "", accept = "ja"): LoaderArgs => ({
  request: new Request(url, {
    headers: {
      Cookie: cookie,
      "Accept-Language": accept,
    },
  }),
  params: {},
  context: undefined as never,
} as unknown as LoaderArgs)

describe("submit.tsx loader", () => {
  it("defaults to 'microbial' when ?for is absent", async () => {
    const result = await loader(mkArgs("http://x/submit"))
    expect(result.initialNodeId).toBe("microbial")
  })

  it("passes through a valid leaf node id", async () => {
    const result = await loader(mkArgs("http://x/submit?for=prokaryote-raw-assembly"))
    expect(result.initialNodeId).toBe("prokaryote-raw-assembly")
  })

  it("passes through a valid intermediate node id", async () => {
    const result = await loader(mkArgs("http://x/submit?for=eukaryote"))
    expect(result.initialNodeId).toBe("eukaryote")
  })

  it("falls back to microbial for an unknown ?for value", async () => {
    const result = await loader(mkArgs("http://x/submit?for=invalid-xyz"))
    expect(result.initialNodeId).toBe("microbial")
  })

  it("falls back to microbial for leaf-number id (leaf-18)", async () => {
    const result = await loader(mkArgs("http://x/submit?for=leaf-18"))
    expect(result.initialNodeId).toBe("microbial")
  })

  it("returns ja lang from cookie", async () => {
    const result = await loader(mkArgs("http://x/submit", "lang=ja"))
    expect(result.lang).toBe("ja")
  })

  it("returns en lang from cookie", async () => {
    const result = await loader(mkArgs("http://x/submit", "lang=en"))
    expect(result.lang).toBe("en")
  })

  it("resolves metaTitle from the chosen language resource", async () => {
    const jaResult = await loader(mkArgs("http://x/submit", "lang=ja"))
    const enResult = await loader(mkArgs("http://x/submit", "lang=en"))
    expect(jaResult.metaTitle).toContain("登録")
    expect(enResult.metaTitle).toContain("Submission")
  })
})
