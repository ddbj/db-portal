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
      placeholder: string
      submit: string
      examplesLabel: string
      examples: readonly string[]
      advancedLink: string
      a11y: {
        input: string
        scope: string
      }
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
    pageSubtitle: string
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
      caption: string
      headingDescription: string
      columnFileType: string
      columnFilename: string
      columnAccess: string
      columnDetail: string
      columnDelete: string
      filenamePlaceholder: string
      detailUnset: string
      empty: string
    }
    fileType: {
      "sequence-read": { label: string; ext: string; hint: string }
      "sequence-nucleotide": { label: string; ext: string; hint: string }
      "sequence-annotation": { label: string; ext: string; hint: string }
      "variant": { label: string; ext: string; hint: string }
      "expression-matrix": { label: string; ext: string; hint: string }
      "microarray-expression": { label: string; ext: string; hint: string }
      "spatial-transcriptomics": { label: string; ext: string; hint: string }
      "spatial-image": { label: string; ext: string; hint: string }
      "mass-spectrometry": { label: string; ext: string; hint: string }
      "nmr": { label: string; ext: string; hint: string }
      "metabolite-assignment": { label: string; ext: string; hint: string }
    }
    access: {
      "open": string
      "restricted": string
    }
    progress: {
      heading: string
      remaining: string
      complete: string
    }
    flow: {
      empty: string
      accessionLabel: string
      filenameMissing: string
      noteWarning: string
      noteError: string
      "bioproject": { title: string; description: string; cta: string }
      "biosample": { title: string; description: string; cta: string }
      "dra": { title: string; description: string; cta: string }
      "jga": { title: string; description: string; cta: string }
      "ddbj-trad": { title: string; description: string; cta: string }
      "togovar": { title: string; description: string; cta: string }
      "gea": { title: string; description: string; cta: string }
      "metabobank": { title: string; description: string; cta: string }
      "humandbs": { title: string; description: string; cta: string }
      "dbcls": { title: string; description: string; cta: string }
      "jpost": { title: string; description: string; cta: string }
      "eva": { title: string; description: string; cta: string }
      "dgva": { title: string; description: string; cta: string }
    }
    preview: {
      label: string
      footnote: string
      serviceCode: {
        "bioproject": string
        "biosample": string
        "dra": string
        "jga": string
        "ddbj-trad": string
        "togovar": string
        "gea": string
        "metabobank": string
        "humandbs": string
        "dbcls": string
        "jpost": string
        "eva": string
        "dgva": string
      }
      title: {
        "bioproject": string
        "biosample": string
        "dra": string
        "jga": string
        "ddbj-trad": string
        "togovar": string
        "gea": string
        "metabobank": string
        "humandbs": string
        "dbcls": string
        "jpost": string
        "eva": string
        "dgva": string
      }
      body: {
        "bioproject": string
        "biosample": string
        "dra": string
        "jga": string
        "ddbj-trad": string
        "togovar": string
        "gea": string
        "metabobank": string
        "humandbs": string
        "dbcls": string
        "jpost": string
        "eva": string
        "dgva": string
      }
    }
    origin: {
      tier1: string
      tier2: string
      recipe: string
    }
    modal: {
      title: string
      description: string
      save: string
      cancel: string
      statusReady: string
      previewLabel: string
      previewFootnote: string
      formGroupLabels: {
        structure: string
        multiplex: string
        form: string
        annotationPair: string
        provenance: string
        target: string
        reference: string
        platform: string
        domain: string
        method: string
      }
      options: {
        sequenceRead: {
          singleEnd: { label: string; sub: string }
          pairEnd: { label: string; sub: string }
          tenx: { label: string; sub: string }
          pacbio: { label: string; sub: string }
          perSample: { label: string; sub: string }
          multiplex: { label: string; sub: string }
        }
        sequenceNucleotide: {
          standalone: { label: string; sub: string }
          hybrid: { label: string; sub: string }
          magChain: { label: string; sub: string }
          sagChain: { label: string; sub: string }
          annotationPair: { label: string; sub: string }
          firstParty: { label: string; sub: string }
          thirdParty: { label: string; sub: string }
        }
        sequenceAnnotation: {
          assemblyPair: { label: string; sub: string }
          standalone: { label: string; sub: string }
          firstParty: { label: string; sub: string }
          thirdParty: { label: string; sub: string }
        }
        variant: {
          perSample: { label: string; sub: string }
          aggregate: { label: string; sub: string }
          withRef: { label: string; sub: string }
          withoutRef: { label: string; sub: string }
        }
        expressionMatrix: {
          standalone: { label: string; sub: string }
          mageTab: { label: string; sub: string }
        }
        microarray: {
          singleColor: { label: string; sub: string }
          twoColor: { label: string; sub: string }
        }
        spatialTranscriptomics: {
          visium: { label: string; sub: string }
          stereoSeq: { label: string; sub: string }
          merfish: { label: string; sub: string }
        }
        spatialImage: {
          visium: { label: string; sub: string }
          merfish: { label: string; sub: string }
        }
        massSpectrometry: {
          metabolomics: { label: string; sub: string }
          proteomics: { label: string; sub: string }
          standard: { label: string; sub: string }
          imaging: { label: string; sub: string }
        }
        nmr: {
          metabolomics: { label: string; sub: string }
          proteomics: { label: string; sub: string }
        }
        metaboliteAssignment: {
          metabolomics: { label: string; sub: string }
          proteomics: { label: string; sub: string }
        }
      }
      confirmDelete: {
        title: string
        description: string
        confirm: string
        cancel: string
      }
    }
    sequenceRead: {
      jga: { intro: string; dbclsPolicy: string }
      dra: { intro: string; restrictedNonHumanEmbargo: string }
    }
    ddbjTrad: {
      intro: string
      divisionByDataType: string
      notForReads: string
      locusTagPrefix: string
      mag: { envGenomeEntry: string; rawReadsToDraRequired: string }
      sag: { misagPackage: string }
      tpa: { intro: string; primaryAccessionRequired: string }
      assemblyAnnotation: { intro: string; filenamePairing: string }
      annotation: { needsSequencePair: string }
    }
    variant: {
      referenceByName: string
      jga: { intro: string; policyDelegated: string }
      togovar: { intro: string; humanRefOnly: string }
    }
    gea: {
      expressionMatrix: { intro: string }
      microarray: { intro: string }
      spatial: { intro: string }
      spatialImage: { intro: string; largeImageGeneralist: string }
    }
    jga: {
      array: { intro: string }
      dataset: { intro: string }
      policyApplication: string
      nbdcPolicy: string
    }
    metabobank: {
      ms: { intro: string; proteomicsToJpost: string; imagingImageFiles: string }
      nmr: { intro: string }
      maf: { intro: string; proteomicsToJpost: string }
    }
    bioproject: { intro: string }
    biosample: { intro: string }
    multiModal: { warning: string }
    mag: {
      bioproject: { intro: string }
      biosample: { metagenome: string; binned: string; mag: string }
      dra: { run: string; analysis: string }
      ddbjTrad: { envGenome: string }
    }
    sag: {
      bioproject: { intro: string }
      biosample: { misag: string; combined: string }
      dra: { run: string }
      ddbjTrad: { entry: string }
    }
    validations: {
      heading: string
      rowReference: string
      "missing-filename": string
      "precondition-conflict": string
      "no-destination-service": string
      "dangling-group-id": string
    }
    a11y: {
      filenameCell: string
      accessCell: string
      editDetail: string
      deleteRow: string
      modalClose: string
    }
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
        identifier: string
        title: string
        description: string
        organismId: string
        organismName: string
        accessibility: string
        datePublished: string
        dateModified: string
        dateCreated: string
        submitter: string
        publication: string
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
      freeText: {
        field: string
        allFields: string
        placeholder: string
        remove: string
      }
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
      card: {
        sequenceLength: string
        publication: string
        sameAs: string
      }
    }
    facets: {
      heading: string
      appliedClearAll: string
      appliedPrefix: string
      organism: string
      submitter: string
      studyType: string
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
      enterMode: string
      exitMode: string
      modeGroupLabel: string
      modeNew: string
      modeAppend: string
      modeHint: string
      applyReplace: string
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
      querySyntax: string
      querySyntaxHint: string
    }
    a11y: {
      input: string
      submit: string
      scope: string
      builderConditions: string
      fieldSelector: string
      opSelector: string
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
    siteName: "DDBJ 刷新 (仮)",
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
      placeholder: "キーワード、accession、学名で検索",
      submit: "検索",
      examplesLabel: "例",
      examples: ["BRCA1", "SARS-CoV-2", "\"Oryza sativa\"", "\"Cyprinus carpio\"", "PRJDB10452"],
      advancedLink: "クエリビルダーで詳細条件を組む",
      a11y: { input: "検索キーワード", scope: "検索対象データベース" },
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
    notFoundDescription: "指定された slug に対応するコンテンツがありません。",
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
    pageSubtitle: "手元のデータの性質を答えるだけで、どの登録先に何を出すかを導出します",
    sections: {
      preconditions: "登録前提",
      table: "ファイルテーブル",
      flow: "登録フロー",
    },
    preconditions: {
      q1Heading: "登録種別",
      q2Heading: "生物ドメイン",
      q1Required: "登録種別を選択してください",
      q2DisabledReason: "選択した登録種別では、この生物ドメインは登録先を持ちません",
      kindDisabledReason: "選択した登録前提では、この種別の登録先がありません",
      q1: {
        "public": { label: "公開データの登録", sub: "公開を前提としたデータ" },
        "restricted": { label: "制限公開データを含む登録", sub: "アクセス制御を伴うデータを含む" },
        "third-party": { label: "第三者データの解析登録", sub: "他者が登録したデータに対する解析結果" },
      },
      q2: {
        "human": { label: "ヒト", sub: "ヒト個人由来のデータ" },
        "eukaryote": { label: "ヒト以外の真核生物", sub: "動植物・菌類など" },
        "prokaryote": { label: "原核生物", sub: "細菌・古細菌" },
        "virus": { label: "ファージ・ウイルス", sub: "ウイルス・ファージ" },
        "metagenome": { label: "環境サンプル", sub: "メタゲノム・環境由来サンプル" },
      },
    },
    table: {
      caption: "登録するデータファイルの一覧",
      headingDescription: "ファイルの種別と公開区分を行ごとに入力します",
      columnFileType: "ファイル種別",
      columnFilename: "ファイル名",
      columnAccess: "公開区分",
      columnDetail: "データ詳細",
      columnDelete: "削除",
      filenamePlaceholder: "ファイル名を入力",
      detailUnset: "未設定",
      empty: "上のボタンからファイル種別を追加してください",
    },
    fileType: {
      "sequence-read": { label: "配列リード", ext: "FASTQ", hint: "シーケンサーが出力した生リード" },
      "sequence-nucleotide": { label: "FASTA 塩基配列", ext: "FASTA", hint: "組み上げ済みの塩基配列" },
      "sequence-annotation": { label: "配列アノテーション", ext: "GFF", hint: "配列に付与する feature 情報" },
      "variant": { label: "バリアント", ext: "VCF", hint: "変異・多型の一覧" },
      "expression-matrix": { label: "発現マトリクス", ext: "TSV", hint: "遺伝子発現の数値マトリクス" },
      "microarray-expression": { label: "マイクロアレイ発現", ext: "CEL", hint: "マイクロアレイによる発現測定" },
      "spatial-transcriptomics": { label: "空間トランスクリプトーム", ext: "TSV", hint: "空間座標に対応した発現データ" },
      "spatial-image": { label: "空間画像", ext: "TIFF", hint: "空間トランスクリプトームの組織画像" },
      "mass-spectrometry": { label: "質量分析", ext: "mzML", hint: "質量分析計の測定データ" },
      "nmr": { label: "NMR", ext: "nmrML", hint: "核磁気共鳴の測定データ" },
      "metabolite-assignment": { label: "代謝物アサインメント", ext: "TSV", hint: "代謝物の同定結果テーブル" },
    },
    access: {
      "open": "公開",
      "restricted": "制限公開",
    },
    progress: {
      heading: "入力状況",
      remaining: "残り {{count}} 行",
      complete: "すべての行が入力済みです",
    },
    flow: {
      empty: "ファイルを追加すると、ここに登録フローが表示されます",
      accessionLabel: "アクセッション",
      filenameMissing: "ファイル名が未入力です",
      noteWarning: "注意",
      noteError: "エラー",
      "bioproject": { title: "BioProject", description: "プロジェクトを束ねる随伴エントリ", cta: "詳細" },
      "biosample": { title: "BioSample", description: "サンプルを束ねる随伴エントリ", cta: "詳細" },
      "dra": { title: "DRA", description: "配列リード (Run・Analysis) の登録先", cta: "詳細" },
      "jga": { title: "JGA", description: "制限公開ヒト個人データの登録先", cta: "詳細" },
      "ddbj-trad": { title: "DDBJ Trad", description: "塩基配列を一括登録する MSS", cta: "詳細" },
      "togovar": { title: "TogoVar", description: "公開ヒト variant の登録先", cta: "詳細" },
      "gea": { title: "GEA", description: "遺伝子発現データの登録先", cta: "詳細" },
      "metabobank": { title: "MetaboBank", description: "メタボロミクスデータの登録先", cta: "詳細" },
      "humandbs": { title: "humandbs", description: "制限公開ヒトデータの Policy 申請窓口", cta: "申請窓口へ進む" },
      "dbcls": { title: "DBCLS", description: "NBDC ポリシー・JGAP 発行の窓口", cta: "DBCLS へ進む" },
      "jpost": { title: "jPOST", description: "プロテオミクスデータの登録先", cta: "jPOST へ進む" },
      "eva": { title: "EVA", description: "European Variation Archive への誘導", cta: "EVA へ進む" },
      "dgva": { title: "DGVa", description: "構造多型アーカイブへの誘導", cta: "DGVa へ進む" },
    },
    preview: {
      label: "プレビュー",
      footnote: "入力内容から導出した登録フローのプレビューです",
      serviceCode: {
        "bioproject": "BioProject",
        "biosample": "BioSample",
        "dra": "DRA",
        "jga": "JGA",
        "ddbj-trad": "DDBJ Trad",
        "togovar": "TogoVar",
        "gea": "GEA",
        "metabobank": "MetaboBank",
        "humandbs": "humandbs",
        "dbcls": "DBCLS",
        "jpost": "jPOST",
        "eva": "EVA",
        "dgva": "dgVa",
      },
      title: {
        "bioproject": "BioProject",
        "biosample": "BioSample",
        "dra": "DRA",
        "jga": "JGA",
        "ddbj-trad": "DDBJ Trad",
        "togovar": "TogoVar",
        "gea": "GEA",
        "metabobank": "MetaboBank",
        "humandbs": "humandbs",
        "dbcls": "DBCLS",
        "jpost": "jPOST",
        "eva": "EVA",
        "dgva": "DGVa",
      },
      body: {
        "bioproject": "プロジェクト全体を束ねる随伴エントリです",
        "biosample": "サンプルを束ねる随伴エントリです",
        "dra": "配列リードを Run・Analysis として登録します",
        "jga": "制限公開ヒト個人データを Dataset 単位で登録します",
        "ddbj-trad": "塩基配列を MSS で一括登録します",
        "togovar": "公開ヒト variant を登録します",
        "gea": "遺伝子発現データを登録します",
        "metabobank": "メタボロミクスデータを登録します",
        "humandbs": "制限公開ヒトデータの Policy 申請を行います",
        "dbcls": "NBDC ポリシー利用・JGAP 発行の手続きを行います",
        "jpost": "プロテオミクスデータを jPOST に登録します",
        "eva": "variant を EVA に登録します",
        "dgva": "構造多型を DGVa に登録します",
      },
    },
    origin: {
      tier1: "ルール由来",
      tier2: "集約由来",
      recipe: "レシピ由来",
    },
    modal: {
      title: "データ詳細の編集",
      description: "この行のグループ・データ形態・詳細区分を設定します",
      save: "保存",
      cancel: "キャンセル",
      statusReady: "設定済み",
      previewLabel: "プレビュー",
      previewFootnote: "この設定での登録フローのプレビューです",
      formGroupLabels: {
        structure: "構造",
        multiplex: "多重化",
        form: "データ形態",
        annotationPair: "アノテーションのペア",
        provenance: "由来",
        target: "対象",
        reference: "リファレンス",
        platform: "プラットフォーム",
        domain: "分析ドメイン",
        method: "測定手法",
      },
      options: {
        sequenceRead: {
          singleEnd: { label: "シングルエンド", sub: "片方向のリード" },
          pairEnd: { label: "ペアエンド", sub: "両端からのリード" },
          tenx: { label: "10x", sub: "10x Genomics 形式" },
          pacbio: { label: "PacBio", sub: "ロングリード" },
          perSample: { label: "サンプルごと", sub: "サンプル単位のリード" },
          multiplex: { label: "多重化", sub: "複数サンプルを 1 ファイルに多重化" },
        },
        sequenceNucleotide: {
          standalone: { label: "単独配列", sub: "アノテーションを伴わない配列" },
          hybrid: { label: "ハイブリッド", sub: "複数プラットフォームのアセンブリ" },
          magChain: { label: "MAG", sub: "メタゲノムアセンブリゲノム" },
          sagChain: { label: "SAG", sub: "単一増幅ゲノム" },
          annotationPair: { label: "アノテーションペア", sub: "アノテーションと対になる配列" },
          firstParty: { label: "一次登録", sub: "自身が産生した配列" },
          thirdParty: { label: "第三者 (TPA)", sub: "他者データを引用した配列" },
        },
        sequenceAnnotation: {
          assemblyPair: { label: "配列ペア", sub: "配列と対になるアノテーション" },
          standalone: { label: "単独アノテーション", sub: "配列ファイルと別に登録" },
          firstParty: { label: "一次登録", sub: "自身が作成したアノテーション" },
          thirdParty: { label: "第三者 (TPA)", sub: "他者データへのアノテーション" },
        },
        variant: {
          perSample: { label: "サンプルごと", sub: "個別サンプルの variant" },
          aggregate: { label: "集計", sub: "複数サンプルを集計した variant" },
          withRef: { label: "リファレンスあり", sub: "リファレンスを参照する" },
          withoutRef: { label: "リファレンスなし", sub: "リファレンスを参照しない" },
        },
        expressionMatrix: {
          standalone: { label: "単独マトリクス", sub: "発現マトリクスのみ" },
          mageTab: { label: "MAGE-TAB", sub: "MAGE-TAB 形式の一式" },
        },
        microarray: {
          singleColor: { label: "1 色法", sub: "シングルチャネル測定" },
          twoColor: { label: "2 色法", sub: "デュアルチャネル測定" },
        },
        spatialTranscriptomics: {
          visium: { label: "Visium", sub: "10x Visium プラットフォーム" },
          stereoSeq: { label: "Stereo-seq", sub: "Stereo-seq プラットフォーム" },
          merfish: { label: "MERFISH", sub: "MERFISH プラットフォーム" },
        },
        spatialImage: {
          visium: { label: "Visium", sub: "Visium の組織画像" },
          merfish: { label: "MERFISH", sub: "MERFISH の大容量画像" },
        },
        massSpectrometry: {
          metabolomics: { label: "メタボロミクス", sub: "代謝物の質量分析" },
          proteomics: { label: "プロテオミクス", sub: "タンパク質の質量分析" },
          standard: { label: "通常測定", sub: "一般的な質量分析" },
          imaging: { label: "イメージング", sub: "imaging mass spec" },
        },
        nmr: {
          metabolomics: { label: "メタボロミクス", sub: "代謝物の NMR" },
          proteomics: { label: "プロテオミクス", sub: "タンパク質の NMR" },
        },
        metaboliteAssignment: {
          metabolomics: { label: "メタボロミクス", sub: "代謝物の同定結果" },
          proteomics: { label: "プロテオミクス", sub: "タンパク質の同定結果" },
        },
      },
      confirmDelete: {
        title: "行を削除しますか",
        description: "この行とデータ詳細の設定が削除されます",
        confirm: "削除",
        cancel: "キャンセル",
      },
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
      intro: "組み上げ済みの塩基配列は、DDBJ Trad (MSS = Mass Submission System) で一括登録します。",
      divisionByDataType: "MSS では、Division と data type の 2 軸で配列が分類されます。",
      notForReads: "生リードは MSS の対象外です。配列リードは DRA に登録してください。",
      locusTagPrefix: "登録には locus_tag prefix の取得が必要です。",
      mag: {
        envGenomeEntry: "MAG ゲノムは、MSS の ENV (environmental) division のゲノムエントリとして登録します。",
        rawReadsToDraRequired: "MAG の登録には、元の生リードを先に DRA へ登録しておく必要があります。",
      },
      sag: {
        misagPackage: "SAG は MAG とは別の MISAG package で扱います。",
      },
      tpa: {
        intro: "第三者 (TPA) の配列・アノテーションも MSS で受け付けます。",
        primaryAccessionRequired: "TPA には、引用元となる INSDC accession の指定が必須です。",
      },
      assemblyAnnotation: {
        intro: "配列とアノテーションは、MSS の 1 ファイルペアとして同一 step で登録します。",
        filenamePairing: "配列ファイルとアノテーションファイルは、拡張子を除いてファイル名を一致させます。",
      },
      annotation: {
        needsSequencePair: "単独のアノテーション行には、対応する配列ファイルのペアが必要です。",
      },
    },
    variant: {
      referenceByName: "reference は VCF ヘッダで GRCh37/38 などを名前参照するだけで、reference FASTA の別登録は不要です。",
      jga: {
        intro: "制限公開のヒトやヒト関連メタゲノムの variant は、JGA の Analysis に登録します。",
        policyDelegated: "JGA の Policy 承認は DBCLS / NBDC に委譲されています。",
      },
      togovar: {
        intro: "公開ヒトの variant は TogoVar に登録します。",
        humanRefOnly: "TogoVar は GRCh37/38 のヒトゲノム参照に限るため、非ヒトの variant は受理されない可能性があります。",
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
        intro: "空間トランスクリプトームの発現・空間対応データは GEA に登録します。生リードは別 entry として DRA に登録してください。",
      },
      spatialImage: {
        intro: "空間画像は GEA に登録します。",
        largeImageGeneralist: "MERFISH などの大容量画像は、汎用アーカイブの利用も検討してください。",
      },
    },
    jga: {
      array: {
        intro: "制限公開のヒトやヒト関連メタゲノムのアレイデータは、JGA の Analysis に登録します。",
      },
      dataset: {
        intro: "JGA は、Policy 単位の Dataset でデータを束ねます。",
      },
      policyApplication: "制限公開データの登録には、申請窓口 (humandbs) で Policy 申請が必要です。",
      nbdcPolicy: "NBDC 標準ポリシーを利用できます。独自ポリシーは DBCLS 登録で JGAP を発行します。",
    },
    metabobank: {
      ms: {
        intro: "質量分析データは MetaboBank に登録します。",
        proteomicsToJpost: "プロテオミクスは MetaboBank の対象外です。jPOST に登録してください。",
        imagingImageFiles: "imaging mass spec の組織切片画像は、本データの追加ファイルとして同梱します。",
      },
      nmr: {
        intro: "NMR データは MetaboBank に登録します。",
      },
      maf: {
        intro: "代謝物アサインメント (MAF) は MetaboBank に登録します。",
        proteomicsToJpost: "プロテオミクスの同定結果は jPOST に登録してください。",
      },
    },
    bioproject: {
      intro: "プロジェクトを束ねる BioProject が随伴して作成されます。",
    },
    biosample: {
      intro: "サンプルを束ねる BioSample が随伴して作成されます。実サンプル数・生物種は各 step で入力します。",
    },
    multiModal: {
      warning: "1 つのファイルグループに複数の種別が混在しています。",
    },
    mag: {
      bioproject: {
        intro: "MAG の全段が、共通の BioProject (type=Metagenome) を参照します。",
      },
      biosample: {
        metagenome: "元のメタゲノムサンプルの BioSample です。",
        binned: "Binned サンプルは、メタゲノムサンプルから derived_from で派生します。",
        mag: "MAG サンプルは、メタゲノムサンプルから derived_from で派生します。",
      },
      dra: {
        run: "生リードを DRA Run として登録します。",
        analysis: "プライマリ・Binned アセンブリを、DRA Analysis (De Novo Assembly) として登録します。",
      },
      ddbjTrad: {
        envGenome: "MAG ゲノムを、MSS の ENV division のゲノムエントリとして登録します。",
      },
    },
    sag: {
      bioproject: {
        intro: "SAG を束ねる共通の BioProject です。",
      },
      biosample: {
        misag: "一細胞の SAG サンプルを、MISAG package で登録します (実生物種名を用います)。",
        combined: "複数細胞のときは、個別 SAG を derived_from で束ねる結合 SAG サンプルです。",
      },
      dra: {
        run: "SAG の生リードを、任意で DRA Run として登録します。",
      },
      ddbjTrad: {
        entry: "SAG 配列を、MSS の data type=SAG のエントリとして登録します。",
      },
    },
    validations: {
      heading: "確認事項が {{count}} 件あります",
      rowReference: "{{index}} 行目",
      "missing-filename": "ファイル名が入力されていません",
      "precondition-conflict": "登録前提と矛盾する種別の行があります",
      "no-destination-service": "この行はどの登録先にも入りません",
      "dangling-group-id": "存在しないグループを参照している行があります",
    },
    a11y: {
      filenameCell: "ファイル名",
      accessCell: "公開区分",
      editDetail: "データ詳細を編集",
      deleteRow: "行を削除",
      modalClose: "閉じる",
    },
  },
  search: {
    pageTitle: "データベース横断検索",
    pageSubtitle: "キーワードでも、AI への自然文でも。入力はすべて下のクエリビルダーに集約され、その内容で検索します。",
    searchBoxPlaceholder: "キーワード、accession、学名で検索",
    syntax: {
      spaceAnd: "スペース = AND 検索",
      phrase: "\"…\" = フレーズ検索",
      advancedHint: "検索すると下のクエリビルダーに 1 行追加され、双方向に同期します。",
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
        identifier: "識別子 (identifier)",
        title: "タイトル (title)",
        description: "説明 (description)",
        organismId: "生物種 ID (organism_id)",
        organismName: "学名 (organism_name)",
        accessibility: "公開区分 (accessibility)",
        datePublished: "公開日 (date_published)",
        dateModified: "更新日 (date_modified)",
        dateCreated: "作成日 (date_created)",
        submitter: "登録機関 (submitter)",
        publication: "論文 (publication)",
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
      freeText: {
        field: "keyword",
        allFields: "全フィールド",
        placeholder: "キーワードを入力",
        remove: "キーワードを削除",
      },
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
      card: {
        sequenceLength: "塩基数",
        publication: "論文",
        sameAs: "関連 ID",
      },
    },
    facets: {
      heading: "絞り込み",
      appliedClearAll: "すべて解除",
      appliedPrefix: "適用中",
      organism: "生物種",
      submitter: "登録機関",
      studyType: "研究タイプ",
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
      enterMode: "AI モード",
      exitMode: "AI モードを終了",
      modeGroupLabel: "生成モード",
      modeNew: "新規生成",
      modeAppend: "既存に追加",
      modeHint: "現在のビルダー {{count}} 件を考慮します",
      applyReplace: "この内容で置き換える",
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
      querySyntax: "クエリを解析できませんでした。構文を確認して再度お試しください。",
      querySyntaxHint: "スペース = AND (すべての語)、カンマ = OR (いずれかの語)、\"…\" = フレーズ、field:value でフィールド検索 (例: organism_name:\"Homo sapiens\")。",
    },
    a11y: {
      input: "検索キーワード",
      submit: "検索を実行",
      scope: "検索対象データベース",
      builderConditions: "クエリビルダーの条件一覧",
      fieldSelector: "検索フィールド",
      opSelector: "演算子",
      facetGroup: "ファセット",
      removeFilter: "フィルタを解除",
      queryPreview: "クエリプレビュー",
      resultsRegion: "検索結果",
      assistantInput: "AI 検索アシスタントへの入力",
      assistantStop: "提案の生成を停止",
    },
  },
}
