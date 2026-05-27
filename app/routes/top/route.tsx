import { HeroSection, PopularResources, ServiceGrid } from "~/features/top"
import { NewsAside } from "~/shell"

const TopRoute = () => (
  <>
    <section className="px-10 pt-18 pb-20">
      <div className="mx-auto" style={{ maxWidth: 820 }}>
        <HeroSection />
      </div>
    </section>
    <section className="px-10 pb-14">
      <div className="max-w-content-max mx-auto grid gap-10 md:grid-cols-[2fr_1fr]">
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
