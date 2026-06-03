export type Resources = {
  common: {
    siteName: string
    loading: string
    error: string
    close: string
    detail: string
    countSuffix: string
  }
  errors: {
    notFound: {
      title: string
      description: string
      backToTop: string
    }
    generic: {
      title: string
      description: string
      backToTop: string
    }
  }
  nav: {
    search: string
    submit: string
    about: string
  }
  breadcrumb: {
    home: string
    databases: string
  }
  top: {
    hero: {
      advancedLink: string
    }
    serviceGrid: {
      heading: string
    }
    services: {
      heading: string
      viewAll: string
    }
  }
  databases: {
    overviewHeading: string
    relatedHeading: string
    externalLinksHeading: string
    lastUpdatedLabel: string
    notFoundTitle: string
    notFoundDescription: string
    backToTop: string
  }
  db: {
    bioproject: { title: string }
    biosample: { title: string }
  }
  auth: {
    login: string
    logout: string
    loggingIn: string
    callback: {
      title: string
      description: string
      backHome: string
    }
    logoutCallback: {
      title: string
      description: string
      backHome: string
    }
  }
  news: {
    pageTitle: string
    pageDescription: string
    toolbar: {
      count: string
      sort: string
      sortNewest: string
      sortOldest: string
    }
    list: {
      empty: string
      error: string
    }
    facet: {
      heading: string
      source: string
      category: string
      year: string
      yearShowMore: string
      yearCollapse: string
      service: string
    }
    category: {
      announcement: string
      "data-release": string
      maintenance: string
      event: string
      service: string
      other: string
    }
  }
  services: {
    pageTitle: string
    pageDescription: string
    toolbar: {
      count: string
      sort: string
      sortAsc: string
      sortDesc: string
    }
    list: {
      empty: string
      error: string
    }
    facet: {
      heading: string
      source: string
      category: string
    }
    category: {
      repository: string
      search: string
      analysis: string
      annotation: string
      integration: string
      visualization: string
      other: string
    }
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
  a11y: {
    skipToContent: string
    breadcrumbNav: string
    mainNav: string
    languageSwitcher: string
    notificationBar: string
    paginationNav: string
    paginationPrev: string
    paginationNext: string
    paginationJumpToLast: string
  }
  submit: {
    pageTitle: string
    sections: {
      preconditions: string
      table: string
      flow: string
    }
    preconditions: {
      q1Heading: string
      q2Heading: string
      q1Required: string
      q2DisabledReason: string
      kindDisabledReason: string
      q1: {
        "public": { label: string; sub: string }
        "restricted": { label: string; sub: string }
        "third-party": { label: string; sub: string }
      }
      q2: {
        "human": { label: string; sub: string }
        "eukaryote": { label: string; sub: string }
        "prokaryote": { label: string; sub: string }
        "virus": { label: string; sub: string }
        "metagenome": { label: string; sub: string }
      }
    }
    table: {
      detailUnset: string
      empty: string
    }
    detail: {
      heading: string
      empty: string
      pairNeedsFasta: string
      statusReady: string
      formGroupLabels: {
        form: string
        target: string
        platform: string
        domain: string
      }
      options: {
        sequenceNucleotide: {
          standalone: { label: string; sub: string }
          magChain: { label: string; sub: string }
          sagChain: { label: string; sub: string }
        }
        sequenceAnnotation: {
          assemblyPair: { label: string; sub: string }
          standalone: { label: string; sub: string }
        }
        spatialTranscriptomics: {
          visium: { label: string; sub: string }
          xenium: { label: string; sub: string }
          merfish: { label: string; sub: string }
          stereoSeq: { label: string; sub: string }
        }
        spatialImage: {
          visium: { label: string; sub: string }
          merfish: { label: string; sub: string }
        }
        massSpectrometry: {
          metabolomics: { label: string; sub: string }
          proteomics: { label: string; sub: string }
        }
      }
    }
    flowOverview: {
      fileCount: string
    }
    fileType: {
      "sequence-read": { label: string; hint: string }
      "sequence-nucleotide": { label: string; hint: string }
      "sequence-annotation": { label: string; hint: string }
      "variant": { label: string; hint: string }
      "expression-matrix": { label: string; hint: string }
      "microarray-expression": { label: string; hint: string }
      "spatial-transcriptomics": { label: string; hint: string }
      "spatial-image": { label: string; hint: string }
      "mass-spectrometry": { label: string; hint: string }
      "nmr": { label: string; hint: string }
      "metabolite-assignment": { label: string; hint: string }
    }
    access: {
      "heading": string
      "open": string
      "restricted": string
    }
    progress: {
      heading: string
    }
    flow: {
      empty: string
      noteWarning: string
      noteError: string
      prereqHeading: string
      wizardHeading: string
      prepareHeading: string
      roleTag: { destination: string; companion: string; external: string; gate: string }
      ctaLabel: string
      filesHeading: string
      gotchaHeading: string
      "bioproject": { title: string; description: string }
      "biosample": { title: string; description: string }
      "dra": { title: string; description: string }
      "jga": { title: string; description: string }
      "ddbj-trad": { title: string; description: string }
      "nsss": { title: string; description: string }
      "togovar": { title: string; description: string }
      "gea": { title: string; description: string }
      "metabobank": { title: string; description: string }
      "humandbs": { title: string; description: string }
      "jpost": { title: string; description: string }
      "eva": { title: string; description: string }
    }
    origin: {
      tier1: string
      tier2: string
      recipe: string
    }
    sequenceRead: {
      jga: { intro: string; dbclsPolicy: string }
      dra: { intro: string; restrictedNonHumanEmbargo: string }
    }
    ddbjTrad: {
      locusTagPrefix: string
      mag: { envGenomeEntry: string; rawReadsToDraRequired: string }
      sag: { misagPackage: string }
      tpa: { intro: string; primaryAccessionRequired: string }
      assemblyAnnotation: { intro: string; filenamePairing: string }
      annotation: { intro: string; needsSequencePair: string }
    }
    nsss: {
      intro: string
      specialToMss: string
      notForReads: string
    }
    variant: {
      jga: { intro: string; policyDelegated: string }
      togovar: { intro: string }
      eva: { nonHuman: string }
    }
    gea: {
      expressionMatrix: { intro: string }
      microarray: { intro: string }
      spatial: { intro: string; sequencingRawToDra: string }
      spatialImage: { intro: string; largeImageGeneralist: string }
    }
    jga: {
      array: { intro: string }
      dataset: { intro: string }
      policyApplication: string
      nbdcPolicy: string
    }
    metabobank: {
      ms: { intro: string; imagingImageFiles: string }
      nmr: { intro: string }
      maf: { intro: string }
    }
    jpost: {
      proteomics: string
    }
    bioproject: { intro: string }
    biosample: { intro: string }
    spatial: {
      dra: { raw: string }
    }
    validations: {
      heading: string
      rowReference: string
      "precondition-conflict": string
      "no-destination-service": string
      "dangling-group-id": string
    }
    a11y: {
      accessCell: string
      deleteRow: string
      gotoStep: string
    }
  }
  search: {
    pageTitle: string
    searchBoxPlaceholder: string
    syntax: {
      space: string
      comma: string
      phrase: string
      spaceUse: string
      commaUse: string
      phraseUse: string
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
      matchLabel: string
      negateGroup: string
      group: string
      combinator: {
        and: string
        or: string
        not: string
      }
      removeCondition: string
      removeGroup: string
      field: {
        identifier: string
        title: string
        description: string
        organismId: string
        organismName: string
        name: string
        accessibility: string
        datePublished: string
        dateModified: string
        dateCreated: string
        organization: string
        publication: string
        objectType: string
        projectType: string
        relevance: string
        grantTitle: string
        grantAgency: string
        externalLinkLabel: string
        host: string
        strain: string
        isolate: string
        package: string
        model: string
        geoLocName: string
        collectionDate: string
        derivedFromId: string
        libraryStrategy: string
        librarySource: string
        libraryLayout: string
        librarySelection: string
        platform: string
        instrumentModel: string
        libraryName: string
        libraryConstructionProtocol: string
        analysisType: string
        studyType: string
        vendor: string
        datasetType: string
        type: string
        experimentType: string
        submissionType: string
      }
      predicate: {
        eq: string
        notEq: string
        contains: string
        notContains: string
        wildcard: string
        notWildcard: string
        between: string
        notBetween: string
      }
      rangeFromLabel: string
      rangeToLabel: string
      rangeFromPlaceholder: string
      rangeToPlaceholder: string
      valuePlaceholder: string
      freeText: {
        field: string
        scopeLabel: string
        scopeTooltip: string
        placeholder: string
        remove: string
        phrase: string
      }
    }
    preview: {
      label: string
      copy: string
      copied: string
      edit: string
      clear: string
      viewDsl: string
      viewGraph: string
      viewGroupLabel: string
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
      row: {
        controlled: string
        host: string
        geo: string
        lineage: string
      }
    }
    facets: {
      heading: string
      appliedClearAll: string
      appliedPrefix: string
      organism: string
      organismTaxId: string
      submitter: string
      studyType: string
      datePublished: string
      field: {
        organism: string
        organization: string
        identifier: string
        title: string
        description: string
        accessibility: string
        name: string
        publication: string
        datePublished: string
        dateModified: string
        dateCreated: string
        sequenceLength: string
        type: string
        objectType: string
        relevance: string
        projectType: string
        grantTitle: string
        grantAgency: string
        externalLinkLabel: string
        package: string
        model: string
        host: string
        strain: string
        isolate: string
        geoLocName: string
        collectionDate: string
        derivedFromId: string
        libraryStrategy: string
        librarySource: string
        librarySelection: string
        platform: string
        libraryLayout: string
        instrumentModel: string
        analysisType: string
        libraryName: string
        libraryConstructionProtocol: string
        studyType: string
        datasetType: string
        vendor: string
        experimentType: string
        submissionType: string
        division: string
        molecularType: string
        featureGeneName: string
        referenceJournal: string
        organismName: string
        rank: string
        kingdom: string
        lineage: string
        phylum: string
        class: string
        order: string
        family: string
        genus: string
        species: string
        commonName: string
      }
      dateRange: {
        all: string
        oneYear: string
        fiveYears: string
        tenYears: string
        fromLabel: string
        toLabel: string
      }
      showMore: string
      showLess: string
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
      descriptionNew: string
      descriptionAppend: string
      placeholderNew: string
      placeholderAppend: string
      examplesLabel: string
      examplesNew: readonly string[]
      examplesAppend: readonly string[]
      generate: string
      generating: string
      proposalHeading: string
      proposalLabel: string
      proposalDescription: string
      apply: string
      reset: string
      regenerate: string
      enterMode: string
      generateShort: string
      modeGroupLabel: string
      modeNew: string
      modeAppend: string
      applyReplace: string
      generateError: string
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
    errors: {
      parseFailure: string
      crossSearchFailure: string
      dbSearchFailure: string
      querySyntax: string
      keywordInvalid: string
    }
    a11y: {
      input: string
      submit: string
      searching: string
      scope: string
      builderConditions: string
      fieldSelector: string
      predicateSelector: string
      facetGroup: string
      removeFilter: string
      queryPreview: string
      resultsRegion: string
      assistantInput: string
      assistantStop: string
    }
  }
}

export const ja: Resources = {
  common: {
    siteName: "BSI",
    loading: "読み込み中",
    error: "エラー",
    close: "閉じる",
    detail: "詳細",
    countSuffix: "件",
  },
  errors: {
    notFound: {
      title: "ページが見つかりません",
      description: "お探しのページは見つかりませんでした。URL に誤りがないかご確認ください。",
      backToTop: "トップへ戻る",
    },
    generic: {
      title: "エラーが発生しました",
      description: "しばらく時間をおいてから再度お試しください。",
      backToTop: "トップへ戻る",
    },
  },
  nav: {
    search: "検索",
    submit: "登録",
    about: "About us",
  },
  breadcrumb: {
    home: "ホーム",
    databases: "データベース",
  },
  top: {
    hero: {
      advancedLink: "詳細条件で検索",
    },
    serviceGrid: { heading: "サービス" },
    services: { heading: "サービス", viewAll: "すべて見る" },
  },
  databases: {
    overviewHeading: "概要",
    relatedHeading: "関連データベース",
    externalLinksHeading: "外部リンク",
    lastUpdatedLabel: "最終更新",
    notFoundTitle: "データベースが見つかりません",
    notFoundDescription: "指定されたデータベースに対応するページが見つかりませんでした。",
    backToTop: "トップへ戻る",
  },
  db: {
    bioproject: { title: "BioProject" },
    biosample: { title: "BioSample" },
  },
  auth: {
    login: "ログイン",
    logout: "ログアウト",
    loggingIn: "認証中…",
    callback: {
      title: "サインイン処理中",
      description: "認証が完了するまでしばらくお待ちください。",
      backHome: "トップへ戻る",
    },
    logoutCallback: {
      title: "サインアウトしました",
      description: "ご利用ありがとうございました。",
      backHome: "トップへ戻る",
    },
  },
  news: {
    pageTitle: "お知らせ・ニュース",
    pageDescription: "DDBJ センターからのお知らせ、リリースノート、メンテナンス情報をまとめて確認できます。",
    toolbar: {
      count: "全 {{count}} 件",
      sort: "並び順",
      sortNewest: "新しい順",
      sortOldest: "古い順",
    },
    list: {
      empty: "条件に一致するお知らせはありません",
      error: "お知らせの取得に失敗しました",
    },
    facet: {
      heading: "絞り込み",
      source: "ソース",
      category: "種別",
      year: "年",
      yearShowMore: "+ さらに表示",
      yearCollapse: "− 折りたたむ",
      service: "サービス",
    },
    category: {
      announcement: "お知らせ",
      "data-release": "データ公開",
      maintenance: "メンテナンス",
      event: "イベント・募集",
      service: "サービス",
      other: "その他",
    },
  },
  services: {
    pageTitle: "サービス",
    pageDescription: "DDBJ・DBCLS が提供するデータベースやツールを一覧から探せます。",
    toolbar: {
      count: "全 {{count}} 件",
      sort: "並び順",
      sortAsc: "A → Z",
      sortDesc: "Z → A",
    },
    list: {
      empty: "条件に一致するサービスはありません",
      error: "サービス一覧の取得に失敗しました",
    },
    facet: {
      heading: "絞り込み",
      source: "ソース",
      category: "種別",
    },
    category: {
      repository: "登録・公開",
      search: "検索",
      analysis: "解析",
      annotation: "アノテーション",
      integration: "統合・RDF",
      visualization: "可視化・教材",
      other: "その他",
    },
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
  a11y: {
    skipToContent: "メインコンテンツへスキップ",
    breadcrumbNav: "パンくずリスト",
    mainNav: "メインナビゲーション",
    languageSwitcher: "言語切替",
    notificationBar: "重要なお知らせ",
    paginationNav: "ページネーション",
    paginationPrev: "前のページ",
    paginationNext: "次のページ",
    paginationJumpToLast: "{{n}} ページ目へ",
  },
  submit: {
    pageTitle: "登録ナビゲーション",
    sections: {
      preconditions: "登録前提",
      table: "登録データ種別",
      flow: "登録フロー",
    },
    preconditions: {
      q1Heading: "登録種別",
      q2Heading: "生物ドメイン",
      q1Required: "登録種別を選択してください",
      q2DisabledReason: "選択した登録種別では、この生物ドメインは登録先を持ちません",
      kindDisabledReason: "選択した登録種別と生物ドメインの組み合わせでは、登録先がありません",
      q1: {
        "public": { label: "公開データの登録", sub: "公開を前提としたデータ" },
        "restricted": { label: "制限公開データを含む登録", sub: "アクセス制御を伴うデータを含む" },
        "third-party": { label: "第三者による解析結果の登録", sub: "他者が登録したデータに対する解析結果" },
      },
      q2: {
        "human": { label: "ヒト", sub: "ヒト個人由来のデータ" },
        "eukaryote": { label: "ヒト以外の真核生物", sub: "動植物・菌類など" },
        "prokaryote": { label: "原核生物", sub: "細菌・古細菌" },
        "virus": { label: "ファージ・ウイルス", sub: "ファージ・ウイルス" },
        "metagenome": { label: "環境サンプル", sub: "メタゲノム・環境由来サンプル" },
      },
    },
    table: {
      detailUnset: "未設定",
      empty: "上のボタンからデータの種類を選んでください",
    },
    detail: {
      heading: "データ詳細",
      empty: "追加の詳細設定が必要なファイルはありません",
      pairNeedsFasta: "先に FASTA 塩基配列を選んでください",
      statusReady: "設定済み",
      formGroupLabels: {
        form: "データ形態",
        target: "対象",
        platform: "プラットフォーム",
        domain: "分析ドメイン",
      },
      options: {
        sequenceNucleotide: {
          standalone: { label: "単独配列", sub: "アノテーションを伴わない配列" },
          magChain: { label: "MAG", sub: "メタゲノムアセンブリゲノム" },
          sagChain: { label: "SAG", sub: "単一増幅ゲノム" },
        },
        sequenceAnnotation: {
          assemblyPair: { label: "配列ペア", sub: "配列と対になるアノテーション" },
          standalone: { label: "単独アノテーション", sub: "配列ファイルと別に登録" },
        },
        spatialTranscriptomics: {
          visium: { label: "Visium", sub: "10x Visium (Sequencing + DRA 2 段)" },
          xenium: { label: "Xenium", sub: "10x Xenium (Microarray、DRA 不要)" },
          merfish: { label: "MERFISH", sub: "MERFISH (Microarray、DRA 不要)" },
          stereoSeq: { label: "Stereo-seq", sub: "Stereo-seq (Sequencing + DRA 2 段)" },
        },
        spatialImage: {
          visium: { label: "Visium", sub: "Visium の組織画像" },
          merfish: { label: "MERFISH", sub: "MERFISH の大容量画像" },
        },
        massSpectrometry: {
          metabolomics: { label: "メタボロミクス", sub: "代謝物の質量分析" },
          proteomics: { label: "プロテオミクス", sub: "タンパク質の質量分析" },
        },
      },
    },
    flowOverview: {
      fileCount: "{{count}} ファイル",
    },
    fileType: {
      "sequence-read": { label: "配列リード", hint: "シーケンサーが出力した生リード" },
      "sequence-nucleotide": { label: "FASTA 塩基配列", hint: "組み上げ済みの塩基配列" },
      "sequence-annotation": { label: "配列アノテーション", hint: "配列に付与する feature 情報" },
      "variant": { label: "バリアント", hint: "変異・多型の一覧" },
      "expression-matrix": { label: "発現マトリクス", hint: "遺伝子発現の数値マトリクス" },
      "microarray-expression": { label: "マイクロアレイ発現", hint: "マイクロアレイによる発現測定" },
      "spatial-transcriptomics": { label: "空間トランスクリプトーム", hint: "空間座標に対応した発現データ" },
      "spatial-image": { label: "空間画像", hint: "空間トランスクリプトームの組織画像" },
      "mass-spectrometry": { label: "質量分析", hint: "質量分析計の測定データ" },
      "nmr": { label: "NMR", hint: "核磁気共鳴の測定データ" },
      "metabolite-assignment": { label: "代謝物アサインメント", hint: "代謝物の同定結果テーブル" },
    },
    access: {
      "heading": "公開区分",
      "open": "公開",
      "restricted": "制限公開",
    },
    progress: {
      heading: "入力状況",
    },
    flow: {
      empty: "ファイルを追加すると、ここに登録フローが表示されます",
      noteWarning: "注意",
      noteError: "エラー",
      prereqHeading: "先に済ませること",
      wizardHeading: "外部サイトでの手順",
      prepareHeading: "準備するもの",
      roleTag: { destination: "登録先", companion: "随伴", external: "外部登録先", gate: "申請窓口" },
      ctaLabel: "登録サイトを開く",
      filesHeading: "対象ファイル",
      gotchaHeading: "ポイント",
      "bioproject": { title: "BioProject", description: "プロジェクト全体を束ねる随伴メタデータ" },
      "biosample": { title: "BioSample", description: "サンプルを束ねる随伴メタデータ" },
      "dra": { title: "DRA", description: "配列リード (Run・Analysis) の登録先" },
      "jga": { title: "JGA", description: "制限公開ヒト個人データの登録先" },
      "ddbj-trad": { title: "DDBJ", description: "塩基配列を一括登録する MSS" },
      "nsss": { title: "NSSS", description: "塩基配列の Web 登録システム" },
      "togovar": { title: "TogoVar", description: "公開ヒト variant の登録先" },
      "gea": { title: "GEA", description: "遺伝子発現データの登録先" },
      "metabobank": { title: "MetaboBank", description: "メタボロミクスデータの登録先" },
      "humandbs": { title: "NBDC ヒトデータベース", description: "制限公開ヒトデータの利用制限ポリシー申請・承認窓口 (DBCLS 運営)" },
      "jpost": { title: "jPOST", description: "プロテオミクスデータの登録先 (DDBJ 外)" },
      "eva": { title: "EVA", description: "非ヒト variant の登録先 (EBI EVA)" },
    },
    origin: {
      tier1: "ルール由来",
      tier2: "集約由来",
      recipe: "レシピ由来",
    },
    sequenceRead: {
      jga: {
        intro: "制限公開のヒト個人データやヒト関連メタゲノムの配列リードは、JGA に登録します。",
        dbclsPolicy: "JGA への登録には、DBCLS で Policy 承認 (JGAP) を取得する必要があります。",
      },
      dra: {
        intro: "公開データ、または非ヒトの配列リードは DRA に登録します。",
        restrictedNonHumanEmbargo: "非ヒトの制限公開リードは、DRA の公開予定日 (embargo) を設定して非公開期間を扱います。",
      },
    },
    ddbjTrad: {
      locusTagPrefix: "登録には locus_tag prefix の取得が必要です。",
      mag: {
        envGenomeEntry: "MAG ゲノムは、MSS の ENV (environmental) division のゲノムエントリとして登録します。",
        rawReadsToDraRequired: "MAG の登録には、元の生リードを先に DRA へ登録しておく必要があります。",
      },
      sag: {
        misagPackage: "SAG は MAG とは別の MISAG package で扱います。",
      },
      tpa: {
        intro: "第三者 (TPA) の配列・アノテーションは、DDBJ (MSS) で受け付けます。",
        primaryAccessionRequired: "TPA には、引用元となる INSDC accession の指定が必須です。",
      },
      assemblyAnnotation: {
        intro: "配列とアノテーションは、MSS の 1 ファイルペアとして同一 step で登録します。",
        filenamePairing: "配列ファイルとアノテーションファイルは、対応づけて 1 つのペアとして提出します。",
      },
      annotation: {
        intro: "組み上げ済み配列へのアノテーションは、DDBJ (MSS) で登録します。",
        needsSequencePair: "単独のアノテーション行には、対応する配列ファイルのペアが必要です。",
      },
    },
    nsss: {
      intro: "少数・短い塩基配列は、Web 登録システム NSSS (Nucleotide Sequence Submission System) で登録します。",
      specialToMss: "大規模配列・完成ゲノム・WGS / TSA / TLS / EST / HTG / TPA などは NSSS の対象外です。DDBJ (MSS) で登録してください。",
      notForReads: "生リードは塩基配列登録の対象外です。配列リードは DRA に登録してください。",
    },
    variant: {
      jga: {
        intro: "制限公開のヒト個人データの variant は、JGA の Analysis に登録します。",
        policyDelegated: "JGA の Policy 承認は DBCLS / NBDC に委譲されています。",
      },
      togovar: {
        intro: "公開ヒトの variant は TogoVar (TogoVar-repository) に登録します。短いバリアントと構造バリアントは、いずれも TogoVar 内の登録種別で扱います。",
      },
      eva: {
        nonHuman: "非ヒトの variant は、EBI の European Variation Archive (EVA) に登録します。短いバリアントも構造バリアントも EVA が受け付けます。",
      },
    },
    gea: {
      expressionMatrix: {
        intro: "発現マトリクスは GEA に登録します。",
      },
      microarray: {
        intro: "マイクロアレイ発現は、GEA の Experiment として登録します。",
      },
      spatial: {
        intro: "空間トランスクリプトームの発現・空間対応データは GEA に登録します。",
        sequencingRawToDra: "シーケンス由来 (Visium / Stereo-seq) の生リードは、別 entry として DRA に登録してください (DRA + GEA の 2 段)。",
      },
      spatialImage: {
        intro: "空間画像は GEA に登録します。",
        largeImageGeneralist: "MERFISH などの大容量画像は GEA で受け入れられないため、汎用アーカイブの利用を検討してください。",
      },
    },
    jga: {
      array: {
        intro: "制限公開のヒト個人データのアレイは、JGA の Analysis に登録します。",
      },
      dataset: {
        intro: "JGA は、Policy 単位の Dataset でデータを束ねます。",
      },
      policyApplication: "制限公開データの登録には、NBDC ヒトデータベースの申請窓口で Policy 申請が必要です。",
      nbdcPolicy: "NBDC 標準ポリシーを利用できます。独自ポリシーは DBCLS 登録で JGAP を発行します。",
    },
    metabobank: {
      ms: {
        intro: "質量分析データは MetaboBank に登録します。",
        imagingImageFiles: "イメージング質量分析 (imaging MS) の組織切片画像は、本データの追加ファイルとして同梱します。",
      },
      nmr: {
        intro: "NMR データは MetaboBank に登録します。",
      },
      maf: {
        intro: "代謝物アサインメント (MAF) は MetaboBank に登録します。",
      },
    },
    jpost: {
      proteomics: "プロテオミクス (proteomics) の質量分析は、MetaboBank ではなく jPOST に登録します。",
    },
    bioproject: {
      intro: "プロジェクトを束ねる BioProject が随伴して作成されます。",
    },
    biosample: {
      intro: "サンプルを束ねる BioSample が随伴して作成されます。実サンプル数・生物種は各 step で入力します。",
    },
    spatial: {
      dra: {
        raw: "シーケンス由来 (Visium / Stereo-seq) の生リードは、processed データ (GEA) より先に DRA に登録します (DRA + GEA の 2 段)。",
      },
    },
    validations: {
      heading: "確認事項が {{count}} 件あります",
      rowReference: "{{index}} 行目",
      "precondition-conflict": "登録前提と矛盾する種別の行があります",
      "no-destination-service": "この行はどの登録先にも入りません",
      "dangling-group-id": "存在しないグループを参照している行があります",
    },
    a11y: {
      accessCell: "公開区分",
      deleteRow: "行を削除",
      gotoStep: "登録ステップに移動",
    },
  },
  search: {
    pageTitle: "データベース横断検索",
    searchBoxPlaceholder: "キーワード、accession、学名で検索",
    syntax: {
      space: "スペース",
      comma: "カンマ",
      phrase: "\"…\"",
      spaceUse: "AND 検索",
      commaUse: "OR 検索",
      phraseUse: "フレーズ検索",
    },
    examples: {
      label: "例",
      items: [
        "BRCA1",
        "SARS-CoV-2",
        "\"Oryza sativa\"",
        "\"Cyprinus carpio\"",
        "PRJDB10452",
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
      matchLabel: "条件の結合",
      negateGroup: "グループを否定",
      group: "グループ",
      combinator: {
        and: "すべてに一致",
        or: "いずれかに一致",
        not: "除外",
      },
      removeCondition: "条件を削除",
      removeGroup: "グループを削除",
      field: {
        identifier: "識別子",
        title: "タイトル",
        description: "説明",
        organismId: "生物種 ID",
        organismName: "学名",
        name: "名称",
        accessibility: "公開区分",
        datePublished: "公開日",
        dateModified: "更新日",
        dateCreated: "作成日",
        organization: "登録機関",
        publication: "論文",
        objectType: "BioProject type",
        projectType: "Project type",
        relevance: "Relevance",
        grantTitle: "助成課題",
        grantAgency: "助成機関",
        externalLinkLabel: "外部リンク",
        host: "Host",
        strain: "Strain",
        isolate: "Isolate",
        package: "Package",
        model: "Model",
        geoLocName: "Location",
        collectionDate: "Collection date",
        derivedFromId: "Derived from",
        libraryStrategy: "Library strategy",
        librarySource: "Library source",
        libraryLayout: "Library layout",
        librarySelection: "Library selection",
        platform: "Platform",
        instrumentModel: "Instrument model",
        libraryName: "Library name",
        libraryConstructionProtocol: "Library construction protocol",
        analysisType: "Analysis type",
        studyType: "Study type",
        vendor: "Vendor",
        datasetType: "Dataset type",
        type: "Type (subtype)",
        experimentType: "Experiment type",
        submissionType: "Submission type",
      },
      predicate: {
        eq: "と一致",
        notEq: "と一致しない",
        contains: "を含む",
        notContains: "を含まない",
        wildcard: "パターンに一致",
        notWildcard: "パターンに一致しない",
        between: "の期間内",
        notBetween: "の期間外",
      },
      rangeFromLabel: "FROM",
      rangeToLabel: "TO",
      rangeFromPlaceholder: "YYYY-MM-DD",
      rangeToPlaceholder: "YYYY-MM-DD",
      valuePlaceholder: "値を入力",
      freeText: {
        field: "キーワード",
        scopeLabel: "おもな項目を全文検索",
        scopeTooltip: "アクセッション・タイトル・名称・説明・生物種名 を対象に検索します",
        placeholder: "キーワードを入力",
        remove: "キーワードを削除",
        phrase: "フレーズ",
      },
    },
    preview: {
      label: "クエリプレビュー",
      copy: "コピー",
      copied: "コピーしました",
      edit: "クエリビルダーで編集",
      clear: "クリア",
      viewDsl: "DSL",
      viewGraph: "グラフ",
      viewGroupLabel: "プレビュー表示",
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
        retry: "再読み込み",
        error: "一時的に集計できませんでした",
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
      row: {
        controlled: "アクセス制限",
        host: "宿主",
        geo: "地域",
        lineage: "系統",
      },
    },
    facets: {
      heading: "絞り込み",
      appliedClearAll: "すべて解除",
      appliedPrefix: "適用中",
      organism: "生物種",
      organismTaxId: "生物種 ID",
      submitter: "登録機関",
      studyType: "Study type",
      datePublished: "公開日",
      field: {
        organism: "生物種",
        organization: "登録機関",
        identifier: "識別子",
        title: "タイトル",
        description: "説明",
        accessibility: "公開区分",
        name: "名称",
        publication: "論文",
        datePublished: "公開日",
        dateModified: "更新日",
        dateCreated: "作成日",
        sequenceLength: "配列長",
        type: "Subtype",
        objectType: "BioProject type",
        relevance: "Relevance",
        projectType: "Project type",
        grantTitle: "助成課題",
        grantAgency: "助成機関",
        externalLinkLabel: "外部リンク",
        package: "Package",
        model: "Model",
        host: "Host",
        strain: "Strain",
        isolate: "Isolate",
        geoLocName: "Location",
        collectionDate: "Collection date",
        derivedFromId: "Derived from",
        libraryStrategy: "Library strategy",
        librarySource: "Library source",
        librarySelection: "Library selection",
        platform: "Platform",
        libraryLayout: "Library layout",
        instrumentModel: "Instrument model",
        analysisType: "Analysis type",
        libraryName: "Library name",
        libraryConstructionProtocol: "Library construction protocol",
        studyType: "Study type",
        datasetType: "Dataset type",
        vendor: "Vendor",
        experimentType: "Experiment type",
        submissionType: "Submission type",
        division: "Division",
        molecularType: "Molecule type",
        featureGeneName: "Gene name",
        referenceJournal: "Journal",
        organismName: "学名",
        rank: "Rank",
        kingdom: "Kingdom",
        lineage: "Lineage",
        phylum: "Phylum",
        class: "Class",
        order: "Order",
        family: "Family",
        genus: "Genus",
        species: "Species",
        commonName: "Common name",
      },
      dateRange: {
        all: "すべて",
        oneYear: "1 年",
        fiveYears: "5 年",
        tenYears: "10 年",
        fromLabel: "FROM",
        toLabel: "TO",
      },
      showMore: "さらに表示",
      showLess: "折りたたむ",
      clearGroup: "解除",
      empty: "絞り込み条件はありません",
    },
    sync: {
      syncing: "URL 同期中",
      synced: "URL 同期済み",
      failed: "URL 同期失敗",
      retry: "再試行",
    },
    assistant: {
      heading: "AI 検索アシスタント",
      description: "自然文で条件を書くと、クエリビルダーへの追加候補を提案します。",
      descriptionNew: "自然文で書くと、新しいクエリの候補を提案します。",
      descriptionAppend: "自然文で書くと、現在の {{count}} 件に追加する条件を提案します。",
      placeholderNew: "何を探していますか？",
      placeholderAppend: "どう絞り込みますか？",
      examplesLabel: "例",
      examplesNew: [
        "シングルセル RNA-seq のヒト試料",
        "2022 年以降に公開された大腸がん研究",
        "病原性細菌のゲノム配列で公開済みのもの",
      ],
      examplesAppend: [
        "環境サンプルを除く",
        "2022 年以降に公開されたものに限定する",
        "ヒト由来の試料に絞り込む",
      ],
      generate: "提案を生成",
      generating: "生成中…",
      proposalHeading: "AI による生成結果",
      proposalLabel: "提案",
      proposalDescription: "内容を確認してください",
      apply: "クエリビルダーに追加",
      reset: "やり直す",
      regenerate: "再生成",
      enterMode: "AI モード",
      generateShort: "生成",
      modeGroupLabel: "生成モード",
      modeNew: "新規生成",
      modeAppend: "既存に追加",
      applyReplace: "この内容で作成",
      generateError: "クエリの生成に失敗しました。入力を変えて再試行してください。",
    },
    scope: {
      all: "全データベース",
      trad: "DDBJ",
      sra: "SRA",
      bioproject: "BioProject",
      biosample: "BioSample",
      jga: "JGA",
      gea: "GEA",
      metabobank: "MetaboBank",
      taxonomy: "Taxonomy",
    },
    errors: {
      parseFailure: "URL のクエリを解析できませんでした",
      crossSearchFailure: "横断検索に失敗しました",
      dbSearchFailure: "検索に失敗しました",
      querySyntax: "クエリを解析できませんでした。構文を確認してください。",
      keywordInvalid: "キーワードの構文が正しくありません",
    },
    a11y: {
      input: "検索キーワード",
      submit: "検索",
      searching: "検索中…",
      scope: "検索対象データベース",
      builderConditions: "クエリビルダーの条件一覧",
      fieldSelector: "検索フィールド",
      predicateSelector: "条件の演算子",
      facetGroup: "ファセット",
      removeFilter: "フィルタを解除",
      queryPreview: "クエリプレビュー",
      resultsRegion: "検索結果",
      assistantInput: "AI 検索アシスタントへの入力",
      assistantStop: "提案の生成を停止",
    },
  },
}
