---
title: BioSample
description: BioSample is DDBJ's central database for descriptive metadata of biological source materials used to generate experimental data, shared across the INSDC.
---

## What is BioSample

BioSample is a central database that captures descriptive information about the biological source materials (samples) used to generate experimental data registered in DDBJ's primary databases. Records are bidirectionally mirrored across the three INSDC sites (DDBJ / EBI / NCBI); submitting at one site makes the record available at the others.

It sits alongside [BioProject](/bioproject) as a parallel metadata layer that the underlying experimental data ([DRA](/dra) / [GEA](/gea) / [MetaboBank](/metabobank) / [DDBJ Sequence](/ddbj)) reference.

> [!NOTE]
> If you are not sure which service fits your study, narrow it down with the flowchart-style [Submit Navigator](/submit).

## Data accepted

What you submit is the descriptive information (attribute metadata) of the sample itself. Sequence data and experimental files are not registered in BioSample; they go to [DRA](/dra) / [GEA](/gea) / [MetaboBank](/metabobank) / [DDBJ Sequence](/ddbj).

| Sample type | Example |
| --- | --- |
| Individual organism | individual organism |
| Tissue | primary tissue biopsy |
| Cultured cells | cell line |
| Environmental sample | environmental isolate |

The organism name must be an NCBI Taxonomy scientific name at species rank or below. If the organism is not yet registered, enter the proposed name and DDBJ staff will mediate its registration.

INSDC rules make collection location (`geo_loc_name`, at minimum country or ocean) and collection date (`collection_date`, at minimum year) mandatory. If you cannot provide a value, you must follow the INSDC missing value reporting standard and record an appropriate reporting-level term (e.g. `not collected`, `restricted access: human-identifiable`). Blank values are not accepted.

## Accession numbers

| Type | Prefix | Example | Description |
| --- | --- | --- | --- |
| Submission ID (temporary) | `SSUB` | `SSUB000001` | Auto-assigned when a new submission is created. Do not cite in publications |
| Sample accession | `SAMD` | `SAMD00000001` | One per sample. Issued automatically after validation passes |

When a submission contains an unregistered organism name or a `locus_tag_prefix`, `SAMD` is issued after curator review. Within the INSDC, DDBJ uses the `SAMD` prefix, NCBI uses `SAMN`, and EBI uses `SAMEA`.

> [!WARNING]
> `SSUB` is an internal temporary ID. Always cite the `SAMD` accession in publications and public materials.

## Packages and attributes

In BioSample you choose one **package** that matches your sample type, and that choice fixes the set of attributes you need to fill in. Samples that belong to different packages cannot be mixed within a single submission.

| Category | Main packages |
| --- | --- |
| Standard | SARS-CoV-2 (clinical / wastewater) / Microbe / Model organism or animal / Metagenome or environmental / Invertebrate / Human / Plant / Virus / Beta-lactamase / Omics |
| Pathogen | clinical or host-associated / environmental, food or other |
| MIxS compliant | MIGS.ba / MIGS.eu / MIGS.vi / MIMS.me / MIMAG / MISAG / MIMARKS.specimen / MIMARKS.survey / MIUVIG |
| Environmental (MIxS env) | soil / water / sediment / air / built / wastewater / host-associated / human-gut / plant-associated / hydrocarbon resources and others |

The attribute file is a tab-separated text file: row 1 holds attribute names, and each subsequent row describes one sample. The required-field flags mean:

| Flag | Meaning |
| --- | --- |
| `*` | Required attribute |
| `**n` | At least one attribute in group `n` is required |

Download the attribute file template from the package definition and fill it in. You cannot submit until all validation errors are resolved.

## Submission flow

1. **Obtain an account** — Issue a D-way submission account.
2. **Create a new submission** — In D-way, choose BioSample and click `[New submission]` to obtain an `SSUB`.
3. **Enter Submitter / General info** — Enter submitter, affiliated organization, name, and an organization-domain email address in English.
4. **Select a package** — Pick one that matches the sample type (no mixing).
5. **Build and upload the attribute file** — Download the template, fill it in as tab-separated text, and upload it.
6. **Validate** — You cannot submit until every error is resolved.
7. **Review & Submit** — Review on the OVERVIEW tab and submit.
8. **Curation (when needed)** — Submissions containing unregistered organisms or a `locus_tag_prefix` go through staff review.
9. **`SAMD` issued** — You are notified by email.
10. **Release / Hold** — Public release is coupled to the release of the underlying data (see below).

> [!IMPORTANT]
> A single submission can contain at most 1,000 samples. Split your submissions if you have more.

## Prerequisites

- A DDBJ submission account (D-way submission account)
- An organization-domain email address (free webmail addresses are not accepted)
- Submitter first / last name and full organization name (in English)
- One **package** chosen for the sample type (no mixing)
- The attribute tab-separated text file (built from the package template)
- Required attributes: `organism` (NCBI Taxonomy scientific name) / `collection_date` / `geo_loc_name`, plus any others required by the chosen package
- If you plan to register a genome sequence to [DDBJ Sequence](/ddbj), include the desired `locus_tag_prefix` (staff will reserve it with NCBI)

## INSDC sharing and the release chain

BioSample is INSDC-mirrored metadata that is intended to become public. Samples that need controlled access at the human-individual level are handled by [JGA](/jga) and must not be registered to BioSample.

The release trigger behaves the same way as BioProject:

- Releasing a BioProject or BioSample on its own does not release any underlying data.
- Releasing a record in [DDBJ Sequence](/ddbj) / [DRA](/dra) / [GEA](/gea) / [MetaboBank](/metabobank) automatically releases the linked BioProject and BioSample.
- When a BioSample is released, any upstream BioSample referenced via the `derived_from` attribute is released along with it.

> [!WARNING]
> BioSample is a public-by-design database. If your samples need controlled access at the human-individual level, use [JGA](/jga) instead.

## Post-submission updates

Attribute updates and withdrawals of existing records are handled on a request basis with the BioSample team. Reply to the email that delivered your `SAMD` accession to send the update request.

## Related resources

- BioSample official top: <https://www.ddbj.nig.ac.jp/biosample/index-e.html>
- Overview: <https://www.ddbj.nig.ac.jp/biosample/overview.html>
- Submission procedure: <https://www.ddbj.nig.ac.jp/biosample/submission-e.html>
- Sample info: <https://www.ddbj.nig.ac.jp/biosample/sample-info-e.html>
- Attributes / package selection: <https://www.ddbj.nig.ac.jp/biosample/attribute.html>
- Release chain FAQ: <https://www.ddbj.nig.ac.jp/faq/en/bp-bs-seq-release-e.html>
- Update request FAQ: <https://www.ddbj.nig.ac.jp/faq/en/sample-update-e.html>
- D-way submission portal: <https://ddbj.nig.ac.jp/D-way>
- DDBJ account registration: <https://www.ddbj.nig.ac.jp/ddbj-account.html>
- Related services: [BioProject](/bioproject) / [DRA](/dra) / [GEA](/gea) / [MetaboBank](/metabobank) / [DDBJ Sequence](/ddbj) / [JGA](/jga)
