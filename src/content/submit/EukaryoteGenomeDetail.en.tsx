import { ExternalLink } from "lucide-react"

import { Badge, Heading } from "@/components/ui"

// Corresponds to leaf: eukaryote-raw-assembly (leaf-26)
const EukaryoteGenomeDetail = () => (
  <div className="space-y-8">
    <section className="space-y-3">
      <Heading level={3}>About this leaf</Heading>
      <p className="text-sm leading-relaxed text-gray-700">
        Eukaryote genome submission (animals / plants / fungi) where you hold <strong>both raw reads and an assembly</strong>.
        The three-layer structure (metadata → raw reads → assembly) matches microbial genome submission.
        However, <strong>DFAST is prokaryote-only</strong>; annotation must be done manually or via an existing pipeline.
      </p>
      <div className="flex flex-wrap gap-2">
        <Badge variant="primary">BP+BS+DRA+MSS</Badge>
        <Badge variant="gray">BioSample: MIGS</Badge>
        <Badge variant="gray">MSS data type: GNM / WGS / HTG</Badge>
        <Badge variant="gray">locus_tag prefix required</Badge>
        <Badge variant="gray">Assembly Name required</Badge>
      </div>
    </section>

    <section className="space-y-3">
      <Heading level={3}>Submission flow</Heading>
      <ol className="space-y-2 pl-0">
        {[
          {
            step: 1,
            title: "Register BioProject",
            desc: "Submit project-level metadata via D-way and obtain a PRJDBxxxxx accession.",
          },
          {
            step: 2,
            title: "Register BioSample (MIGS package)",
            desc: "Pick one of Model Organism Animal / Plant / Microbe depending on the organism, then fill in qualifiers. Obtain a SAMDxxxxxxx accession.",
          },
          {
            step: 3,
            title: "Submit raw reads to DRA",
            desc: "Upload FASTQ / BAM with MD5 via D-way's DRA section. Link to the upstream accessions.",
          },
          {
            step: 4,
            title: "Submit the assembly via MSS",
            desc: "Apply through the MSS form with FASTA + tab-separated annotation. Pick the data type (GNM / WGS / HTG) based on completeness. locus_tag prefix and Assembly Name are mandatory.",
          },
        ].map((s) => (
          <li
            key={s.step}
            className="flex gap-3 rounded-md border border-gray-100 bg-gray-50 px-3 py-2"
          >
            <span className="bg-primary-100 text-primary-700 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
              {s.step}
            </span>
            <div>
              <div className="text-sm font-semibold text-gray-900">{s.title}</div>
              <p className="mt-0.5 text-xs leading-relaxed text-gray-600">{s.desc}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>

    <section className="space-y-3">
      <Heading level={3}>What to prepare</Heading>
      <ul className="ml-4 list-inside list-disc space-y-1 text-sm leading-relaxed text-gray-700">
        <li>DDBJ Account and SSH public key</li>
        <li>Raw reads (FASTQ / BAM) with MD5</li>
        <li>Assembly sequences (FASTA)</li>
        <li>Annotation file (MSS tab-separated format)</li>
        <li>locus_tag prefix (decided before submission)</li>
        <li>Assembly Name (decided before submission; used as an identifier in later updates)</li>
      </ul>
    </section>

    <section className="space-y-3">
      <Heading level={3}>BioSample package & qualifiers by taxon</Heading>
      <p className="text-sm leading-relaxed text-gray-700">
        Eukaryotes use different BioSample packages and qualifiers depending on whether you submit an animal, plant, or fungus.
      </p>
      <ul className="ml-4 list-inside list-disc space-y-1 text-sm leading-relaxed text-gray-700">
        <li><strong>Animals</strong> — BioSample: Model Organism Animal / MIGS. Qualifiers: <code className="text-primary-700 rounded bg-gray-100 px-1 py-0.5 font-mono text-[11px]">breed</code>, <code className="text-primary-700 rounded bg-gray-100 px-1 py-0.5 font-mono text-[11px]">strain</code>, <code className="text-primary-700 rounded bg-gray-100 px-1 py-0.5 font-mono text-[11px]">isolate</code>, etc.</li>
        <li><strong>Plants</strong> — BioSample: Plant / MIGS. Qualifiers: <code className="text-primary-700 rounded bg-gray-100 px-1 py-0.5 font-mono text-[11px]">cultivar</code>, <code className="text-primary-700 rounded bg-gray-100 px-1 py-0.5 font-mono text-[11px]">ecotype</code>, etc.</li>
        <li><strong>Fungi</strong> — BioSample: Microbe / MIGS. Qualifiers: <code className="text-primary-700 rounded bg-gray-100 px-1 py-0.5 font-mono text-[11px]">strain</code>, <code className="text-primary-700 rounded bg-gray-100 px-1 py-0.5 font-mono text-[11px]">isolate</code>, etc.</li>
      </ul>
    </section>

    <section className="space-y-3">
      <Heading level={3}>Assembly completeness and MSS data type</Heading>
      <ul className="ml-4 list-inside list-disc space-y-1 text-sm leading-relaxed text-gray-700">
        <li><strong>GNM (Finished)</strong> — chromosome-level continuous sequences</li>
        <li><strong>WGS (Draft)</strong> — contigs or scaffolds</li>
        <li><strong>HTG (BAC / YAC / fosmid draft)</strong> — intermediate completeness (Phase 0 / 1 / 2)</li>
      </ul>
    </section>

    <section className="space-y-3">
      <Heading level={3}>Further reading</Heading>
      <ul className="space-y-1.5 text-sm">
        {[
          { label: "D-way (BioProject / BioSample / DRA)", url: "https://ddbj.nig.ac.jp/D-way" },
          { label: "MSS submission form", url: "https://mss.ddbj.nig.ac.jp/" },
          { label: "Genome Project data submission", url: "https://www.ddbj.nig.ac.jp/ddbj/genome-e.html" },
          { label: "Transcriptome Project (TSA-related)", url: "https://www.ddbj.nig.ac.jp/ddbj/transcriptome-e.html" },
          { label: "MSS submission guide", url: "https://www.ddbj.nig.ac.jp/ddbj/mss-e.html" },
          { label: "DRA submission guide", url: "https://www.ddbj.nig.ac.jp/dra/submission-e.html" },
        ].map((link) => (
          <li key={link.url}>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 decoration-primary-300 hover:text-primary-800 hover:decoration-primary-600 inline-flex items-center gap-1.5 font-medium underline underline-offset-2"
            >
              {link.label}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
    </section>
  </div>
)

export default EukaryoteGenomeDetail
