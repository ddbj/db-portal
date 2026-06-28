export type Resources = {
  common: {
    siteName: string
    loading: string
    error: string
    close: string
    detail: string
    countSuffix: string
    facet: {
      applied: string
      clearAll: string
      clear: string
      removeFilter: string
    }
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
    contents: string
    databases: string
  }
  contents: {
    pageTitle: string
    pageDescription: string
    sidebarHeading: string
    tocHeading: string
    searchPlaceholder: string
    searchNoResults: string
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
      q2Required: string
      q2DisabledReason: string
      kindDisabledReason: string
      kindConflictReason: string
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
        "other": { label: string; sub: string }
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
        conditionSection: string
        hasAnnotation: string
        tpa: string
        smallScale: string
        assemblyForm: string
        target: string
        platform: string
        expressionSource: string
        domain: string
        identifiability: string
      }
      options: {
        expressionMatrix: {
          ngs: { label: string; sub: string }
          nonNgs: { label: string; sub: string }
        }
        sequenceNucleotide: {
          hasAnnotation: { label: string; sub: string }
          genome: { label: string; sub: string }
          magChain: { label: string; sub: string }
          sagChain: { label: string; sub: string }
          haplotype: { label: string; sub: string }
          tpa: { label: string; sub: string }
          smallScale: { label: string; sub: string }
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
        massSpectrometry: {
          metabolomics: { label: string; sub: string }
          proteomics: { label: string; sub: string }
        }
        identifiability: {
          sequenceRead: {
            exclude: { label: string; sub: string }
            include: { label: string; sub: string }
          }
          sequence: {
            exclude: { label: string; sub: string }
            include: { label: string; sub: string }
          }
          variant: {
            exclude: { label: string; sub: string }
            include: { label: string; sub: string }
          }
        }
      }
    }
    flowOverview: {
      fileCount: string
    }
    fileType: {
      "sequence-read": string
      "sequence": string
      "variant": string
      "expression-matrix": string
      "microarray-expression": string
      "spatial-transcriptomics": string
      "metabolomics": string
      "proteome": string
    }
    access: {
      "heading": string
      "open": string
      "restricted": string
      "restrictedPreference": { label: string; sub: string }
      "hasIdentifier": {
        ariaLabel: string
        yes: { label: string; sub: string }
        no: { label: string; sub: string }
      }
      "ethicsCompliance": { label: string; sub: string }
      "publiclyAvailable": { label: string; sub: string }
      "microbialAnalysis": { label: string; sub: string }
      "nonHumanReason": string
      "basisHeading": string
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
      detailLinkLabel: string
      filesHeading: string
      gotchaHeading: string
      account: {
        title: string
        description: string
        register: string
        login: string
      }
      group: {
        companion: { title: string; sub: string }
        restricted: { title: string; sub: string }
        open: { title: string; sub: string }
        destination: { title: string; sub: string }
      }
      accessOverview: {
        mixed: string
        mixedSub: string
        allOpen: string
        allOpenSub: string
        allRestricted: string
        allRestrictedSub: string
        empty: string
        emptySub: string
      }
      "umbrella-bioproject": { title: string; description: string }
      "bioproject": { title: string; description: string }
      "biosample": { title: string; description: string }
      "dra": { title: string; description: string }
      "jga": { title: string; description: string }
      "ddbj": { title: string; description: string }
      "nsss": { title: string; description: string }
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
    ddbj: {
      locusTagPrefix: string
      mss: { intro: string }
      mag: { envGenomeEntry: string; rawReadsToDraRequired: string }
      sag: { misagPackage: string }
      haplotype: { intro: string; stComment: string }
      unannotated: { intro: string }
      tpa: { intro: string; primaryAccessionRequired: string }
      assemblyAnnotation: { intro: string; filenamePairing: string }
      annotation: { intro: string; needsSequencePair: string }
    }
    nsss: {
      intro: string
      specialToMss: string
    }
    variant: {
      jga: { intro: string; policyDelegated: string }
      eva: { nonHuman: string }
    }
    gea: {
      expressionMatrix: { intro: string; ngsRawToDra: string }
      microarray: { intro: string }
      spatial: { intro: string; sequencingRawToDra: string }
      spatialImage: { intro: string; largeImageGeneralist: string }
    }
    expressionDra: { raw: string }
    jga: {
      analysis: { intro: string }
      array: { intro: string }
      dataset: { intro: string }
      policyApplication: string
      nbdcPolicy: string
    }
    metabobank: {
      intro: string
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
    sequenceDra: {
      raw: string
      sagOptional: string
    }
    umbrellaBioproject: { intro: string }
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
      predicateHelp: {
        eq: string
        notEq: string
        contains: string
        notContains: string
        wildcard: string
        notWildcard: string
        between: string
        notBetween: string
      }
      predicateHelpLabel: string
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
        notApplicable: string
        notApplicableReason: string
        exactMatch: string
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
        suppressed: string
        classification: string
      }
    }
    facets: {
      heading: string
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
        package: string
        model: string
        host: string
        strain: string
        isolate: string
        geoLocName: string
        collectionDate: string
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
        synonym: string
        blastName: string
        equivalentName: string
        domain: string
      }
      dateRange: {
        all: string
        oneYear: string
        fiveYears: string
        tenYears: string
        fromLabel: string
        toLabel: string
        specify: string
        fromAriaLabel: string
        toAriaLabel: string
      }
      showMore: string
      showLess: string
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
      retry: string
    }
    scope: {
      all: string
      ddbj: string
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
    facet: {
      applied: "適用中",
      clearAll: "すべて解除",
      clear: "解除",
      removeFilter: "フィルタを解除",
    },
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
    contents: "コンテンツ",
    databases: "データベース",
  },
  contents: {
    pageTitle: "コンテンツ",
    pageDescription: "データベースやポリシーに関するドキュメントを一覧・検索できます。",
    sidebarHeading: "コンテンツ",
    tocHeading: "目次",
    searchPlaceholder: "コンテンツを検索",
    searchNoResults: "該当するコンテンツはありません",
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
    pageDescription: "DDBJ・DBCLS のお知らせ、リリースノート、メンテナンス情報をまとめて確認できます。",
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
      q2Required: "生物ドメインを選択してください",
      q2DisabledReason: "選択した登録種別では、この生物ドメインは登録先を持ちません",
      kindDisabledReason: "選択した登録種別と生物ドメインの組み合わせでは、登録先がありません",
      kindConflictReason: "現在の登録前提では登録先がありません。クリックで選択を解除できます",
      q1: {
        "public": { label: "公開データの登録", sub: "公開を前提としたデータ" },
        "restricted": { label: "制限公開データを含む登録", sub: "アクセス制御を伴うデータを含む" },
        "third-party": { label: "第三者による解析結果の登録", sub: "他者が登録したデータに対する解析結果" },
      },
      q2: {
        "human": { label: "ヒト", sub: "ヒト個体・ヒト由来試料" },
        "eukaryote": { label: "ヒト以外の真核生物", sub: "動植物・菌類など" },
        "prokaryote": { label: "原核生物", sub: "細菌・古細菌" },
        "virus": { label: "ファージ・ウイルス", sub: "ファージ・ウイルス" },
        "metagenome": { label: "環境サンプル", sub: "メタゲノム・環境由来サンプル" },
        "other": { label: "その他", sub: "人工配列・食品由来サンプルなど" },
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
        conditionSection: "登録条件",
        hasAnnotation: "アノテーション",
        tpa: "TPA (Third Party Data)",
        smallScale: "登録規模",
        assemblyForm: "アセンブリ形式",
        target: "対象",
        platform: "プラットフォーム",
        expressionSource: "データの由来",
        domain: "分析ドメイン",
        identifiability: "個人識別性",
      },
      options: {
        expressionMatrix: {
          ngs: { label: "NGS (RNA-seq, ChIP-seq 等)", sub: "生リードは DRA に登録が必要です (DRA + GEA 2 段)" },
          nonNgs: { label: "Non-NGS", sub: "マトリクスを GEA に直接登録します" },
        },
        sequenceNucleotide: {
          hasAnnotation: { label: "アノテーション付き", sub: "CDS, rRNA 等の構造・機能アノテーションを含む" },
          genome: { label: "ゲノム", sub: "WGS, 完成ゲノム, TSA, TLS 等の一般的な配列" },
          magChain: { label: "MAG", sub: "メタゲノムアセンブリゲノム" },
          sagChain: { label: "SAG", sub: "単一増幅ゲノム" },
          haplotype: { label: "ハプロタイプ", sub: "diploid/polyploid assembly の各ハプロタイプを個別に登録" },
          tpa: { label: "TPA (Third Party Data)", sub: "第三者データに基づく配列・アノテーション" },
          smallScale: { label: "少数の短い配列", sub: "配列数が少なく短い（目安: 100 件未満、各 500 kb 未満）" },
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
        massSpectrometry: {
          metabolomics: { label: "メタボロミクス", sub: "代謝物の質量分析" },
          proteomics: { label: "プロテオミクス", sub: "タンパク質の質量分析" },
        },
        identifiability: {
          sequenceRead: {
            exclude: { label: "この種別だけ個人識別符号に該当しない", sub: "RNA-seq・ChIP-seq 等、全ゲノム・全エクソーム以外のリードデータ" },
            include: { label: "この種別だけ個人識別符号に該当する", sub: "RNA-seq として登録するが全ゲノム・全エクソームのリードを含む等" },
          },
          sequence: {
            exclude: { label: "この種別だけ個人識別符号に該当しない", sub: "トランスクリプトアセンブリ等、ゲノム配列以外の塩基配列" },
            include: { label: "この種別だけ個人識別符号に該当する", sub: "全ゲノム配列・全エクソーム配列等を含む塩基配列" },
          },
          variant: {
            exclude: { label: "この種別だけ個人識別符号に該当しない", sub: "集団アリル頻度等、個体レベルの genotype を含まないデータ" },
            include: { label: "この種別だけ個人識別符号に該当する", sub: "個体ごとの genotype を含むバリアントデータ" },
          },
        },
      },
    },
    flowOverview: {
      fileCount: "{{count}} ファイル",
    },
    fileType: {
      "sequence-read": "配列リード",
      "sequence": "塩基配列",
      "variant": "バリアント",
      "expression-matrix": "発現マトリクス",
      "microarray-expression": "マイクロアレイ",
      "spatial-transcriptomics": "空間トランスクリプトーム",
      "metabolomics": "メタボロミクス",
      "proteome": "プロテオーム",
    },
    access: {
      "heading": "公開区分",
      "open": "非制限公開",
      "restricted": "制限公開",
      "restrictedPreference": { label: "制限公開を希望する", sub: "審査により承認を受けた研究者間での共有を希望" },
      "hasIdentifier": {
        ariaLabel: "個人識別符号の有無",
        yes: {
          label: "個人識別符号を含む",
          sub: "全ゲノム配列・全エキソーム配列・全ゲノム SNP データ等",
        },
        no: {
          label: "個人識別符号を含まない",
          sub: "ゲノムレベル個人データを含まないデータ",
        },
      },
      "ethicsCompliance": { label: "法令・倫理指針に沿った研究", sub: "法令や研究倫理指針に沿って実施された研究" },
      "publiclyAvailable": { label: "一般入手可能な試料", sub: "市販・公開リソースなど、広く入手可能な試料を対象とした解析" },
      "microbialAnalysis": { label: "ヒト配列除去済み", sub: "人体から分離した微生物・ウイルスの解析で、個人識別につながるヒト配列を除去" },
      "nonHumanReason": "ヒト以外は常に非制限公開です",
      "basisHeading": "公開条件",
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
      roleTag: { destination: "登録先", companion: "共通メタデータ", external: "外部登録先", gate: "申請窓口" },
      ctaLabel: "登録サイトを開く",
      detailLinkLabel: "詳細を見る",
      filesHeading: "対象ファイル",
      gotchaHeading: "ポイント",
      account: {
        title: "DDBJ アカウントの取得",
        description: "データ登録には DDBJ アカウントが必要です。お持ちでない方はアカウントを作成してください。すでにお持ちの方はログインしてください。",
        register: "アカウントを作成する",
        login: "DDBJ アカウントでログイン",
      },
      group: {
        companion: { title: "プロジェクト・試料の情報", sub: "すべての登録で必要" },
        restricted: { title: "制限公開のデータ", sub: "先に申請が必要" },
        open: { title: "非制限公開のデータ", sub: "申請は不要" },
        destination: { title: "登録先", sub: "データ種別ごと" },
      },
      accessOverview: {
        mixed: "このデータは制限公開と非制限公開の両方を含みます",
        mixedSub: "登録は下の 2 ルートに分かれます。",
        allOpen: "このデータはすべて非制限公開です",
        allOpenSub: "申請は不要です。そのまま登録できます。",
        allRestricted: "このデータはすべて制限公開です",
        allRestrictedSub: "登録前に Policy 申請が必要です。",
        empty: "ファイルを追加すると、データ種別ごとの公開区分が表示されます",
        emptySub: "",
      },
      "umbrella-bioproject": { title: "Umbrella BioProject", description: "各ハプロタイプの BioProject をまとめる Umbrella" },
      "bioproject": { title: "BioProject", description: "プロジェクト全体を束ねるメタデータ" },
      "biosample": { title: "BioSample", description: "サンプルを束ねるメタデータ" },
      "dra": { title: "DRA", description: "配列リード (Run・Analysis) の登録先" },
      "jga": { title: "JGA", description: "制限公開ヒト個人データの登録先" },
      "ddbj": { title: "DDBJ", description: "塩基配列を一括登録する MSS" },
      "nsss": { title: "NSSS", description: "塩基配列の Web 登録システム" },
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
    ddbj: {
      locusTagPrefix: "登録には locus_tag prefix の取得が必要です。",
      mss: {
        intro: "塩基配列は DDBJ (MSS: Mass Submission System) で登録します。",
      },
      mag: {
        envGenomeEntry: "MAG ゲノムは、MSS の ENV (environmental) division のゲノムエントリとして登録します。",
        rawReadsToDraRequired: "MAG の登録には、元の生リードを先に DRA へ登録しておく必要があります。",
      },
      sag: {
        misagPackage: "SAG は MAG とは別の MISAG package で扱います。",
      },
      haplotype: {
        intro: "各ハプロタイプは個別の BioProject で登録します（Principal/Alternate または Haplotype 1/2）。",
        stComment: "Genome-Assembly-Data の ST_COMMENT でハプロタイプの区別（例: Diploid :: Principal haplotype）を記述する必要があります。",
      },
      unannotated: {
        intro: "配列データのみの登録です（DDBJ MSS）。source feature 等の最低限のアノテーションファイルは別途必要です。",
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
    },
    variant: {
      jga: {
        intro: "制限公開のヒト個人データの variant は、JGA の Analysis に登録します。",
        policyDelegated: "JGA の Policy 承認は DBCLS / NBDC に委譲されています。",
      },
      eva: {
        nonHuman: "非ヒトの variant は、EBI の European Variation Archive (EVA) に登録します。短いバリアントも構造バリアントも EVA が受け付けます。",
      },
    },
    gea: {
      expressionMatrix: {
        intro: "発現マトリクスは GEA に登録します。",
        ngsRawToDra: "NGS 由来の生リード (FASTQ/BAM) は、別 entry として DRA に登録してください (DRA + GEA の 2 段)。",
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
      analysis: {
        intro: "制限公開ヒトデータの解析結果を JGA に Analysis として登録します。",
      },
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
      intro: "メタボロミクスデータ (質量分析・NMR・代謝物アサインメント) を MetaboBank に登録します。",
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
      intro: "プロジェクトを束ねる BioProject があわせて作成されます。",
    },
    biosample: {
      intro: "サンプルを束ねる BioSample があわせて作成されます。実サンプル数・生物種は各 step で入力します。",
    },
    spatial: {
      dra: {
        raw: "シーケンス由来 (Visium / Stereo-seq) の生リードは、processed データ (GEA) より先に DRA に登録します (DRA + GEA の 2 段)。",
      },
    },
    expressionDra: {
      raw: "NGS 由来の発現マトリクスでは、生リード (FASTQ/BAM) を processed データ (GEA) より先に DRA に登録します (DRA + GEA の 2 段)。",
    },
    sequenceDra: {
      raw: "MAG / primary / binned のアセンブリでは、元の生リードを DRA に登録する必要があります。",
      sagOptional: "SAG のアセンブリでは、元の生リードの DRA 登録は任意です。",
    },
    umbrellaBioproject: {
      intro: "ハプロタイプ登録では、各ハプロタイプの BioProject をまとめる Umbrella BioProject の作成が必要です。",
    },
    validations: {
      heading: "確認事項が {{count}} 件あります",
      rowReference: "{{index}} 行目",
      "precondition-conflict": "登録前提と矛盾する種別があります。該当の種別をクリックで解除してください",
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
      predicate: {
        eq: "match (=)",
        notEq: "not match (≠)",
        contains: "keyword",
        notContains: "not keyword",
        wildcard: "wildcard (*, ?)",
        notWildcard: "not wildcard (*, ?)",
        between: "in range",
        notBetween: "not in range",
      },
      predicateHelp: {
        eq: "入力した値と完全に一致するレコードを検索します",
        notEq: "入力した値と一致しないレコードを検索します",
        contains: "入力をスペース区切りで単語に分割し、いずれかの単語を含むレコードを検索します",
        notContains: "入力した単語のいずれも含まないレコードを検索します",
        wildcard: "* は任意の文字列、? は任意の1文字に一致します。例: DRA*",
        notWildcard: "パターンに一致しないレコードを検索します",
        between: "指定した範囲内のレコードを検索します",
        notBetween: "指定した範囲外のレコードを検索します",
      },
      predicateHelpLabel: "演算子ヘルプ",
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
        notApplicable: "対象外",
        notApplicableReason: "filter:{{fields}} に未対応",
        exactMatch: "完全一致",
      },
      perDb: {
        hardLimit: "上位 {{limit}} 件まで",
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
        suppressed: "Suppressed",
        classification: "Classification",
      },
    },
    facets: {
      heading: "絞り込み",
      organism: "Organism",
      organismTaxId: "Taxonomy ID",
      submitter: "Submitter",
      studyType: "Study type",
      datePublished: "Date First Published",
      field: {
        organism: "Organism (TaxID)",
        organization: "Organization",
        identifier: "Accession",
        title: "Title",
        description: "Description",
        accessibility: "Accessibility",
        name: "Name",
        publication: "Publication",
        datePublished: "Date First Published",
        dateModified: "Date Last Published",
        dateCreated: "Date Submitted",
        sequenceLength: "Sequence length",
        type: "Record type",
        objectType: "BioProject type",
        relevance: "Relevance",
        projectType: "Project type",
        grantTitle: "Grant title",
        grantAgency: "Grant agency",
        package: "Package",
        model: "Model",
        host: "Host",
        strain: "Strain",
        isolate: "Isolate",
        geoLocName: "Geographic Location",
        collectionDate: "Collection date",
        libraryStrategy: "Library strategy",
        librarySource: "Library source",
        librarySelection: "Library selection",
        platform: "Platform",
        libraryLayout: "Library layout",
        instrumentModel: "Instrument model",
        analysisType: "Analysis type",
        libraryName: "Library name",
        libraryConstructionProtocol: "Library protocol",
        studyType: "Study type",
        datasetType: "Dataset type",
        vendor: "Vendor",
        experimentType: "Experiment type",
        submissionType: "Submission type",
        division: "Division",
        molecularType: "Molecule type",
        featureGeneName: "Gene name",
        referenceJournal: "Journal",
        organismName: "Organism name",
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
        synonym: "Synonym",
        blastName: "BLAST name",
        equivalentName: "Equivalent name",
        domain: "Domain",
      },
      dateRange: {
        all: "すべて",
        oneYear: "1 年",
        fiveYears: "5 年",
        tenYears: "10 年",
        fromLabel: "FROM",
        toLabel: "TO",
        specify: "日付を指定",
        fromAriaLabel: "開始日",
        toAriaLabel: "終了日",
      },
      showMore: "さらに表示",
      showLess: "折りたたむ",
      empty: "絞り込み条件はありません",
    },
    sync: {
      syncing: "URL 同期中",
      synced: "URL 同期済み",
      failed: "URL 同期失敗",
      retry: "再試行",
    },
    assistant: {
      heading: "AI クエリビルダー",
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
      proposalHeading: "AI クエリビルダーの生成結果",
      proposalLabel: "提案",
      proposalDescription: "内容を確認してください",
      apply: "クエリビルダーに追加",
      reset: "やり直す",
      regenerate: "再生成",
      enterMode: "AI クエリビルダー",
      generateShort: "生成",
      modeGroupLabel: "生成モード",
      modeNew: "新規生成",
      modeAppend: "既存に追加",
      applyReplace: "この内容で作成",
      generateError: "クエリの生成に失敗しました。",
      retry: "再試行",
    },
    scope: {
      all: "全データベース",
      ddbj: "DDBJ",
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
      queryPreview: "クエリプレビュー",
      resultsRegion: "検索結果",
      assistantInput: "AI クエリビルダーへの入力",
      assistantStop: "提案の生成を停止",
    },
  },
}
