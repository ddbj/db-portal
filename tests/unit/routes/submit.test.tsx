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
  // loader は lang / meta のみを返す（初期選択 node の決定はコンポーネント側で URL から行う）。
  // `?for=` の解釈検証は tests/unit/lib/submit/url.test.ts (parseForParam) が担う。

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
