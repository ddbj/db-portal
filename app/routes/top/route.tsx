import { HeroSection, PopularResources, ServiceGrid } from "~/features/top"
import { NewsAside } from "~/shell"

const TopRoute = () => (
  <>
    <section className="px-page-gutter pt-hero-top pb-hero-bottom">
      <div className="max-w-hero-max mx-auto">
        <HeroSection />
      </div>
    </section>
    <section className="px-page-gutter pb-section-lg">
      <div className="max-w-content-max mx-auto grid gap-section-md md:grid-cols-[2fr_1fr]">
        <main className="flex flex-col gap-section-md min-w-0">
          <ServiceGrid />
          <PopularResources />
        </main>
        <aside className="md:sticky md:top-section-sm self-start min-w-0">
          <NewsAside />
        </aside>
      </div>
    </section>
  </>
)

export default TopRoute
