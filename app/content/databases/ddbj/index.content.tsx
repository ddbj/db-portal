import type { DatabaseContent } from "~/schemas/content/database-content"
import { Callout, Heading, TextLink } from "~/ui"

import { SubmitGuideSection } from "../submit-guide-section"

export default {
  slug: "ddbj",
  title: {
    ja: "DDBJ (MSS)",
    en: "DDBJ (MSS)",
  },
  description: {
    ja: "塩基配列の一括登録システム (Mass Submission System)。WGS・完成ゲノム・MAG・TSA・TLS・TPA・アノテーション付き配列を受け付ける。",
    en: "Mass Submission System for bulk nucleotide sequences. Accepts WGS, complete genomes, MAG, TSA, TLS, TPA, and annotated sequences.",
  },
  body: {
    ja: (
      <div className="flex flex-col gap-section-md">
        <section>
          <Heading as="h2" bar className="mb-3">DDBJ (MSS) とは</Heading>
          <p className="text-fs-body text-ink-mid leading-relaxed m-0">
            DDBJ の MSS (Mass Submission System) は、大量の塩基配列やアノテーション付き配列を一括登録するためのシステムです。
            WGS (Whole Genome Shotgun)、完成ゲノム (GNM)、MAG (Metagenome-Assembled Genome)、
            TSA (Transcriptome Shotgun Assembly)、TLS (Targeted Locus Study)、TPA (Third Party Annotation) など、
            Division と data type に応じた分類で受け付けます。
          </p>
        </section>
        <SubmitGuideSection service="ddbj" lang="ja" />
        <Callout tone="info">
          <TextLink to="/submit">登録ナビ</TextLink>
          {" "}
          で塩基配列を選ぶと、BioProject・BioSample・DDBJ の登録経路が組み立てられます。
        </Callout>
      </div>
    ),
    en: (
      <div className="flex flex-col gap-section-md">
        <section>
          <Heading as="h2" bar className="mb-3">About DDBJ (MSS)</Heading>
          <p className="text-fs-body text-ink-mid leading-relaxed m-0">
            DDBJ&apos;s MSS (Mass Submission System) handles bulk submission of nucleotide sequences
            with or without annotations. It covers WGS (Whole Genome Shotgun), complete genomes (GNM),
            MAG (Metagenome-Assembled Genome), TSA (Transcriptome Shotgun Assembly), TLS (Targeted
            Locus Study), and TPA (Third Party Annotation), classified by division and data type.
          </p>
        </section>
        <SubmitGuideSection service="ddbj" lang="en" />
        <Callout tone="info">
          Choose nucleotide sequences in the{" "}
          <TextLink to="/submit">submission navigator</TextLink>
          {" "}
          to see the BioProject → BioSample → DDBJ path assembled automatically.
        </Callout>
      </div>
    ),
  },
  meta: {
    lastUpdated: "2026-06-15T00:00:00Z",
    relatedDbs: ["bioproject", "biosample"],
    externalLinks: [
      { label: { ja: "MSS 公式ページ", en: "MSS official site" }, href: "https://www.ddbj.nig.ac.jp/ddbj/mss.html" },
    ],
  },
} satisfies DatabaseContent
