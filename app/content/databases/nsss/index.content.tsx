import type { DatabaseContent } from "~/schemas/content/database-content"
import { Callout, Heading, TextLink } from "~/ui"

import { SubmitGuideSection } from "../submit-guide-section"

export default {
  slug: "nsss",
  title: {
    ja: "NSSS (Nucleotide Sequence Submission System)",
    en: "NSSS (Nucleotide Sequence Submission System)",
  },
  description: {
    ja: "少数・短い塩基配列を Web ブラウザから登録するシステム。大規模データや完成ゲノムは DDBJ (MSS) で登録する。",
    en: "Web-based system for submitting a small number of short nucleotide sequences. Large-scale data and complete genomes go to DDBJ (MSS).",
  },
  body: {
    ja: (
      <div className="flex flex-col gap-section-md">
        <section>
          <Heading as="h2" bar className="mb-3">NSSS とは</Heading>
          <p className="text-fs-body text-ink-mid leading-relaxed m-0">
            NSSS (Nucleotide Sequence Submission System) は、Web ブラウザ上で少数・短い塩基配列を登録するためのシステムです。
            大規模データや完成ゲノム、WGS・TSA・TLS・EST・HTG・TPA は DDBJ (MSS) で登録します。
          </p>
        </section>
        <SubmitGuideSection service="nsss" lang="ja" />
        <Callout tone="info">
          <TextLink to="/submit">登録ナビ</TextLink>
          {" "}
          で塩基配列を選ぶと、登録先が NSSS か DDBJ (MSS) かが自動的に判定されます。
        </Callout>
      </div>
    ),
    en: (
      <div className="flex flex-col gap-section-md">
        <section>
          <Heading as="h2" bar className="mb-3">About NSSS</Heading>
          <p className="text-fs-body text-ink-mid leading-relaxed m-0">
            NSSS (Nucleotide Sequence Submission System) is a web-based tool for submitting a small
            number of short nucleotide sequences. Large-scale data, complete genomes, and WGS / TSA /
            TLS / EST / HTG / TPA entries should be submitted via DDBJ (MSS) instead.
          </p>
        </section>
        <SubmitGuideSection service="nsss" lang="en" />
        <Callout tone="info">
          Choose nucleotide sequences in the{" "}
          <TextLink to="/submit">submission navigator</TextLink>
          {" "}
          and the system will determine whether your data goes to NSSS or DDBJ (MSS).
        </Callout>
      </div>
    ),
  },
  meta: {
    lastUpdated: "2026-06-15T00:00:00Z",
    relatedDbs: ["bioproject", "biosample", "ddbj"],
    externalLinks: [
      { label: { ja: "NSSS 公式ページ", en: "NSSS official site" }, href: { ja: "https://www.ddbj.nig.ac.jp/ddbj/web-submission.html", en: "https://www.ddbj.nig.ac.jp/ddbj/web-submission-e.html" } },
    ],
  },
} satisfies DatabaseContent
