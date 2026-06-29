---
title: NBDC ヒトデータベース
description: The NBDC Human Database is a unified intake for human data Data Submission/Use applications and policy review, routing approved data to one of four archives (DRA / GEA / JGA / NHA) by data type and access class.
---

## What is the NBDC Human Database

The NBDC Human Database (NBDC ヒトデータベース) is operated by the Database Division for Life Science (DBCLS), BioData Science Initiative (BSI), National Institute of Genetics (NIG), Research Organization of Information and Systems (ROIS). It promotes sharing and reuse of human-derived data, accepting diverse human data including genome sequences, SNP arrays, epigenomic data, brain images, clinical information, summary statistics, and pathology images, and routing them to one of four archives ([DRA](/dra) / [GEA](/gea) / [JGA](/jga) / NHA) according to data type and access class.

It acts as the **front gate for registering controlled-access human data in [JGA](/jga)**: policy review and application intake happen at NBDC Human Database, and approved data is then released through each archive.

> [!NOTE]
> To decide between unrestricted and controlled access, or to identify which application you need, use the [Submit Navigator](/submit) to narrow down the destination archive by access class and data type.

## Archive composition

The NBDC Human Database is backed by **four archives** distinguished by data type and access class. Submitters route their data through one of them according to what they have and how they intend to release it.

| Archive | Acronym | Primary data type | Access class | Operator / hosting |
|---|---|---|---|---|
| [DDBJ Sequence Read Archive](/dra) | DRA | Raw NGS reads (FASTQ / BAM) and analyses | Unrestricted | DDBJ Center |
| [Genomic Expression Archive](/gea) | GEA | Gene expression data (matrices, microarrays, spatial Tx) | Unrestricted | DDBJ Center |
| [Japanese Genotype-phenotype Archive](/jga) | JGA | Individual-level human genomic and phenotypic data | Controlled-access | DDBJ Center |
| NBDC Human Data Archive | NHA | Data types the other three archives do not handle (images, summary statistics, etc.) | Both unrestricted and controlled-access | Unrestricted NHA: NBDC (DBCLS) servers / Controlled-access NHA: DDBJ servers |

> [!NOTE]
> NHA is the **complementary archive inside the NBDC Human Database** for data types that do not fit into DRA / GEA / JGA (e.g. pathology images, GWAS / allele frequency summary statistics). The NBDC Human Database serves as the single application intake across all four archives.

## Data accepted

NBDC Human Database accepts any human-derived data. Typical examples:

- Next-generation sequencing data (whole genome / exome / RNA-seq)
- SNP array genotyping data
- Epigenomic data (DNA methylation, histone modifications)
- Brain imaging (MRI, PET)
- Clinical information, questionnaires, and psychological assessments from disease cohorts
- Variant data, gene expression arrays, biochemical values, audio data
- Pathology images and summary statistics such as GWAS / meta-analysis results

Submissions are routed to one of the four archives by access class and data type.

| Access class | Data type | Distribution archive | Use / notes |
|---|---|---|---|
| Unrestricted | Raw NGS reads (FASTQ / BAM) | [DRA](/dra) | Reference sequences and other NGS data usable without restriction |
| Unrestricted | Gene expression data (matrices, microarrays, spatial Tx) | [GEA](/gea) | NGS-derived sets register raw to DRA first, then processed to GEA |
| Unrestricted | Images / summary statistics / other data types | NHA (NBDC) | Pathology images; GWAS / meta-analysis statistics; allele / genotype frequencies; mean FPKM; enriched region peaks; eQTL / sQTL; mean methylation rate; PRS; mobile element polymorphism frequencies; SV frequencies, etc. |
| Restricted Type I | Individual-level human genomic / phenotypic data | [JGA](/jga) | Requires a use application under the NBDC standard policy (`JGAP000001`) |
| Restricted Type II | Individual-level human genomic / phenotypic data | [JGA](/jga) | Requires a use application under a stricter custom policy (a dedicated `JGAP######`) |
| Controlled-access | Images / summary statistics / other data types | NHA (DDBJ) | Controlled-access counterpart for data types JGA does not host; stored on DDBJ servers and provided after Data Access Committee review |

