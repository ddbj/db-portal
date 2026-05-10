export type HomeNewsType = "announcement" | "news"

export interface HomeNewsItem {
  id: string
  type: HomeNewsType
  date: string
  titleJa: string
  titleEn: string
  href: string
}

export const HOME_NEWS_MOCK: readonly HomeNewsItem[] = [
  {
    id: "ann-2026-05-08",
    type: "announcement",
    date: "2026-05-08",
    titleJa: "[復旧] DDBJ Search の一時的なアクセス障害について",
    titleEn: "[Restored] Temporary access issue with DDBJ Search",
    href: "#",
  },
  {
    id: "ann-2026-05-01",
    type: "announcement",
    date: "2026-05-01",
    titleJa: "特許出願に伴う配列表の新規フォーマット ST.26 データの公開のお知らせ",
    titleEn: "Announcement: Public release of ST.26 patent sequence listing data",
    href: "https://www.ddbj.nig.ac.jp/news/ja/2026-05-01.html",
  },
  {
    id: "ann-2026-04-22",
    type: "announcement",
    date: "2026-04-22",
    titleJa: "計画停電に伴う DDBJ サービス停止のお知らせ（5/18 0:00 - 6:00 JST）",
    titleEn: "Scheduled DDBJ service downtime due to planned power outage (May 18, 0:00-6:00 JST)",
    href: "#",
  },
  {
    id: "ann-2026-04-10",
    type: "announcement",
    date: "2026-04-10",
    titleJa: "BioProject / BioSample 登録窓口の URL 変更について",
    titleEn: "URL change for BioProject / BioSample submission portals",
    href: "#",
  },
  {
    id: "ann-2026-03-28",
    type: "announcement",
    date: "2026-03-28",
    titleJa: "DDBJ Account（Keycloak）のパスワードポリシー更新",
    titleEn: "DDBJ Account (Keycloak) password policy update",
    href: "#",
  },
  {
    id: "news-2026-05-11",
    type: "news",
    date: "2026-05-11",
    titleJa: "DDBJ Search API v0.3.1 をリリースしました",
    titleEn: "DDBJ Search API v0.3.1 has been released",
    href: "#",
  },
  {
    id: "news-2026-04-30",
    type: "news",
    date: "2026-04-30",
    titleJa: "DDBJ センターのデータベース登録件数が累計 1,000 万件を突破",
    titleEn: "DDBJ Center reached 10 million cumulative submissions",
    href: "#",
  },
  {
    id: "news-2026-04-15",
    type: "news",
    date: "2026-04-15",
    titleJa: "「ゲノム時代のデータ共有」講習会の参加者募集（6/12 開催）",
    titleEn: "Call for participants: \"Data sharing in the genome era\" workshop (Jun 12)",
    href: "#",
  },
  {
    id: "news-2026-03-19",
    type: "news",
    date: "2026-03-19",
    titleJa: "TXSearch（Taxonomy 検索）に新規 facet を追加しました",
    titleEn: "TXSearch (Taxonomy search) now supports new facets",
    href: "#",
  },
  {
    id: "news-2026-02-27",
    type: "news",
    date: "2026-02-27",
    titleJa: "メタボロミクスデータ（MetaboBank）の公開件数が 1,000 を超えました",
    titleEn: "MetaboBank (metabolomics) public dataset count exceeded 1,000",
    href: "#",
  },
] as const
