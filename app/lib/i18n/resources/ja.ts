export type Resources = {
  common: {
    appName: string
    siteName: string
    loading: string
    error: string
    close: string
    detail: string
  }
  nav: {
    top: string
    search: string
    submit: string
    news: string
  }
  breadcrumb: {
    home: string
    databases: string
  }
  auth: {
    login: string
    logout: string
    loggingIn: string
  }
  switchLang: {
    toEn: string
    toJa: string
  }
  notificationBar: {
    close: string
    important: string
  }
  newsAside: {
    heading: string
    viewAll: string
    empty: string
  }
  translationUnavailable: {
    title: string
    description: string
    switchToJa: string
  }
  footer: {
    orgFullName: string
    orgSubtitle: string
    operatedBy: string
    termsOfUse: string
    privacy: string
    accessibility: string
  }
  a11y: {
    skipToContent: string
    breadcrumbNav: string
    mainNav: string
    languageSwitcher: string
    paginationNav: string
  }
}

export const ja: Resources = {
  common: {
    appName: "DDBJ ポータル",
    siteName: "DDBJ ポータル",
    loading: "読み込み中",
    error: "エラー",
    close: "閉じる",
    detail: "詳細",
  },
  nav: {
    top: "トップ",
    search: "検索",
    submit: "登録",
    news: "ニュース",
  },
  breadcrumb: {
    home: "ホーム",
    databases: "データベース",
  },
  auth: {
    login: "ログイン",
    logout: "ログアウト",
    loggingIn: "認証中…",
  },
  switchLang: {
    toEn: "English",
    toJa: "日本語",
  },
  notificationBar: {
    close: "通知を閉じる",
    important: "重要",
  },
  newsAside: {
    heading: "お知らせ",
    viewAll: "すべて見る",
    empty: "新着のお知らせはありません",
  },
  translationUnavailable: {
    title: "このページの英語訳は未提供です",
    description: "日本語版を表示しています。翻訳の追加を予定しています。",
    switchToJa: "日本語版を表示",
  },
  footer: {
    orgFullName: "DDBJ — Bioinformation and DDBJ Center",
    orgSubtitle: "National Institute of Genetics · ROIS / BSI",
    operatedBy: "運営組織",
    termsOfUse: "利用規約",
    privacy: "プライバシー",
    accessibility: "アクセシビリティ",
  },
  a11y: {
    skipToContent: "メインコンテンツへスキップ",
    breadcrumbNav: "パンくずリスト",
    mainNav: "メインナビゲーション",
    languageSwitcher: "言語切替",
    paginationNav: "ページネーション",
  },
}
