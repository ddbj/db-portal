import { PageTitle, Section } from "~/ui"

type Swatch = { token: string; cls: string; hex: string }

const BRAND_SWATCHES: readonly Swatch[] = [
  { token: "brand", cls: "bg-brand", hex: "#6B3FA0" },
  { token: "brand-deep", cls: "bg-brand-deep", hex: "#4B2A78" },
  { token: "brand-light", cls: "bg-brand-light", hex: "#9B7BC8" },
  { token: "brand-soft", cls: "bg-brand-soft", hex: "#EFE7F6" },
  { token: "brand-softer", cls: "bg-brand-softer", hex: "#F6F1FB" },
]

const INK_SWATCHES: readonly Swatch[] = [
  { token: "ink", cls: "bg-ink", hex: "#1A1726" },
  { token: "ink-mid", cls: "bg-ink-mid", hex: "#3F3B4F" },
  { token: "ink-soft", cls: "bg-ink-soft", hex: "#6E6A7B" },
  { token: "ink-softer", cls: "bg-ink-softer", hex: "#9C99A6" },
]

const STATUS_SWATCHES: readonly Swatch[] = [
  { token: "warn-bg", cls: "bg-warn-bg", hex: "#FFF7E6" },
  { token: "warn-fg", cls: "bg-warn-fg", hex: "#7A4F00" },
  { token: "ok-bg", cls: "bg-ok-bg", hex: "#F1F8F3" },
  { token: "ok-fg", cls: "bg-ok-fg", hex: "#1F5430" },
  { token: "critical-bg", cls: "bg-critical-bg", hex: "#FCE8E5" },
  { token: "critical-fg", cls: "bg-critical-fg", hex: "#B73B2C" },
]

const SOURCE_SWATCHES: readonly Swatch[] = [
  { token: "src-ddbj", cls: "bg-src-ddbj", hex: "#C26416" },
  { token: "src-ddbj-soft", cls: "bg-src-ddbj-soft", hex: "#FBEEDD" },
  { token: "src-dbcls", cls: "bg-src-dbcls", hex: "#1F6FB4" },
  { token: "src-dbcls-soft", cls: "bg-src-dbcls-soft", hex: "#E2EEF8" },
]

const SwatchGrid = ({ swatches }: { swatches: readonly Swatch[] }) => (
  <ul className="list-none p-0 grid grid-cols-3 gap-3">
    {swatches.map((s) => (
      <li
        key={s.token}
        className="border border-border-soft rounded-card overflow-hidden bg-surface"
      >
        <div className={`${s.cls} h-16 w-full`} />
        <div className="p-3 text-fs-body-sm">
          <div className="font-mono font-bold text-ink">{s.token}</div>
          <div className="font-mono text-ink-soft">{s.hex}</div>
        </div>
      </li>
    ))}
  </ul>
)

const FontDemo = () => (
  <div className="space-y-3 text-fs-body">
    <p className="font-sans text-ink m-0">font-sans · 日本語 + Latin · DDBJ ポータル</p>
    <p className="font-serif text-ink m-0">font-serif · 日本語 + Latin · DDBJ ポータル</p>
    <p className="font-mono text-ink m-0">font-mono · 12,345 · PRJNA729258 · 2026/05/15</p>
  </div>
)

const SpacingDemo = () => (
  <ul className="list-none p-0 space-y-2 text-fs-body-sm">
    {[
      { name: "section-lg", cls: "h-12" },
      { name: "section-md", cls: "h-8" },
      { name: "section-sm", cls: "h-4" },
      { name: "page-gutter", cls: "h-8" },
    ].map((s) => (
      <li key={s.name} className="flex items-center gap-3">
        <span className="font-mono w-32 text-ink-mid">{s.name}</span>
        <span className={`bg-brand-soft ${s.cls} w-32 inline-block border border-border-soft`} />
      </li>
    ))}
  </ul>
)

const RadiusDemo = () => (
  <ul className="list-none p-0 flex gap-4">
    {[
      { name: "radius-card", cls: "rounded-card" },
      { name: "radius-button", cls: "rounded-button" },
      { name: "radius-tag", cls: "rounded-tag" },
      { name: "radius-pill", cls: "rounded-pill" },
    ].map((r) => (
      <li key={r.name} className="text-center text-fs-body-sm">
        <div className={`w-20 h-20 bg-brand-soft border border-border-soft ${r.cls} mb-1`} />
        <div className="font-mono text-ink-mid">{r.name}</div>
      </li>
    ))}
  </ul>
)

const ShadowDemo = () => (
  <ul className="list-none p-0 flex gap-4">
    {[
      { name: "shadow-card", cls: "shadow-card" },
      { name: "shadow-card-hover", cls: "shadow-card-hover" },
      { name: "shadow-modal", cls: "shadow-modal" },
    ].map((s) => (
      <li
        key={s.name}
        className={`bg-surface px-4 py-3 rounded-card border border-border-soft ${s.cls} text-fs-body-sm`}
      >
        <span className="font-mono text-ink-mid">{s.name}</span>
      </li>
    ))}
  </ul>
)

const DesignTokens = () => (
  <div>
    <PageTitle eyebrow="Design / Tokens" title="Design tokens" />
    <Section padY="sm">
      <h2 className="text-fs-h2 font-bold text-ink m-0 mb-3 pl-2.5 border-l-[3px] border-brand">Brand</h2>
      <SwatchGrid swatches={BRAND_SWATCHES} />
    </Section>
    <Section padY="sm">
      <h2 className="text-fs-h2 font-bold text-ink m-0 mb-3 pl-2.5 border-l-[3px] border-brand">Ink</h2>
      <SwatchGrid swatches={INK_SWATCHES} />
    </Section>
    <Section padY="sm">
      <h2 className="text-fs-h2 font-bold text-ink m-0 mb-3 pl-2.5 border-l-[3px] border-brand">Status</h2>
      <SwatchGrid swatches={STATUS_SWATCHES} />
    </Section>
    <Section padY="sm">
      <h2 className="text-fs-h2 font-bold text-ink m-0 mb-3 pl-2.5 border-l-[3px] border-brand">Source</h2>
      <SwatchGrid swatches={SOURCE_SWATCHES} />
    </Section>
    <Section padY="sm">
      <h2 className="text-fs-h2 font-bold text-ink m-0 mb-3 pl-2.5 border-l-[3px] border-brand">Typography</h2>
      <FontDemo />
    </Section>
    <Section padY="sm">
      <h2 className="text-fs-h2 font-bold text-ink m-0 mb-3 pl-2.5 border-l-[3px] border-brand">Spacing</h2>
      <SpacingDemo />
    </Section>
    <Section padY="sm">
      <h2 className="text-fs-h2 font-bold text-ink m-0 mb-3 pl-2.5 border-l-[3px] border-brand">Radius</h2>
      <RadiusDemo />
    </Section>
    <Section padY="sm">
      <h2 className="text-fs-h2 font-bold text-ink m-0 mb-3 pl-2.5 border-l-[3px] border-brand">Shadow</h2>
      <ShadowDemo />
    </Section>
  </div>
)

export default DesignTokens
