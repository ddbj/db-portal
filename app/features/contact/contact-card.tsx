import { useT } from "~/lib/i18n"
import { ExternalIcon, Heading, LinkCard } from "~/ui"

type ContactCardProps = {
  title: string
  description: string
} & ({ to: string; href?: never } | { href: string; to?: never })

export const ContactCard = (props: ContactCardProps) => {
  const t = useT()
  const inner = (
    <div className="px-5 py-4">
      <Heading as="h3" size="h2" className="flex items-center gap-1.5">
        <span className="min-w-0">{props.title}</span>
        {props.href !== undefined && <ExternalIcon size={12} className="text-ink-soft" />}
      </Heading>
      <p className="text-fs-body-sm text-ink-soft m-0 leading-relaxed mt-1">
        {props.description}
      </p>
    </div>
  )

  return props.href !== undefined
    ? (
      <LinkCard external href={props.href} externalSrLabel={t("a11y.externalLink")}>
        {inner}
      </LinkCard>
    )
    : <LinkCard to={props.to}>{inner}</LinkCard>
}
