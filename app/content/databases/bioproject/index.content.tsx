import type { DatabaseContent } from "~/schemas/content/database-content"
import { Callout, Heading, TextLink } from "~/ui"

export default {
  slug: "bioproject",
  title: { ja: "BioProject", en: "BioProject" },
  description: {
    ja: "研究プロジェクトと、そのプロジェクトに由来する試料・配列データを束ねるメタデータデータベース。",
    en: "Metadata database that groups research projects together with the samples and sequence data derived from them.",
  },
  body: {
    ja: (
      <div className="flex flex-col gap-section-md">
        <section>
          <Heading as="h2" bar className="mb-3">BioProject とは</Heading>
          <p className="text-fs-body text-ink-mid leading-relaxed m-0">
            BioProject は、研究プロジェクト単位でデータをまとめるためのメタデータデータベースです。
            個々の配列データや試料情報は、対応する BioProject アクセッション番号を参照することで、
            プロジェクトという 1 つの単位として横断的に把握できます。
          </p>
        </section>
        <Callout tone="info">
          BioProject を登録するには DDBJ Account が必要です。
          {" "}
          <TextLink to="/submit">登録ナビ</TextLink>
          {" "}
          から、登録対象のファイル種別に合わせた手順を確認できます。
        </Callout>
        <section>
          <Heading as="h2" bar className="mb-3">アクセッション番号</Heading>
          <p className="text-fs-body text-ink-mid leading-relaxed m-0">
            DDBJ BioProject では、登録された各プロジェクトに対して
            {" "}
            <code className="font-mono text-ink">PRJDB</code>
            {" "}
            から始まるアクセッション番号を発行します。
            複数のプロジェクトを束ねる Umbrella BioProject は同形式の番号を持ち、公開のみ受け付けます。
          </p>
        </section>
        <section>
          <Heading as="h2" bar className="mb-3">国際的な共有</Heading>
          <p className="text-fs-body text-ink-mid leading-relaxed m-0">
            公開された BioProject のメタデータは、INSDC (International Nucleotide Sequence Database
            Collaboration) のメンバーである EBI および NCBI と継続的に交換されます。
            BSI の横断検索からは DDBJ で公開された情報を参照できます。
          </p>
        </section>
      </div>
    ),
    en: (
      <div className="flex flex-col gap-section-md">
        <section>
          <Heading as="h2" bar className="mb-3">What BioProject organises</Heading>
          <p className="text-fs-body text-ink-mid leading-relaxed m-0">
            BioProject is a metadata database that organises data per research project. Individual
            sequence records and sample metadata can be grouped together by referring to the same
            BioProject accession, so that the project as a whole stays navigable.
          </p>
        </section>
        <Callout tone="info">
          Submitting a BioProject requires a DDBJ Account. Open the
          {" "}
          <TextLink to="/submit">submission navigator</TextLink>
          {" "}
          to see the registration path tailored to the file types you plan to deposit.
        </Callout>
        <section>
          <Heading as="h2" bar className="mb-3">Accession prefix</Heading>
          <p className="text-fs-body text-ink-mid leading-relaxed m-0">
            DDBJ BioProject issues accession numbers prefixed with
            {" "}
            <code className="font-mono text-ink">PRJDB</code>
            . Umbrella BioProjects that bind multiple primary projects share the same prefix and
            are accepted as public submissions only.
          </p>
        </section>
        <section>
          <Heading as="h2" bar className="mb-3">International exchange</Heading>
          <p className="text-fs-body text-ink-mid leading-relaxed m-0">
            Published BioProject metadata is continuously exchanged with EBI and NCBI as members of
            INSDC (International Nucleotide Sequence Database Collaboration). BSI&apos;s
            cross-database search surfaces what is available from DDBJ.
          </p>
        </section>
      </div>
    ),
  },
  meta: {
    lastUpdated: "2026-05-25T00:00:00Z",
    relatedDbs: ["biosample"],
    externalLinks: [
      { label: { ja: "NCBI BioProject", en: "NCBI BioProject" }, href: "https://www.ncbi.nlm.nih.gov/bioproject/" },
      { label: { ja: "EBI BioStudies", en: "EBI BioStudies" }, href: "https://www.ebi.ac.uk/biostudies/" },
      { label: { ja: "DDBJ BioProject 公式ページ", en: "DDBJ BioProject site" }, href: { ja: "https://www.ddbj.nig.ac.jp/bioproject/index.html", en: "https://www.ddbj.nig.ac.jp/bioproject/index-e.html" } },
    ],
  },
} satisfies DatabaseContent
