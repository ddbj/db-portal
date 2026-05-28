import { HeroSection, PopularResources, ServiceGrid } from "~/features/top"
import { NewsAside } from "~/shell"

const TopRoute = () => (
  <>
    <section className="px-page-gutter pt-18 pb-20">
      <div className="max-w-content-narrow mx-auto">
        <HeroSection />
      </div>
    </section>
    <section className="px-page-gutter pb-14">
      <div className="max-w-content-max mx-auto grid gap-10 sm:grid-cols-[2fr_1fr]">
        <main className="min-w-0">
          <ServiceGrid />
          <div className="mt-10">
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
