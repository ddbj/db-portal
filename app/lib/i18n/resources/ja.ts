export type Resources = {
  common: {
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
    notificationBar: string
    paginationNav: string
  }
  search: {
    pageTitle: string
    pageSubtitle: string
    searchBoxPlaceholder: string
    syntax: {
      spaceAnd: string
      phrase: string
      advancedHint: string
    }
    examples: {
      label: string
      items: readonly string[]
    }
    builder: {
      heading: string
      countSuffix: string
      empty: {
        label: string
        description: string
      }
      addCondition: string
      addGroup: string
      where: string
      combinator: {
        and: string
        or: string
        not: string
      }
      group: string
      removeCondition: string
      removeGroup: string
      field: {
        organism: string
        identifier: string
        title: string
        description: string
        datePublished: string
        dateModified: string
        dateCreated: string
      }
      op: {
        eq: string
        contains: string
        wildcard: string
        between: string
      }
      rangeFromLabel: string
      rangeToLabel: string
      rangeFromPlaceholder: string
      rangeToPlaceholder: string
      valuePlaceholder: string
    }
    preview: {
      label: string
      copy: string
      copied: string
      edit: string
      clear: string
    }
    actions: {
      submit: string
      clear: string
    }
    results: {
      cross: {
        heading: string
        viewAll: string
        topHits: string
        noTopHits: string
        retry: string
        error: string
        countAria: string
      }
      perDb: {
        hardLimit: string
        totalCount: string
        rangeSummary: string
        empty: string
        error: string
      }
      sort: {
        label: string
        relevance: string
        dateDesc: string
        dateAsc: string
      }
      perPage: {
        label: string
      }
    }
    facets: {
      heading: string
      appliedClearAll: string
      appliedPrefix: string
      organism: string
      submitter: string
      studyType: string
      sampleCount: string
      datePublished: string
      dateRange: {
        all: string
        oneYear: string
        fiveYears: string
        tenYears: string
        fromLabel: string
        toLabel: string
      }
      showMore: string
      clearGroup: string
      empty: string
    }
    sync: {
      syncing: string
      synced: string
      failed: string
      retry: string
    }
    assistant: {
      heading: string
      description: string
      placeholder: string
      examplesLabel: string
      examples: readonly string[]
      generate: string
      generating: string
      proposalLabel: string
      proposalDescription: string
      apply: string
      reset: string
    }
    scope: {
      all: string
      trad: string
      sra: string
      bioproject: string
      biosample: string
      jga: string
      gea: string
      metabobank: string
      taxonomy: string
    }
    descriptions: {
      trad: string
      sra: string
      bioproject: string
      biosample: string
      jga: string
      gea: string
      metabobank: string
      taxonomy: string
    }
    errors: {
      parseFailure: string
      crossSearchFailure: string
      dbSearchFailure: string
      serializeFailure: string
    }
    a11y: {
      input: string
      submit: string
      builderConditions: string
      fieldSelector: string
      opSelector: string
      facetGroup: string
      removeFilter: string
      queryPreview: string
      assistantInput: string
      assistantStop: string
    }
  }
}

