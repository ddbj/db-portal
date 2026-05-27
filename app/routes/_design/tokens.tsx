import type { ReactNode } from "react"

import { PageTitle, Section } from "~/ui"

type Swatch = { name: string; cls: string; hex: string }

const BRAND_SWATCHES: readonly Swatch[] = [
  { name: "brand", cls: "bg-brand", hex: "#6F4392" },
  { name: "brand-deep", cls: "bg-brand-deep", hex: "#502E6B" },
  { name: "brand-light", cls: "bg-brand-light", hex: "#A987C5" },
  { name: "brand-soft", cls: "bg-brand-soft", hex: "#F4F2FA" },
  { name: "brand-softer", cls: "bg-brand-softer", hex: "#F8F4FB" },
]

const INK_SWATCHES: readonly Swatch[] = [
  { name: "ink", cls: "bg-ink", hex: "#1A1726" },
  { name: "ink-mid", cls: "bg-ink-mid", hex: "#3F3B4F" },
  { name: "ink-soft", cls: "bg-ink-soft", hex: "#6E6A7B" },
  { name: "ink-softer", cls: "bg-ink-softer", hex: "#9C99A6" },
]

const STATUS_SWATCHES: readonly Swatch[] = [
  { name: "warn-bg", cls: "bg-warn-bg", hex: "#FCF7E3" },
  { name: "warn-fg", cls: "bg-warn-fg", hex: "#705800" },
  { name: "ok-bg", cls: "bg-ok-bg", hex: "#F1F8F3" },
  { name: "ok-fg", cls: "bg-ok-fg", hex: "#1F5430" },
  { name: "critical-bg", cls: "bg-critical-bg", hex: "#FCE8E5" },
  { name: "critical-fg", cls: "bg-critical-fg", hex: "#B73B2C" },
]

const SOURCE_SWATCHES: readonly Swatch[] = [
  { name: "src-ddbj", cls: "bg-src-ddbj", hex: "#A56712" },
  { name: "src-ddbj-soft", cls: "bg-src-ddbj-soft", hex: "#FBEFDF" },
  { name: "src-dbcls", cls: "bg-src-dbcls", hex: "#004098" },
  { name: "src-dbcls-soft", cls: "bg-src-dbcls-soft", hex: "#DFEBFB" },
]

type TypeFamily = { name: string; cls: string; sample: string }

const TYPE_FAMILIES: readonly TypeFamily[] = [
  { name: "font-sans", cls: "font-sans", sample: "DDBJ ポータル · DNA Data Bank · 12345" },
  { name: "font-serif", cls: "font-serif", sample: "DDBJ ポータル · DNA Data Bank · 12345" },
  { name: "font-mono", cls: "font-mono", sample: "PRJNA729258 · 2026/05/15 · DDBJ" },
]

type TypeScaleItem = { name: string; cls: string; px: string; use: string }

const TYPE_SCALE: readonly TypeScaleItem[] = [
  { name: "fs-h1", cls: "text-fs-h1", px: "28px", use: "PageTitle h1" },
  { name: "fs-h2", cls: "text-fs-h2", px: "18px", use: "SectionHeading / ModalHeader title / card title (h3)" },
  { name: "fs-h3", cls: "text-fs-h3", px: "14px", use: "SidebarHeading (= fs-body と同値、weight 700 で識別)" },
  { name: "fs-body", cls: "text-fs-body", px: "14px", use: "default body / form control / SearchBox input (md)" },
  { name: "fs-body-sm", cls: "text-fs-body-sm", px: "13px", use: "excerpt / Button sm / SearchBox scope (md) / FmtRadio・FmtCheck" },
  { name: "fs-label", cls: "text-fs-label", px: "12px", use: "mono small-caps label / FacetRow count / Chip / Pagination" },
  { name: "fs-meta", cls: "text-fs-meta", px: "12px", use: "metadata (news date, accession code) — fs-label と同値、weight/family が違う" },
  { name: "fs-micro", cls: "text-fs-micro", px: "11px", use: "Tag / FacetRow sub / FormGroup hint" },
]

type TrackingItem = { name: string; value: string; sample: string; sampleCls: string; use: string }

