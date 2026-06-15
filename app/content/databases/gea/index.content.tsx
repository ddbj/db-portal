import type { DatabaseContent } from "~/schemas/content/database-content"
import { Callout, Heading, TextLink } from "~/ui"

import { SubmitGuideSection } from "../submit-guide-section"

export default {
  slug: "gea",
  title: {
    ja: "GEA (Genomic Expression Archive)",
    en: "GEA (Genomic Expression Archive)",
  },
  description: {
    ja: "マイクロアレイおよびシーケンサーベースの機能ゲノミクスデータのアーカイブ。MAGE-TAB 形式で登録する。",
    en: "Archive for microarray and sequencer-based functional genomics data. Submissions use the MAGE-TAB format.",
  },
  body: {
    ja: (
      <div className="flex flex-col gap-section-md">
        <section>
          <Heading as="h2" bar className="mb-3">GEA とは</Heading>
          <p className="text-fs-body text-ink-mid leading-relaxed m-0">
            Genomic Expression Archive (GEA) は、遺伝子発現・エピジェネティクス・SNP タイピングアレイなど
            機能ゲノミクス実験のデータを受け付けるアーカイブです。
            マイクロアレイと RNA-seq の両方に対応し、MAGE-TAB (IDF / SDRF) 形式でメタデータを登録します。
          </p>
        </section>
        <SubmitGuideSection service="gea" lang="ja" />
        <Callout tone="info">
          <TextLink to="/submit">登録ナビ</TextLink>
          {" "}
          で発現データやマイクロアレイを選ぶと、BioProject・BioSample・GEA の登録経路が組み立てられます。
        </Callout>
      </div>
    ),
    en: (
      <div className="flex flex-col gap-section-md">
        <section>
          <Heading as="h2" bar className="mb-3">About GEA</Heading>
          <p className="text-fs-body text-ink-mid leading-relaxed m-0">
            Genomic Expression Archive (GEA) accepts functional genomics experiment data including
            gene expression, epigenetics, and SNP genotyping arrays. It handles both microarray and
            RNA-seq submissions, with metadata described in MAGE-TAB (IDF / SDRF) format.
          </p>
        </section>
        <SubmitGuideSection service="gea" lang="en" />
        <Callout tone="info">
          Select expression data or microarray in the{" "}
          <TextLink to="/submit">submission navigator</TextLink>
          {" "}
          to see the BioProject → BioSample → GEA path assembled automatically.
        </Callout>
      </div>
    ),
  },
  meta: {
    lastUpdated: "2026-06-15T00:00:00Z",
    relatedDbs: ["bioproject", "biosample"],
    externalLinks: [
      { label: { ja: "GEA 公式ページ", en: "GEA official site" }, href: { ja: "https://www.ddbj.nig.ac.jp/gea/index.html", en: "https://www.ddbj.nig.ac.jp/gea/index-e.html" } },
    ],
  },
} satisfies DatabaseContent