export const ja: Resources = {
  common: {
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
    notificationBar: "重要なお知らせ",
    paginationNav: "ページネーション",
  },
  search: {
    pageTitle: "データベース横断検索",
    pageSubtitle: "8 つの DDBJ データベースを横断して検索します。",
    searchBoxPlaceholder: "キーワード、accession、学名で検索",
    syntax: {
      spaceAnd: "スペース = AND 検索",
      phrase: "\"…\" = フレーズ検索",
      advancedHint: "フィールド指定や AND / OR / NOT はクエリビルダーで組み立てます。",
    },
    examples: {
      label: "例",
      items: [
        "cancer",
        "Homo sapiens",
        "organism:\"Mus musculus\"",
        "title:\"single cell\"",
        "date_published:[2022-01-01 TO 2024-12-31]",
        "PRJDB*",
      ],
    },
    builder: {
      heading: "クエリビルダー",
      countSuffix: "件",
      empty: {
        label: "NO CONDITIONS",
        description: "検索条件を追加するとクエリが組み立てられます。",
      },
      addCondition: "+ 条件を追加",
      addGroup: "+ グループを追加",
      where: "WHERE",
      combinator: {
        and: "AND",
        or: "OR",
        not: "NOT",
      },
      group: "グループ",
      removeCondition: "条件を削除",
      removeGroup: "グループを削除",
      field: {
        organism: "生物種 (organism)",
        identifier: "識別子 (identifier)",
        title: "タイトル (title)",
        description: "説明 (description)",
        datePublished: "公開日 (date_published)",
        dateModified: "更新日 (date_modified)",
        dateCreated: "作成日 (date_created)",
      },
      op: {
        eq: "= (完全一致)",
        contains: "を含む",
        wildcard: "ワイルドカード",
        between: "範囲",
      },
      rangeFromLabel: "FROM",
      rangeToLabel: "TO",
      rangeFromPlaceholder: "YYYY-MM-DD",
      rangeToPlaceholder: "YYYY-MM-DD",
      valuePlaceholder: "値を入力",
    },
    preview: {
      label: "クエリプレビュー",
      copy: "コピー",
      copied: "コピーしました",
      edit: "クエリビルダーで編集",
      clear: "クリア",
    },
    actions: {
      submit: "この条件で検索",
      clear: "クリア",
    },
    results: {
      cross: {
        heading: "横断検索結果",
        viewAll: "結果一覧",
        topHits: "上位ヒット",
        noTopHits: "上位ヒットはありません",
        retry: "再試行",
        error: "このデータベースの集計に失敗しました",
        countAria: "ヒット件数",
      },
      perDb: {
        hardLimit: "上位 10,000 件まで表示しています",
        totalCount: "{{total}} 件",
        rangeSummary: "{{total}} 件中 {{start}}-{{end}}",
        empty: "条件に一致する結果がありません",
        error: "検索に失敗しました",
      },
      sort: {
        label: "並び替え",
        relevance: "関連度順",
        dateDesc: "新しい順",
        dateAsc: "古い順",
      },
      perPage: {
        label: "1 ページあたり",
      },
    },
    facets: {
      heading: "絞り込み",
      appliedClearAll: "すべて解除",
      appliedPrefix: "適用中",
      organism: "生物種",
      submitter: "登録機関",
      studyType: "研究タイプ",
      sampleCount: "サンプル数",
      datePublished: "公開日",
      dateRange: {
        all: "すべて",
        oneYear: "1 年",
        fiveYears: "5 年",
        tenYears: "10 年",
        fromLabel: "FROM",
        toLabel: "TO",
      },
      showMore: "+ さらに表示",
      clearGroup: "解除",
      empty: "facet はありません",
    },
    sync: {
      syncing: "URL 同期中",
      synced: "URL 同期済み",
      failed: "URL 同期失敗",
      retry: "再試行",
    },
    assistant: {
      heading: "AI 検索アシスタント",
      description: "自然な日本語で条件を書くと、クエリビルダーへの追加候補を提案します。",
      placeholder: "例: ヒトの 2022 年以降に公開されたがん関連の BioProject",
      examplesLabel: "例",
      examples: [
        "シングルセル RNA-seq のヒト試料",
        "2022 年以降に公開された大腸がん研究",
        "病原性細菌のゲノム配列で公開済みのもの",
      ],
      generate: "提案を生成",
      generating: "生成中…",
      proposalLabel: "提案",
      proposalDescription: "内容を確認してください",
      apply: "クエリビルダーに追加",
      reset: "やり直す",
    },
    scope: {
      all: "全データベース",
      trad: "DDBJ (Trad)",
      sra: "SRA",
      bioproject: "BioProject",
      biosample: "BioSample",
      jga: "JGA",
      gea: "GEA",
      metabobank: "MetaboBank",
      taxonomy: "Taxonomy",
    },
    descriptions: {
      trad: "DDBJ / ENA / GenBank の核酸配列レコード",
      sra: "短鎖シーケンスリードのアーカイブ",
      bioproject: "研究プロジェクトのメタデータ",
      biosample: "生物サンプル単位の属性",
      jga: "ヒト由来制限公開データ",
      gea: "遺伝子発現アーカイブ",
      metabobank: "メタボロームデータの登録",
      taxonomy: "NCBI Taxonomy ベースの分類体系",
    },
    errors: {
      parseFailure: "URL のクエリを解析できませんでした",
      crossSearchFailure: "横断検索に失敗しました",
      dbSearchFailure: "検索に失敗しました",
      serializeFailure: "URL の同期に失敗しました",
    },
    a11y: {
      input: "検索キーワード",
      submit: "検索を実行",
      builderConditions: "クエリビルダーの条件一覧",
      fieldSelector: "検索フィールド",
      opSelector: "演算子",
      facetGroup: "ファセット",
      removeFilter: "フィルタを解除",
      queryPreview: "クエリプレビュー",
      assistantInput: "AI 検索アシスタントへの入力",
      assistantStop: "提案の生成を停止",
    },
  },
}