> [!WARNING]
> JGA does not accept submissions on its own. **Approval at NBDC Human Database is a prerequisite for JGA registration.** To register controlled-access data in JGA, you must first proceed through the NBDC Human Database Data Submission application.

## Accession numbers

Identifiers used across NBDC Human Database and JGA:

| Prefix | Width | Issuer | Meaning |
|---|---|---|---|
| `HUM####.vN` | 4 digits + version | NBDC | Research project registered in NBDC Human Database; issued at the project level regardless of which archive (DRA / GEA / JGA / NHA) stores the data |
| `JGAS######` | 6 digits | JGA (DDBJ) | Study. Describes a research project; recommended for paper citation |
| `JGAD######` | 6 digits | JGA (DDBJ) | Dataset. A set of files bundled under one policy |
| `JGAP######` | 6 digits | DBCLS | Policy. Issued only when a custom policy is used |
| `JGAP000001` | fixed | DBCLS | Fixed number for the NBDC standard policy (NBDC Data Sharing Policy) |
| `J-DS######` | — | NBDC | Data Submission application number |
| `J-DU######` | — | NBDC | Data Use application number |

When each ID is issued:

- **HUM####.vN** — when the Data Submission application is approved and the project is registered.
- **JGAS / JGAD** — at the time of actual data registration in JGA, after NBDC approval.
- **JGAP** — when a custom policy is registered at DBCLS (when the standard policy is used, only `JGAP000001` is referenced; no new number is issued).
- **J-DS / J-DU** — when the Data Submission or Data Use application is received.

## Data Submission flow

Data submission to NBDC Human Database typically proceeds through these seven steps.

1. **Review the guidelines** — Read the NBDC Human Data Sharing Guidelines and the Security Guidelines.
2. **Prepare required documents** — Research outline, data specification, researcher information, ethical review approval from your institution, informed consent documents, and head-of-institution approval.
3. **Obtain DDBJ accounts** — The principal investigator, applicants, and data upload contacts each need a DDBJ account.
4. **Submit through the application system** — Send the Data Submission application via the online portal.
5. **Receive review results** — Reviewed by the Data Access Committee (DAC); usually around two weeks once all documents are in.
6. **Upload data** — The destination is decided by the access class and data type:
    - Unrestricted: NGS raw reads to [DRA](/dra), gene expression data to [GEA](/gea), images / summary statistics / other data types to NHA
    - Controlled-access: individual-level human genomic / phenotypic data to [JGA](/jga); other data types to NHA
7. **Update applications** — Use the `J-DS` number to amend or add data after approval.

## Policy (NBDC standard / custom JGAP)

Every controlled-access dataset is bound to one use policy. A single policy is assigned per Dataset, and populations with differing consent terms (e.g. Case vs. Control) must be split into separate Datasets and assigned their own policies.

| Policy kind | Identifier | When to use it |
|---|---|---|
| NBDC standard policy | `JGAP000001` (fixed) | Standard academic-use scenarios. This covers the majority of submissions |
| Custom policy (Custom JGAP) | Dedicated `JGAP######` | When additional constraints are needed (limited research purposes, no commercial use, etc.) beyond the standard policy |

> [!IMPORTANT]
> If a custom policy is required, you must submit the policy text to DBCLS to have a dedicated `JGAP######` issued. Whether the standard policy is sufficient is the first branching decision in your submission plan.

## DAC and Data Use applications

Both Data Submission and Data Use applications at NBDC Human Database are reviewed by the **Data Access Committee (DAC)**. Main requirements for a Data Use application:

- DDBJ accounts for all applicants
- Research record of the principal investigator (publications, presentations)
- A research plan approved by the ethics review board of the applicant's institution
- Head-of-institution approval documents
- Security checklist
- A public encryption key for data transfer

Once approved, a `J-DU######` is issued and used to reference the application in subsequent annual reports, extension requests, additional-data requests, and termination notices.

Main obligations after use approval:

- **Annual report** — Annual progress report for multi-year studies.
- **Extension application** — File at least one month before the end of the use period.
- **Data deletion confirmation** — Delete the data on hand at the end of use and report the deletion.
- **Re-approval on affiliation change** — Re-obtain ethics review and head-of-institution approval at the new institution.