const TRACKING: readonly TrackingItem[] = [
  {
    name: "tracking-h1",
    value: "-0.015em",
    sample: "DDBJ ポータル",
    sampleCls: "font-sans font-extrabold text-fs-h1 tracking-h1 leading-tight",
    use: "PageTitle h1",
  },
  {
    name: "tracking-h3",
    value: "0.01em",
    sample: "適用中のフィルタ",
    sampleCls: "font-sans font-bold text-fs-h3 tracking-h3 leading-tight",
    use: "SidebarHeading",
  },
  {
    name: "tracking-mono",
    value: "0.02em",
    sample: "PRJNA729258 · 2026/05/15",
    sampleCls: "font-mono text-fs-body tracking-mono",
    use: "font-mono input / news date / mono metadata",
  },
  {
    name: "tracking-tag",
    value: "0.04em",
    sample: "biosample",
    sampleCls: "font-mono font-bold uppercase text-fs-micro tracking-tag",
    use: "Tag / FormGroup num",
  },
  {
    name: "tracking-label",
    value: "0.06em",
    sample: "WHERE",
    sampleCls: "font-mono font-bold uppercase text-fs-label tracking-label",
    use: "Label / SidebarGroupLabel (uppercase mono)",
  },
  {
    name: "tracking-eyebrow",
    value: "0.1em",
    sample: "DESIGN PREVIEW",
    sampleCls: "font-mono font-bold uppercase text-fs-label tracking-eyebrow text-brand",
    use: "PageTitle eyebrow / Popular Resources eyebrow",
  },
  {
    name: "tracking-monogram",
    value: "-0.02em",
    sample: "DD",
    sampleCls: "font-mono font-bold text-fs-h1 tracking-monogram",
    use: "Popular Resources monogram (大文字 2 文字)",
  },
]

type LeadingItem = { name: string; cls: string; value: string; use: string }

const LEADING: readonly LeadingItem[] = [
  { name: "leading-tight", cls: "leading-tight", value: "1.2", use: "h1 / h2 / sidebar heading" },
  { name: "leading-snug", cls: "leading-snug", value: "1.4", use: "Tag / news title / search result card title" },
  { name: "leading-normal", cls: "leading-normal", value: "1.5", use: "tile (service / file-type card)" },
  { name: "leading-relaxed", cls: "leading-relaxed", value: "1.6", use: "body prose / Modal description / Callout / content 段落" },
  { name: "leading-loose", cls: "leading-loose", value: "1.7", use: "dense paragraph (cross results description)" },
]

const LEADING_SAMPLE = "DDBJ は DNA データバンクとして国際的に協調しながら塩基配列データの登録 / 検索 / 公開を担っている。ポータルは登録支援と統合検索の入口を提供する。"

type SpacingItem = { name: string; cls: string; px: string }

const SPACINGS: readonly SpacingItem[] = [
  { name: "section-lg", cls: "w-section-lg", px: "48px" },
  { name: "section-md", cls: "w-section-md", px: "32px" },
  { name: "section-block", cls: "w-section-block", px: "28px" },
  { name: "section-mid", cls: "w-section-mid", px: "24px" },
  { name: "section-sm", cls: "w-section-sm", px: "16px" },
  { name: "page-gutter", cls: "w-page-gutter", px: "32px" },
]

type RadiusItem = { name: string; cls: string; px: string }

const RADII: readonly RadiusItem[] = [
  { name: "radius-card", cls: "rounded-card", px: "10px" },
  { name: "radius-button", cls: "rounded-button", px: "6px" },
  { name: "radius-tag", cls: "rounded-tag", px: "4px" },
  { name: "radius-pill", cls: "rounded-pill", px: "9999px" },
]

type ShadowItem = { name: string; cls: string }

const SHADOWS: readonly ShadowItem[] = [
  { name: "shadow-card", cls: "shadow-card" },
  { name: "shadow-card-hover", cls: "shadow-card-hover" },
  { name: "shadow-modal", cls: "shadow-modal" },
]

const SwatchGrid = ({ swatches }: { swatches: readonly Swatch[] }) => (
  <ul className="list-none p-0 grid grid-cols-3 gap-3">
    {swatches.map((s) => (
      <li
        key={s.name}
        className="border border-border-soft rounded-card overflow-hidden bg-surface"
      >
        <div className={`${s.cls} h-16 w-full`} />
        <div className="p-3 text-fs-body-sm">
          <div className="font-mono font-bold text-ink">{s.name}</div>
          <div className="font-mono text-ink-soft">{s.hex}</div>
        </div>
      </li>
    ))}
  </ul>
)

const TypeFamilyDemo = () => (
  <ul className="list-none p-0 space-y-3">
    {TYPE_FAMILIES.map((f) => (
      <li key={f.name} className="flex items-baseline gap-6 flex-wrap">
        <span className="font-mono text-fs-label text-ink-mid w-28 shrink-0">{f.name}</span>
        <span className={`${f.cls} text-fs-body text-ink`}>{f.sample}</span>
      </li>
    ))}
  </ul>
)

const TypeScaleDemo = () => (
  <ul className="list-none p-0 space-y-4">
    {TYPE_SCALE.map((s) => (
      <li key={s.name} className="flex items-baseline gap-6 flex-wrap">
        <span className="font-mono text-fs-label text-ink-mid w-28 shrink-0">{s.name}</span>
        <span className={`${s.cls} text-ink font-sans leading-tight`}>Aa あ DDBJ 12345</span>
        <span className="font-mono text-fs-label text-ink-soft w-12 shrink-0">{s.px}</span>
        <span className="text-fs-body-sm text-ink-mid">{s.use}</span>
      </li>
    ))}
  </ul>
)

