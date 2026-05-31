import type { Service } from "~/schemas/submit"

// 登録フロー詳細カードの service 別文言 (外部ウィザードの予告)。
// DDBJ 公式の登録手順 (ddbj/www の submission*.md / web-submission*.md) を根拠とする。
// 文言の更新は本モジュールと i18n の汎用ラベルだけで完結する (docs/submit.md「SSOT とデータ管理」)。
// Record<Service, CardCopy> が全 service の網羅を型で固定する。
export type CardCopy = {
  wizardSteps: { ja: readonly string[]; en: readonly string[] }
  prepare: { ja: readonly string[]; en: readonly string[] }
  gotcha?: { ja: string; en: string }
  issuedNote?: { ja: string; en: string }
}

export const SUBMIT_CARDS: Readonly<Record<Service, CardCopy>> = {
  "humandbs": {
    wizardSteps: {
      ja: [
        "DDBJ アカウント作成（未取得の場合）",
        "DBCLS 申請システムにログイン、データ提供申請グループを選択または作成",
        "NBDC 標準ポリシーまたは独自ポリシー（JGAP申請）を選択・申請",
        "DBCLS による審査・承認を待機（数日～数週間）",
        "承認後、JGAP 番号を確認して JGA 登録へ進む",
      ],
      en: [
        "Create or verify your DDBJ account",
        "Log in to DBCLS application system; select or create a data submission group",
        "Choose between NBDC standard Policy or apply for custom Policy (JGAP)",
        "Wait for DBCLS review and approval (typically several days to weeks)",
        "Confirm your JGAP accession number and proceed to JGA submission",
      ],
    },
    prepare: {
      ja: [
        "DDBJ アカウント（メールアドレス確認可能な状態）",
        "データの研究目的・利用制限対象者の説明（日本語）",
        "NBDC 標準ポリシーで対応可か、独自ポリシー（JGAP）申請が必要かの判断",
      ],
      en: [
        "DDBJ account (verified email address required)",
        "Description of research purpose and restriction scope for data use",
        "Assessment: does NBDC standard Policy apply, or do you need custom Policy (JGAP)?",
      ],
    },
    gotcha: { ja: "ポリシー承認には数日〜数週間かかることがあり、承認されるまで JGA への登録は始められません。", en: "Policy approval can take several days to weeks, and JGA submission cannot begin until it is granted." },
    issuedNote: { ja: "ポリシー承認時に Policy ID (JGAP######) が発行され、JGA Dataset から参照します (論文引用 ID ではありません)。", en: "Policy approval issues a Policy ID (JGAP######) referenced by your JGA Dataset (not a citation ID)." },
  },
  "bioproject": {
    wizardSteps: {
      ja: [
        "DDBJ アカウント作成（未取得の場合）",
        "D-way にログインして BioProject メニューを選択し、「New submission」で新規登録を作成",
        "左タブから順にプロジェクト情報を入力：タイトル・説明・登録者・研究費情報等（全て英語）",
        "「OVERVIEW」タブで内容を確認後、「Submit」で登録実行",
        "PRJDB で始まるアクセッション番号を自動取得し、以降の DRA・BioSample 等の登録で引用",
      ],
      en: [
        "Create a DDBJ account if you do not have one already",
        "Log in to D-way, navigate to BioProject, and click [New submission] to create a new registration",
        "Enter project metadata in sequence through the left-side tabs: title, description, submitter information, and funding details (all in English)",
        "Review your entries in the [OVERVIEW] tab and click [Submit] to register the project",
        "Receive a PRJDB accession number automatically, which you will cite in subsequent DRA, BioSample, and other data submissions",
      ],
    },
    prepare: {
      ja: [
        "プロジェクトの英語タイトル（データの主題を簡潔に表現、100文字程度）",
        "プロジェクト説明文（100文字以上の英文。研究対象・目的・期待される成果を第三者が理解できる量）",
        "登録者情報：氏名（姓名）・メールアドレス・所属機関・機関URL",
      ],
      en: [
        "Project title in English: a concise statement of your research project's scope and focus (approximately 100 characters)",
        "Project description in English: a paragraph of at least 100 characters explaining the research objectives, target organisms or samples, and expected outcomes in terms understandable to a third party",
        "Submitter information: full name, email address, institutional affiliation, and institution URL",
      ],
    },
    gotcha: { ja: "公開設定は「即日公開」か「データと同時公開」の 2 択で、単独の非公開設定はできません (非公開期間が必要なら「データと同時」を選びます)。", en: "Release is either immediate or tied to the linked data; there is no private-only option (choose the linked option if you need an embargo period)." },
    issuedNote: { ja: "登録すると BioProject ID (PRJDB######) が発行されます。論文引用に使います。", en: "Registration issues a BioProject ID (PRJDB######), used for publication citation." },
  },
  "biosample": {
    wizardSteps: {
      ja: [
        "D-wayにログインし、BioSampleメニューから[New submission]を選択してサンプルパッケージ（Microbe/Model organism/Plantなど）を決定",
        "パッケージ別テンプレートをダウンロードし、表計算ソフトで各サンプルの属性値（生物種・採取場所・採取日時など）を記入",
        "属性ファイルをアップロードしバリデーション実施；エラー・警告を修正し再アップロード",
        "[OVERVIEW]タブで内容を確認後、投稿（Submit）実行",
      ],
      en: [
        "Log in to D-way, navigate to BioSample menu, click [New submission], and select a sample package (Microbe, Model organism, Plant, etc.)",
        "Download the package template and fill sample attributes (organism, collection date, location, phenotype, etc.) in a spreadsheet",
        "Upload the attribute file and run validation; fix any errors or warnings and resubmit",
        "Review content in the [OVERVIEW] tab and click Submit to finalize",
      ],
    },
    prepare: {
      ja: [
        "DDBJアカウント（未作成なら https://accounts.ddbj.nig.ac.jp で先に作成）",
        "サンプルの基本情報：生物種の学名（NCBI Taxonomyに準拠）、採取場所と採取日時、サンプルの説明",
      ],
      en: [
        "DDBJ account (create at https://accounts.ddbj.nig.ac.jp if needed)",
        "Sample details: scientific name (per NCBI Taxonomy), collection location and date, sample description",
      ],
    },
    gotcha: { ja: "1 回の登録で扱えるサンプルは最大 1,000 件で、すべて同じパッケージに統一する必要があります。", en: "A single submission allows up to 1,000 samples, all of which must use the same package." },
    issuedNote: { ja: "登録すると BioSample ID (SAMD########) が発行されます。論文引用に使います。", en: "Registration issues a BioSample ID (SAMD########), used for publication citation." },
  },
  "dra": {
    wizardSteps: {
      ja: [
        "DDBJ アカウント作成・公開鍵登録",
        "ファイル受付サーバにシーケンスファイルをアップロード",
        "BioProject・BioSample を選択または新規登録してメタデータを入力 (Submission・Experiment・Run)",
        "メタデータとファイルを検証・DDBJ スタッフの査定を待機",
        "アクセッション番号 (DRR/DRX/DRZ) が発行されて登録完了",
      ],
      en: [
        "Create a DDBJ account and register your public key",
        "Upload sequence data files to the file transfer server",
        "Select or create a new BioProject and BioSample, then enter metadata (Submission, Experiment, Run)",
        "Validate metadata and data files, then await DDBJ staff review",
        "Receive accession numbers (DRR/DRX/DRZ) upon completion",
      ],
    },
    prepare: {
      ja: [
        "シーケンスデータファイル (FASTQ / SRA 形式)、サンプルの生物学的情報 (生物種・採取源・表現型など)",
        "実験メタデータ (シーケンシング機器・ライブラリー種別・insert size など)、MD5 チェックサム値 (アップロード前に計算)",
      ],
      en: [
        "Sequence data files (FASTQ / SRA format), biological sample information (organism, source, phenotype, etc.)",
        "Experiment metadata (sequencing instrument, library type, insert size, etc.), MD5 checksum values (calculated before upload)",
      ],
    },
    gotcha: { ja: "DRA は制限公開に対応しません。ヒトの制限公開データは JGA へ、非ヒトは公開予定日 (embargo) で非公開期間を設定します。", en: "DRA does not support restricted access: send restricted human data to JGA, or set an embargo date for non-human data." },
    issuedNote: { ja: "登録すると DRA アクセッション番号 (DRR = Run、DRX = Experiment、DRZ = Analysis) が発行されます。論文引用に使います。", en: "Registration issues DRA accession numbers (DRR = Run, DRX = Experiment, DRZ = Analysis), used for publication citation." },
  },
  "jga": {
    wizardSteps: {
      ja: [
        "DDBJ アカウント作成 (未取得時)、公開鍵・秘密鍵ペアの生成と登録",
        "DBCLS で Policy 承認を申請 (NBDC 標準ポリシー使用時は最小限、独自ポリシーは登録要)",
        "DBCLS 承認後、SFTP で登録用ディレクトリにメタデータ Excel・データファイルをアップロード",
        "DDBJ キュレータが検証 → アクセッション番号 (JGAS/JGAN/JGAX 等) 発行",
      ],
      en: [
        "Create DDBJ account (if needed), generate and register public/private key pair for data transfer",
        "Apply for DBCLS Policy approval (use standard NBDC policy or register custom policy)",
        "After DBCLS approval, upload metadata Excel and data files to submission directory via SFTP (port 443)",
        "DDBJ curators validate submission and issue accession numbers (JGAS/JGAN/JGAX, etc.)",
      ],
    },
    prepare: {
      ja: [
        "DBCLS での Policy 承認: NBDC 標準ポリシーで対応できるか、独自ポリシー登録が必要か判定。承認待ちは数日〜数週間を要する",
        "メタデータの基本項目: 論文タイトル・著者・要旨 (Study)、サンプル情報と表現型データ (Sample)、実験プロトコール・シークエンサ機器 (Experiment)、ファイルと実験の対応 (Data/Analysis)、Policy 単位でのデータセット管理 (Dataset)",
        "データファイル形式: BAM (unaligned を含む推奨)、fastq (gzip/bzip2 圧縮)、VCF (バリアント)、マイクロアレイデータ、メタボローミクス、プロテオミクス。ファイル名に空白を含めない",
        "メタデータ Excel テンプレートと記入例: https://docs.google.com/spreadsheets/d/1HHlxItj89fQv2oWUNBIHZ4VVGwbcC09WGD5tEiXAQZ4/edit",
      ],
      en: [
        "DBCLS Policy approval: Determine whether standard NBDC policy applies or custom policy registration is required. Approval process takes days to weeks",
        "Metadata essentials: paper title, authors, abstract (Study); sample information and phenotypes (Sample); experimental protocol and sequencing platform (Experiment); file-to-experiment relationships (Data/Analysis); policy-based dataset organization (Dataset)",
        "Data file formats: BAM (unaligned reads preferred), fastq (gzip/bzip2 compressed), VCF (variants), microarray data, metabolomics, proteomics. File names must not contain spaces",
        "Metadata Excel template and example submission: https://docs.google.com/spreadsheets/d/1HHlxItj89fQv2oWUNBIHZ4VVGwbcC09WGD5tEiXAQZ4/edit",
      ],
    },
    gotcha: { ja: "データのアップロードは Policy 承認後にのみ可能で、承認には数日〜数週間かかることがあります。", en: "You can upload data only after Policy approval, which can take several days to weeks." },
    issuedNote: { ja: "登録すると Dataset ID (JGAD######) を含む各種アクセッションが発行されます。論文には Dataset ID を使います。", en: "Registration issues several accessions including a Dataset ID (JGAD######); cite the Dataset ID in publications." },
  },
  "ddbj-trad": {
    wizardSteps: {
      ja: [
        "DDBJ アカウント作成 & 登録ファイル準備：配列 FASTA ファイルとアノテーション TSV ファイルを作成し、UME/Parser/transChecker でチェック実行",
        "BioProject/BioSample ID 取得 & MSS フォーム記入：D-way で事前に BioProject/BioSample ID を取得してから MSS フォームにログインし、メタデータを記入してファイルをアップロード",
        "DDBJ キュレータによる査定・修正対応：キュレータがファイルを査定し、メールで修正依頼や質問が来た場合は対応",
        "アクセッション番号取得 & データ公開：修正完了後、キュレータメールでアクセッション番号を通知。即公開または指定日に自動公開",
      ],
      en: [
        "Create DDBJ account and prepare submission files: Create FASTA sequence and TSV annotation files, then validate with UME, Parser, or transChecker tools",
        "Obtain BioProject/BioSample IDs and apply via MSS form: Register BioProject and BioSample IDs at D-way, then log in to MSS, fill metadata, and upload files",
        "DDBJ curator review and revisions: Curators assess your files and send revision requests or inquiries via email; address feedback as needed",
        "Receive accession numbers and release data: After revisions, curators notify you of accession numbers by email. Data releases immediately or on your specified date",
      ],
    },
    prepare: {
      ja: [
        "配列 FASTA ファイル (エントリ名 24 文字以内、マルチエントリ対応)",
        "アノテーション TSV ファイル (登録者・Reference・Biological feature/Qualifier 記載、DDBJ 指定形式)",
        "BioProject ID と BioSample ID (事前取得必須；アノテーション有の場合は locus_tag prefix も予約必須)",
        "チェックツール実行済み (UME で配列・アノテーション形式確認、CDS あれば transChecker で翻訳確認)",
      ],
      en: [
        "FASTA sequence file (entry names ≤24 characters, multiple entries supported)",
        "TSV annotation file (includes submitter info, reference, biological features/qualifiers in DDBJ format)",
        "BioProject ID and BioSample ID (must obtain in advance; reserve locus_tag prefix if annotated)",
        "File validation completed (UME checks syntax and format; transChecker validates CDS amino acid translation if present)",
      ],
    },
    gotcha: { ja: "登録ファイル (配列・アノテーション) を自分で作成する必要があり、査定で修正のメール往復が複数回に及ぶことがあります。", en: "You build the submission files (sequence and annotation) yourself, and curator review often involves several rounds of email corrections." },
    issuedNote: { ja: "登録すると 配列アクセッション番号 (AP###### 等) が発行されます。論文引用に使います (申込時の受付番号とは別物です)。", en: "Registration issues sequence accession numbers (e.g., AP######), used for publication citation (distinct from the application receipt ID)." },
  },
  "nsss": {
    wizardSteps: {
      ja: [
        "コンタクト情報と公開予定日を入力",
        "登録者情報・論文情報・生物学名を入力",
        "配列ファイルとアノテーションをアップロード・記入",
        "メタデータを確認し、DDBJ の査定を受け、アクセッション番号を取得",
      ],
      en: [
        "Enter contact information and publication hold date",
        "Enter submitter details, reference information, and organism name",
        "Upload sequence file and enter annotation details",
        "Confirm metadata; DDBJ curators review and assign accession numbers",
      ],
    },
    prepare: {
      ja: [
        "塩基配列ファイル (FASTA形式、500 kb 以下)",
        "アノテーション情報 (機能領域・遺伝子情報)",
        "論文情報 (著者・タイトル)",
        "生物学名・サンプル説明",
      ],
      en: [
        "Nucleotide sequence file in FASTA format (≤500 kb)",
        "Annotation details (gene features and functions)",
        "Reference information (authors and title)",
        "Organism name and sample description",
      ],
    },
    gotcha: { ja: "小規模・非完成の配列が対象です。EST/TSA/WGS や完成ゲノム、配列数 100 超などは MSS に回されます。", en: "Intended for small, non-complete sequences; EST/TSA/WGS, complete genomes, or more than 100 sequences are routed to MSS instead." },
    issuedNote: { ja: "登録すると 配列アクセッション番号 (AB 型) が発行されます。論文引用に使います。", en: "Registration issues sequence accession numbers (AB-style), used for publication citation." },
  },
  "togovar": {
    wizardSteps: {
      ja: [
        "DDBJ アカウント作成と SSH 公開鍵登録",
        "TogoVar 登録申し込みフォーム送付",
        "BioProject と BioSample を別途登録",
        "メタデータ (Excel テンプレート v1.4 以降) と VCF ファイル (dbSNP/dbVar 形式) を準備",
        "SFTP でメタデータと VCF をアップロード",
      ],
      en: [
        "Create a DDBJ account and register your public key for SSH access",
        "Submit the TogoVar-repository application form",
        "Register BioProject and BioSample separately",
        "Prepare metadata (Excel template v1.4+) and VCF files (dbSNP/dbVar format)",
        "Upload metadata and VCF files via SFTP",
      ],
    },
    prepare: {
      ja: [
        "DDBJ アカウント (https://accounts.ddbj.nig.ac.jp) と SSH 公開鍵・秘密鍵ペア",
        "TogoVar-repository 登録 Excel テンプレート v1.4 以降 (公式リポジトリから入手)",
        "VCF ファイル: 短いバリアントは dbSNP 形式、構造バリアントは dbVar 形式に準拠",
        "BioProject アクセッション (PRJDB) と BioSample アクセッション (SAMD) リスト",
      ],
      en: [
        "DDBJ account (https://accounts.ddbj.nig.ac.jp) and SSH key pair (public and private keys)",
        "TogoVar-repository Excel template v1.4 or later (download from official repository)",
        "VCF files: short variants in dbSNP format; large structural variants in dbVar format",
        "BioProject accession (PRJDB) and BioSample accession (SAMD) numbers",
      ],
    },
    gotcha: { ja: "ヒト由来データでは、個人を特定できる情報をメタデータから必ず除去してください。", en: "For human-derived data, you must remove any personally identifiable information from the metadata." },
    issuedNote: { ja: "登録すると 研究 ID (dstd######) が発行されます。論文引用に使います。", en: "Registration issues a study ID (dstd######), used for publication citation." },
  },
  "gea": {
    wizardSteps: {
      ja: [
        "D-way にログイン、GEA 登録ウィザードを開始",
        "データ種別 (Microarray/Sequencing) を選択、IDF/SDRF メタデータを入力",
        "生データ・解析済みデータを ftp-private.ddbj.nig.ac.jp にアップロード",
        "メタデータ検証・キュレータ査定を経てアクセッション番号発行",
      ],
      en: [
        "Log in to D-way and start GEA submission wizard",
        "Select data type (Microarray or Sequencing) and enter IDF/SDRF metadata",
        "Upload raw and processed data files to ftp-private.ddbj.nig.ac.jp",
        "Metadata validation and curator review; accession numbers issued upon completion",
      ],
    },
    prepare: {
      ja: [
        "DDBJ アカウント (D-way ログイン用)",
        "BioProject・BioSample: あらかじめ登録済み (同じウィザード内では作成不可、別途申請が必要)",
        "IDF/SDRF テンプレート: 実験記述書・サンプル-データ関連表を Excel/Google Sheets で記入",
        "データファイル: 生データ (CEL/GPR など Microarray, または fastq/bam を DRA に事前登録), 解析済みデータファイル",
      ],
      en: [
        "DDBJ account for D-way login",
        "BioProject and BioSample: must be pre-registered (separate submission, not created within GEA wizard)",
        "IDF/SDRF templates: Investigation Description Format and Sample and Data Relationship Format completed in Excel or Google Sheets",
        "Data files: raw data files (CEL, GPR, etc. for microarray; fastq/bam pre-registered in DRA for sequencing) and processed data files",
      ],
    },
    gotcha: { ja: "Microarray と Sequencing は別々の submission に分けます。NGS 由来は生リードを先に DRA へ登録します。", en: "Keep Microarray and Sequencing in separate submissions; for NGS data, register the raw reads in DRA first." },
    issuedNote: { ja: "登録すると 発現実験 ID (E-GEAD-n) が発行されます。論文引用に使います。", en: "Registration issues an experiment ID (E-GEAD-n), used for publication citation." },
  },
  "metabobank": {
    wizardSteps: {
      ja: [
        "DDBJ アカウント取得と公開鍵登録",
        "MetaboBank 登録申し込みフォーム提出（Google フォーム または メール）",
        "BioProject に研究プロジェクト登録、BioSample にサンプル情報登録（各アクセッション PRJDB・SAMD を取得）",
        "実験種別別メタデータエクセル（MAGE-TAB：IDF・SDRF）をダウンロードして記入",
        "生データ・解析済みデータ・代謝物アサインメント（MAF）を準備し sftp でアップロード",
      ],
      en: [
        "Create DDBJ account and register public key",
        "Submit MetaboBank application form (Google Form or email)",
        "Register to BioProject and BioSample to obtain accession numbers (PRJDB, SAMD)",
        "Download and fill MAGE-TAB formatted metadata Excel (IDF and SDRF) by experiment type",
        "Prepare raw data, processed data, and Metabolite Assignment File (MAF), then upload via sftp",
      ],
    },
    prepare: {
      ja: [
        "DDBJ アカウント（取得に数営業日）",
        "ssh-keygen で生成した公開鍵・秘密鍵のペア",
        "研究プロジェクトの概要・論文情報（BioProject 登録用）",
        "サンプル詳細：生物種・サンプル名・採取条件など（BioSample Omics パッケージ）",
        "実験デザイン・プロトコール・測定パラメータ（MAGE-TAB IDF 記入用）",
        "サンプル・測定機器・データファイルの対応表（MAGE-TAB SDRF 記入用）",
        "生データファイル（mzML・mzXML または vendor raw、nmrML）",
        "解析済みデータファイル（サマリー・統計結果テーブル）",
        "代謝物アサインメント（MAF）：ChEBI ID・化合物名・m/z・信頼度など",
        "sftp クライアント（WinSCP・Cyberduck など）",
      ],
      en: [
        "DDBJ account (requires several business days for approval)",
        "Public and private key pair generated with ssh-keygen",
        "Project overview and publication information (for BioProject)",
        "Sample details: organism name, sample names, collection conditions (for BioSample Omics package)",
        "Experimental design, protocols, and measurement parameters (for MAGE-TAB IDF)",
        "Sample-to-instrument-to-datafile mapping table (for MAGE-TAB SDRF)",
        "Raw data files (mzML, mzXML, or vendor raw; nmrML for NMR)",
        "Processed data files (summary tables and statistical results)",
        "Metabolite Assignment File (MAF): ChEBI IDs, metabolite names, m/z, confidence scores",
        "SFTP client software (WinSCP, Cyberduck, or similar)",
      ],
    },
    gotcha: { ja: "登録は申し込みフォームを送ったあと、DDBJ 担当者からのメール返信を待って進みます。", en: "Submission proceeds after you send the application form and receive a reply from DDBJ staff." },
    issuedNote: { ja: "登録すると 研究 ID (MTBKS####) が発行されます。論文引用に使います。", en: "Registration issues a study ID (MTBKS####), used for publication citation." },
  },
  "jpost": {
    wizardSteps: {
      ja: [
        "jPOST のアカウント登録または既存アカウントで jpostdb.org にログイン",
        "新規登録を開始し、プロジェクト情報（タイトル・説明・著者）を入力",
        "測定パラメータ・実験デザイン・プロトコール情報を記入",
        "生データ・解析済みデータファイルを jPOST サーバにアップロード",
        "メタデータ検証実施、jPOST チーム査定後にアクセッション番号発行",
      ],
      en: [
        "Register for a jPOST account or log in to jpostdb.org with an existing account",
        "Start a new submission and enter project information (title, description, authors)",
        "Fill in measurement parameters, experimental design, and protocol details",
        "Upload raw and processed data files to the jPOST server",
        "Metadata validation performed; jPOST team review followed by accession issuance",
      ],
    },
    prepare: {
      ja: [
        "jPOST アカウント (jpostdb.org で事前登録、ORCID で統一的に管理)",
        "質量分析装置で取得したプロテオミクス生データ (mzML/mzXML など標準フォーマット)",
        "解析済みデータ・ピークリスト・定量結果テーブル",
        "実験メタデータ: サンプル抽出法・分析方法・機器情報・解析パイプライン",
      ],
      en: [
        "jPOST account (pre-registered at jpostdb.org, unified by ORCID)",
        "Raw proteomics data from mass spectrometry instruments (standard formats: mzML/mzXML)",
        "Processed data, peak lists, quantification results tables",
        "Experimental metadata: sample preparation, analysis methods, instrument details, analysis pipeline",
      ],
    },
    gotcha: { ja: "jPOST は DDBJ 外のサービスで、登録操作はすべて jpostdb.org 上で行います。", en: "jPOST is a service outside DDBJ; all submission steps are completed on jpostdb.org." },
    issuedNote: { ja: "登録すると プロテオーム ID (JPST######) が jPOST から発行されます。論文引用に使います。", en: "jPOST issues a proteome ID (JPST######), used for publication citation." },
  },
  "eva": {
    wizardSteps: {
      ja: [
        "BioProject と BioSample を DDBJ に登録してアクセッション番号を取得",
        "バリアントデータを VCF 形式で準備 (短いバリアント ≤50 bp・構造バリアント >50 bp 両対応)",
        "EVA サイトでアカウント登録・メタデータ入力・ファイルアップロードを実施",
        "EVA の査定プロセスを経由して accession 番号を取得",
      ],
      en: [
        "Register BioProject and BioSample in DDBJ and obtain accession numbers",
        "Prepare variant data in VCF format (both short variants ≤50 bp and structural variants >50 bp)",
        "Register account with EVA, submit metadata, and upload files to the EBI system",
        "Receive EVA accession upon successful validation",
      ],
    },
    prepare: {
      ja: [
        "DDBJ アカウント (BioProject・BioSample 登録に必須)",
        "BioProject accession (PRJDB 形式 6 桁)、BioSample accession (SAMD 形式 9 桁)",
        "バリアント VCF ファイル (構文検証済み、ヘッダー・メタデータ完備)",
        "実験プロトコール・データ解析パイプラインの概要説明",
      ],
      en: [
        "DDBJ account (required for BioProject and BioSample registration)",
        "BioProject accession (PRJDB format, 6 digits) and BioSample accession (SAMD format, 9 digits)",
        "Validated VCF files with complete headers and metadata",
        "Brief descriptions of experimental protocol and data analysis pipeline",
      ],
    },
    gotcha: { ja: "EVA は EBI が運用する DDBJ 外のサービスで、登録手続きは EVA 側で完結させます。", en: "EVA is operated by EBI outside DDBJ; complete the submission process on the EVA site." },
    issuedNote: { ja: "登録すると プロジェクト ID (PRJEB########) が EBI EVA から発行されます。論文引用に使います。", en: "EBI EVA issues a project ID (PRJEB########), used for publication citation." },
  },
}