## Relationship with JGA

NBDC Human Database and [JGA](/jga) form a clear division of labor: **NBDC is where policy review happens, JGA is where the data itself lives.**

- **At NBDC Human Database**: Receives Data Submission applications, has the Data Access Committee review policy adequacy and documents, and approves submissions. Issues the project-level identifier `HUM####.vN`.
- **At JGA**: Stores and distributes the approved data as Study (`JGAS######`) and Dataset (`JGAD######`). Each Dataset is bound to one `JGAP######` (standard or custom).

NGS raw reads classified as unrestricted go to [DRA](/dra) instead of JGA, unrestricted gene expression data goes to [GEA](/gea), and data types that do not fall into raw reads, sequences, or expression matrices (images, summary statistics, etc.) go to NHA. NBDC Human Database serves as the single application intake across all four archives; the destination is fixed during the Data Submission review.

## NHA

NHA (NBDC Human Data Archive) is the **complementary archive** of the NBDC Human Database that accepts human data types not handled by [DRA](/dra) / [GEA](/gea) / [JGA](/jga). It shares the same application intake (NBDC Human Database) with the other three archives while serving as an independent destination for the data itself.

- **What NHA holds**: pathology images, GWAS / meta-analysis statistics, allele / genotype frequencies, mean FPKM, enriched region peaks, eQTL / sQTL, mean methylation rate, PRS, mobile element polymorphism frequencies, SV frequencies, and similar data types. NGS raw reads, assembled sequences, expression matrices, and individual-level human genomic / phenotypic data go to DRA / GEA / JGA respectively and are out of scope for NHA.
- **Access classes and hosting**: Both unrestricted and controlled-access. Unrestricted NHA data is distributed from NBDC (DBCLS) servers; controlled-access NHA data is distributed from DDBJ servers and is provided to users only after Data Access Committee review, like other controlled-access data.
- **Single intake**: NHA submissions enter through the same NBDC Human Database Data Submission application as the other three archives. The project is registered at the `HUM####.vN` level, and the archive (NHA in this case) is decided by data type and access class.
- **Use with JGA**: Individual-level human genomic and phenotypic data (raw genotypes, sequences, etc., with higher re-identification risk) go to JGA; other data types (images, summary statistics, etc.) go to NHA. When a single research project covers both, items are split between JGA and NHA per data type.

> [!NOTE]
> The NBDC Human Database is the **place of policy review and intake**; each of the four archives (DRA / GEA / JGA / NHA) is the **place where the data itself lives**. The four archives sit behind a single application door.

## Preparation

The Data Submission application goes more smoothly when the following are ready in advance.

- Familiarity with the NBDC Human Data Sharing Guidelines and the Security Guidelines
- Ethics review approval from your institution (informed consent including consent for secondary use)
- Head-of-institution approval documents
- DDBJ accounts for the principal investigator, applicants, and data upload contacts (issuance takes around 15 minutes)
- Research outline, data specification, and researcher information
- A draft policy text, if a custom policy is needed

## Related resources

- [NBDC Human Database top](https://humandbs.dbcls.jp/)
- [NBDC Human Database (English)](https://humandbs.dbcls.jp/en/)
- [Data Submission](https://humandbs.dbcls.jp/data-submission/)
- [Data Use](https://humandbs.dbcls.jp/data-use/)
- [Data Access Committee (DAC)](https://humandbs.dbcls.jp/dac/)
- [NBDC Data Sharing Policy](https://humandbs.dbcls.jp/nbdc-policy)
- [Aims of the NBDC Human Database](https://humandbs.dbcls.jp/aim)
- [Security Guidelines for Users (Ver. 5.0)](https://humandbs.dbcls.jp/security-guidelines-for-users-v5)
- [FAQ](https://humandbs.dbcls.jp/faq)
- [JGA (DDBJ Center)](https://www.ddbj.nig.ac.jp/jga/index.html)
- [JGA submission procedure](https://www.ddbj.nig.ac.jp/jga/submission.html)
- Related services: [JGA](/jga) / [DRA](/dra) / [DDBJ Center](/ddbj)
