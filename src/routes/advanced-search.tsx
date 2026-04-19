import type { Route } from "./+types/advanced-search"

export const meta = (_args: Route.MetaArgs) => {

  return [
    { title: "詳細検索 - DDBJ DB Portal" },
    { name: "description", content: "DDBJ 詳細検索（準備中）" },
  ]
}

const AdvancedSearch = () => {

  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
          詳細検索
        </h1>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
          Under construction
        </p>
      </div>
    </div>
  )
}

export default AdvancedSearch
