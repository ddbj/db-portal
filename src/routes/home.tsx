import type { Route } from "./+types/home"

export const meta = (_args: Route.MetaArgs) => {

  return [
    { title: "DDBJ DB Portal" },
    { name: "description", content: "DDBJ DB Portal" },
  ]
}

const Home = () => {

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
          DDBJ DB Portal
        </h1>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
          Under construction
        </p>
      </div>
    </main>
  )
}

export default Home
