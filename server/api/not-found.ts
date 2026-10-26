import type { RequestHandler } from "express"

// `/api/` の下で React Router の resource route が応答する path。BFF の 404 は
// この path を通す。
const REACT_ROUTER_API_PATHS: ReadonlySet<string> = new Set(["/api/set-lang"])

// React Router の client は、loader と action を fetch で呼ぶときに path の末尾へ
// `.data` を付ける。ブラウザの form 送信は付けない。どちらも同じ route なので、
// 判定の前に外す。
const withoutDataSuffix = (path: string): string => path.replace(/\.data$/, "")

// `/api/` の下の未知のアドレスに、サイトの 404 ページではなく JSON を返す。
// `/api/` を呼ぶのはプログラムなので、他の BFF endpoint と同じ `{ error }` の
// 形で返す。
export const handleApiNotFound: RequestHandler = (req, res, next) => {
  if (REACT_ROUTER_API_PATHS.has(withoutDataSuffix(req.path))) {
    next()

    return
  }
  res.setHeader("Cache-Control", "no-store")
  res.status(404).json({ error: "not_found" })
}
