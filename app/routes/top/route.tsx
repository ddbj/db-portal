import { HeroSection, PopularResources, ServiceGrid } from "~/features/top"
import { NewsAside } from "~/shell"

const TopRoute = () => (
  <>
    <section className="px-hero-x pt-hero-top pb-hero-bottom">
      <div className="max-w-hero-max mx-auto">
        <HeroSection />
      </div>
    </section>
    <section className="px-hero-x pb-page-bottom">
      <div className="max-w-content-max mx-auto grid gap-hero-row-gap md:grid-cols-[2fr_1fr]">
        <main className="min-w-0">
          <ServiceGrid />
          <div className="mt-hero-row-gap">
            <PopularResources />
          </div>
        </main>
        <aside className="min-w-0">
          <NewsAside />
        </aside>
      </div>
    </section>
  </>
)

export default TopRoute
