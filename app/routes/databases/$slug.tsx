import { useParams } from "react-router"

const DatabaseSlugRoute = () => {
  const { slug } = useParams<{ slug: string }>()

  return (
    <div className="mx-auto max-w-content-max px-page-gutter py-section-md">
      <h1 className="text-fs-h1 font-bold text-ink">Database: {slug}</h1>
    </div>
  )
}

export default DatabaseSlugRoute
