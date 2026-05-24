import { HeroSection, PopularResources, ServiceGrid } from "~/features/top"
import { NewsAside } from "~/shell"

const TopRoute = () => (
  <div className="px-page-gutter">
    <div className="max-w-content-max mx-auto py-section-md grid gap-section-md lg:grid-cols-[1fr_var(--spacing-right-pane)]">
      <main className="flex flex-col gap-section-md min-w-0">
        <HeroSection />
        <ServiceGrid />
        <PopularResources />
      </main>
      <aside className="lg:sticky lg:top-section-sm self-start">
        <NewsAside />
      </aside>
    </div>
  </div>
)

export default TopRoute
