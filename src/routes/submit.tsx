import type { Route } from "./+types/submit"

export const meta = (_args: Route.MetaArgs) => {

  return [
    { title: "登録 - DDBJ DB Portal" },
    { name: "description", content: "DDBJ 登録ナビゲーション（準備中）" },
  ]
}

const Submit = () => {

  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
          登録
        </h1>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
          Under construction
        </p>
      </div>
    </div>
  )
}

export default Submit
