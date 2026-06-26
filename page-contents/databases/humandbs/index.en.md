---
title: NBDC ヒトデータベース
description: The NBDC Human Database handles policy review and Data Submission/Use applications for controlled-access human data, routing approved data to JGA or DRA.
---

## What is the NBDC Human Database

The NBDC Human Database (NBDC ヒトデータベース) is operated by the Database Division for Life Science (DBCLS), BioData Science Initiative (BSI), National Institute of Genetics (NIG), Research Organization of Information and Systems (ROIS). It promotes sharing and reuse of human-derived data, accepting diverse human data including genome sequences, SNP arrays, epigenomic data, brain images, and clinical information, and routing them to the appropriate distribution archive (JGA / DRA) according to each access class.

It acts as the **front gate for registering controlled-access human data in [JGA](/databases/jga)**: policy review and application intake happen at NBDC Human Database, and approved data is then released through JGA.

> [!NOTE]
> To decide between unrestricted and controlled access, or to identify which application you need, use the [Submit Navigator](/submit) to narrow down the destination archive by access class and data type.

## Data accepted

NBDC Human Database accepts any human-derived data. Typical examples:

- Next-generation sequencing data (whole genome / exome / RNA-seq)
- SNP array genotyping data
- Epigenomic data (DNA methylation, histone modifications)
- Brain imaging (MRI, PET)
- Clinical information, questionnaires, and psychological assessments from disease cohorts
- Variant data, gene expression arrays, biochemical values, audio data

Data is accepted under the following access classes, which determine the distribution archive.

| Access class | Distributed via | Use |
|---|---|---|
| Unrestricted | [DRA](/databases/dra) | Reference sequences and other data usable without restriction |
| Restricted Type I | [JGA](/databases/jga) | Data requiring a use application under the NBDC standard policy (JGAP000001) |
| Restricted Type II | [JGA](/databases/jga) | Data requiring a use application under a stricter custom policy (a dedicated JGAP) |

> [!WARNING]
> JGA does not accept submissions on its own. **Approval at NBDC Human Database is a prerequisite for JGA registration.** To register controlled-access data in JGA, you must first proceed through the NBDC Human Database Data Submission application.

## Accession numbers

Identifiers used across NBDC Human Database and JGA:

| Prefix | Width | Issuer | Meaning |
|---|---|---|---|
| `HUM####.vN` | 4 digits + version | NBDC | Research project registered in NBDC Human Database |
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
6. **Upload data** — The destination is decided by the access class:
    - Unrestricted → upload to [DRA](/databases/dra)
    - Restricted → upload to [JGA](/databases/jga)
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

NBDC Human Database and [JGA](/databases/jga) form a clear division of labor: **NBDC is where policy review happens, JGA is where the data itself lives.**

- **At NBDC Human Database**: Receives Data Submission applications, has the Data Access Committee review policy adequacy and documents, and approves submissions. Issues the project-level identifier `HUM####.vN`.
- **At JGA**: Stores and distributes the approved data as Study (`JGAS######`) and Dataset (`JGAD######`). Each Dataset is bound to one `JGAP######` (standard or custom).

NGS data classified as unrestricted is routed to [DRA](/databases/dra) instead of JGA, as part of this same routing decision.

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
- Related services: [JGA](/databases/jga) / [DRA](/databases/dra) / [DDBJ Center](/databases/ddbj)