const TrackingDemo = () => (
  <ul className="list-none p-0 space-y-4">
    {TRACKING.map((t) => (
      <li key={t.name} className="flex items-baseline gap-6 flex-wrap">
        <span className="font-mono text-fs-label text-ink-mid w-36 shrink-0">{t.name}</span>
        <span className={t.sampleCls}>{t.sample}</span>
        <span className="font-mono text-fs-label text-ink-soft w-20 shrink-0">{t.value}</span>
        <span className="text-fs-body-sm text-ink-mid">{t.use}</span>
      </li>
    ))}
  </ul>
)

const LeadingDemo = () => (
  <ul className="list-none p-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
    {LEADING.map((l) => (
      <li key={l.name} className="border border-border-soft rounded-card p-3 bg-surface">
        <div className="flex items-baseline gap-2 mb-2 flex-wrap">
          <span className="font-mono text-fs-label font-bold text-ink">{l.name}</span>
          <span className="font-mono text-fs-label text-ink-soft">{l.value}</span>
        </div>
        <p className={`text-fs-body text-ink m-0 ${l.cls}`}>{LEADING_SAMPLE}</p>
        <p className="text-fs-label text-ink-soft m-0 mt-2 leading-snug">{l.use}</p>
      </li>
    ))}
  </ul>
)

const SpacingDemo = () => (
  <ul className="list-none p-0 space-y-2 text-fs-body-sm">
    {SPACINGS.map((s) => (
      <li key={s.name} className="flex items-center gap-3">
        <span className="font-mono w-32 text-ink-mid">{s.name}</span>
        <span className={`bg-brand-soft h-4 ${s.cls} inline-block border border-border-soft`} />
        <span className="font-mono text-ink-soft">{s.px}</span>
      </li>
    ))}
  </ul>
)

const RadiusDemo = () => (
  <ul className="list-none p-0 flex gap-4 flex-wrap">
    {RADII.map((r) => (
      <li key={r.name} className="text-center text-fs-body-sm">
        <div className={`w-20 h-20 bg-brand-soft border border-border-soft ${r.cls} mb-1`} />
        <div className="font-mono text-ink-mid">{r.name}</div>
        <div className="font-mono text-ink-soft text-fs-label">{r.px}</div>
      </li>
    ))}
  </ul>
)

const ShadowDemo = () => (
  <ul className="list-none p-0 flex gap-4 flex-wrap">
    {SHADOWS.map((s) => (
      <li
        key={s.name}
        className={`bg-surface px-4 py-3 rounded-card border border-border-soft ${s.cls} text-fs-body-sm`}
      >
        <span className="font-mono text-ink-mid">{s.name}</span>
      </li>
    ))}
  </ul>
)

const SectionTitle = ({ children }: { children: ReactNode }) => (
  <h2 className="text-fs-h2 font-bold text-ink m-0 mb-3 pl-2.5 border-l-[3px] border-brand">
    {children}
  </h2>
)

const DesignTokens = () => (
  <div>
    <PageTitle eyebrow="Design / Tokens" title="Design tokens" />
    <Section padY="sm">
      <SectionTitle>Brand</SectionTitle>
      <SwatchGrid swatches={BRAND_SWATCHES} />
    </Section>
    <Section padY="sm">
      <SectionTitle>Ink</SectionTitle>
      <SwatchGrid swatches={INK_SWATCHES} />
    </Section>
    <Section padY="sm">
      <SectionTitle>Status</SectionTitle>
      <SwatchGrid swatches={STATUS_SWATCHES} />
    </Section>
    <Section padY="sm">
      <SectionTitle>Source</SectionTitle>
      <SwatchGrid swatches={SOURCE_SWATCHES} />
    </Section>
    <Section padY="sm">
      <SectionTitle>Type family</SectionTitle>
      <TypeFamilyDemo />
    </Section>
    <Section padY="sm">
      <SectionTitle>Type scale</SectionTitle>
      <TypeScaleDemo />
    </Section>
    <Section padY="sm">
      <SectionTitle>Tracking</SectionTitle>
      <TrackingDemo />
    </Section>
    <Section padY="sm">
      <SectionTitle>Leading</SectionTitle>
      <LeadingDemo />
    </Section>
    <Section padY="sm">
      <SectionTitle>Spacing</SectionTitle>
      <SpacingDemo />
    </Section>
    <Section padY="sm">
      <SectionTitle>Radius</SectionTitle>
      <RadiusDemo />
    </Section>
    <Section padY="sm">
      <SectionTitle>Shadow</SectionTitle>
      <ShadowDemo />
    </Section>
  </div>
)

export default DesignTokens
