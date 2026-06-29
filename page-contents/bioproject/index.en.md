---
title: BioProject
description: BioProject is the INSDC-shared metadata catalog that bundles research project information; sequences and experimental data are submitted to other DDBJ services.
---

## What is BioProject

BioProject is the INSDC-shared metadata catalog that bundles a research project together with the various data derived from it. The project entry itself holds no sequences or experimental data; instead it captures the project overview, objectives, target organisms, and related publications in a single record.

The actual data are submitted to other services such as [DRA](/dra), [GEA](/gea), [DDBJ](/ddbj), MetaboBank, and [JGA](/jga). Those entries cite the BioProject accession number so that data can be browsed together at the project level. After release, metadata are exchanged with NCBI BioProject and EBI BioStudies.

There are two kinds of project.

- **Primary project**: a regular project that is directly linked to sequence or experimental data.
- **Umbrella project**: a management-only project that bundles multiple primaries. It does not reference data itself.

> [!NOTE]
> Not sure where your data belongs? The [Submit Navigator](/submit) helps you pick the right DDBJ service based on your research.

## Accepted data

BioProject accepts project metadata rather than sequences themselves. The main fields are listed below.

| Field | Description |
| --- | --- |
| Project Data Type | One of 12 categories such as Genome Sequencing / Metagenome / Transcriptome or Gene Expression / Epigenomics / Variation |
| Sample Scope | One of five values: Monoisolate / Multiisolate / Multi-species / Environment / Synthetic |
| Material | Biological material studied, e.g. Genome / Transcriptome / Proteome |
| Capture | Whole / Clone Ends / Exome / Targeted Locus / Random Survey |
| Methodology | Sequencing / Array / Mass Spectroscopy etc. |
| Objective | Type of data being deposited: Raw Sequence Reads / Assembly / Expression / Variation etc. |
| Target Organism | NCBI Taxonomy organism name and taxonomy ID, plus strain / breed / cultivar / isolate |
| Publications | PubMed ID or DOI of related publications |

All metadata must be entered in English, and the description must be at least 100 characters. Personal submitter information is not made public; only the organization information is exposed on INSDC.

## Accession numbers

| Prefix | Purpose | Citation |
| --- | --- | --- |
| `PRJDB` | Formal accession number issued automatically when the submission is finalized (e.g. `PRJDB1`) | Cite this in papers and data releases |
| `PSUB` | Temporary submission ID used while the registration is in progress | Must NOT be cited in publications |

> [!WARNING]
> The `PSUB` prefix is an internal submission ID used during the registration workflow. Always cite the released `PRJDB` accession number in papers and press releases.

A single BioProject citation in a paper or data release lets readers trace all the underlying DRA / GEA / DDBJ data linked to that project.

## Submission flow

1. Obtain a [DDBJ account](https://www.ddbj.nig.ac.jp/ddbj-account.html) (shared across BioProject / [BioSample](/biosample) / [DRA](/dra) etc.).
2. Log in to the submission tool [D-way](https://ddbj.nig.ac.jp/D-way/) and go to the BioProject submission page.
3. Click **[New submission]** to start a new entry.
4. Fill in each tab from left to right in English (submitter / project type / organism / publication etc.).
5. Review everything on the **OVERVIEW** tab.
6. Choose the **release setting**: release immediately, or keep private (Hold) and release together with the related data.
7. Submit; the `PRJDB` accession number is issued automatically.

> [!IMPORTANT]
> Only primary projects can be kept private (Hold). Umbrella projects are always public.

## Prerequisites

- **DDBJ account**: shared with BioSample / DRA / GEA and the other DDBJ services.
- **Organizational email address**: free personal email is not accepted as a rule.
- **English metadata**: prepare the title, a description of at least 100 characters, the official (unabbreviated) organization name, target organism, material / capture / methodology, and related publications.
- **When handling human data**: to submit human-derived data to [DRA](/dra) / [GEA](/gea) / [DDBJ](/ddbj), you must first file the DBCLS "application for providing unrestricted-access human data" and obtain approval. Enter the issued application ID in the private comment field of the submission form. For restricted-access human data, use [JGA](/jga) instead.
- **When submitting annotated genome sequences**: register a locus_tag prefix on the [BioSample](/biosample) side beforehand.
- **When linking to an umbrella**: prepare the `PRJDB` number of the primary project in advance.

## Umbrella BioProject

An Umbrella BioProject is a management-only hierarchical project that bundles related primary projects. It does not reference data directly; it groups multiple projects under one umbrella so they can be viewed together.

A common use case is a large multi-institutional collaboration where each participating institution's work is registered as primary projects and grouped by an umbrella. Umbrellas can be stacked into multiple layers (a top-level umbrella for the overall collaboration, second-level umbrellas per institution, and primaries that link to the actual data). Both primary and umbrella projects can be associated with more than one umbrella.

Another use case is splitting a single research project into haplotype-specific primaries and exposing them through a single umbrella (see [bioproject/submission.html#submit-umbrella-project](https://www.ddbj.nig.ac.jp/bioproject/submission-e.html#submit-umbrella-project)).

| Project | Type | Role |
| --- | --- | --- |
| `PRJDB0` (example) | Umbrella | Bundles the primaries below |
| `PRJDB1` | Primary | Data for the principal haplotype |
| `PRJDB2` | Primary | Data for the alternate haplotype |
| `PRJDB3` | Primary | Related DRA data |

> [!WARNING]
> Umbrella projects cannot be kept private; they are always public. Primaries underneath can still be kept private individually, so an "umbrella public / primary private" configuration is valid.

Linking a primary to an umbrella is handled manually by DDBJ staff. In the private comment field of the submission form, state that "this project is an umbrella" or "please link this primary to this umbrella", along with the counterpart accession number and abstract.

## INSDC sharing

DDBJ BioProject follows the INSDC (DDBJ / NCBI / EBI) common schema, and after release the metadata are exchanged with NCBI BioProject and EBI BioStudies.

> [!WARNING]
> Do not register the same research project at both DDBJ and NCBI / EBI. Submitting to one site is enough; the entry becomes referenceable at the other two via INSDC.

## Cross-service integration

BioProject itself holds no sequences or experimental data. The actual data are submitted to the services below, each of which cites the BioProject accession number.

- [BioSample](/biosample): metadata for the samples that produced the sequences.
- [DRA](/dra): raw reads from next-generation sequencers.
- [GEA](/gea): gene expression data.
- [DDBJ](/ddbj): annotated sequences.
- [JGA](/jga): restricted-access human data.

## Related resources

- [BioProject overview (Japanese)](https://www.ddbj.nig.ac.jp/bioproject/index.html)
- [BioProject overview (English)](https://www.ddbj.nig.ac.jp/bioproject/index-e.html)
- [Overview page](https://www.ddbj.nig.ac.jp/bioproject/overview.html)
- [Submission procedure (Japanese)](https://www.ddbj.nig.ac.jp/bioproject/submission.html)
- [Submission procedure (English)](https://www.ddbj.nig.ac.jp/bioproject/submission-e.html)
- [Project information input specification](https://www.ddbj.nig.ac.jp/bioproject/project-info.html)
- [D-way submission tool](https://ddbj.nig.ac.jp/D-way/)
- [DDBJ account](https://www.ddbj.nig.ac.jp/ddbj-account.html)
- [Handling of human data (policies)](https://www.ddbj.nig.ac.jp/policies.html#unrestricted-access)
- [NCBI BioProject](https://www.ncbi.nlm.nih.gov/bioproject/)
