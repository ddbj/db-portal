export type Resources = {
  common: {
    appName: string
    loading: string
    error: string
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
  switchLang: {
    toEn: string
    toJa: string
  }
  translationUnavailable: {
    title: string
    description: string
  }
}

export const ja: Resources = {
  common: {
    appName: "DDBJ ポータル",
    loading: "読み込み中",
    error: "エラー",
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
  switchLang: {
    toEn: "Switch to English",
    toJa: "日本語",
  },
  translationUnavailable: {
    title: "このページの英語訳は未提供です",
    description: "日本語版を表示しています。翻訳の追加を予定しています。",
  },
}
