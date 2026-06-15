import type { DatabaseContent } from "~/schemas/content/database-content"
import { Callout, Heading, TextLink } from "~/ui"

import { SubmitGuideSection } from "../submit-guide-section"

export default {
  slug: "metabobank",
  title: {
    ja: "MetaboBank",
    en: "MetaboBank",
  },
  description: {
    ja: "質量分析 (MS) および NMR ベースのメタボロームデータアーカイブ。DDBJ が運用する。",
    en: "Archive for mass-spectrometry (MS) and NMR-based metabolomics data, operated by DDBJ.",
  },
  body: {
    ja: (
      <div className="flex flex-col gap-section-md">
        <section>
          <Heading as="h2" bar className="mb-3">MetaboBank とは</Heading>
          <p className="text-fs-body text-ink-mid leading-relaxed m-0">
            MetaboBank は、質量分析 (MS) や核磁気共鳴 (NMR) で取得したメタボロームデータを登録・公開する
            データアーカイブです。
            代謝物の定量データ・生データ・メタデータを一括して受け付け、研究の再現性と二次利用を支えます。
          </p>
        </section>
        <SubmitGuideSection service="metabobank" lang="ja" />
        <Callout tone="info">
          <TextLink to="/submit">登録ナビ</TextLink>
          {" "}
          で質量分析や NMR を選ぶと、BioProject・BioSample・MetaboBank の登録経路が組み立てられます。
        </Callout>
      </div>
    ),
    en: (
      <div className="flex flex-col gap-section-md">
        <section>
          <Heading as="h2" bar className="mb-3">About MetaboBank</Heading>
          <p className="text-fs-body text-ink-mid leading-relaxed m-0">
            MetaboBank is a data archive for metabolomics experiments using mass spectrometry (MS)
            or nuclear magnetic resonance (NMR). It accepts quantification data, raw measurement
            files, and metadata together, supporting reproducibility and secondary use.
          </p>
        </section>
        <SubmitGuideSection service="metabobank" lang="en" />
        <Callout tone="info">
          Choose mass spectrometry or NMR in the{" "}
          <TextLink to="/submit">submission navigator</TextLink>
          {" "}
          to see the BioProject → BioSample → MetaboBank path assembled automatically.
        </Callout>
      </div>
    ),
  },
  meta: {
    lastUpdated: "2026-06-15T00:00:00Z",
    relatedDbs: ["bioproject", "biosample"],
    externalLinks: [
      { label: { ja: "MetaboBank", en: "MetaboBank" }, href: "https://mb2.ddbj.nig.ac.jp/" },
    ],
  },
} satisfies DatabaseContent
