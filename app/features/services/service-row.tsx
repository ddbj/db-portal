import { serviceDescription, type ServiceItem, serviceName, serviceUrl } from "~/lib/api"
import { type Lang, serviceCategoryLabelKey, useT } from "~/lib/i18n"
import { Tag, TextLink } from "~/ui"

type ServiceRowProps = {
  item: ServiceItem
  lang: Lang
}

export const ServiceRow = ({ item, lang }: ServiceRowProps) => {
  const t = useT()
  const name = serviceName(item, lang)
  const description = serviceDescription(item, lang)
  const url = serviceUrl(item, lang)

  return (
    <li className="flex items-start gap-4 py-4 px-2 border-b border-border-soft last:border-b-0">
      <div className="flex-1 min-w-0">
        {url !== undefined
          ? (
            <TextLink href={url} external weight="bold">
              <span className="text-ink text-fs-body leading-snug">{name}</span>
            </TextLink>
          )
          : (
            <span className="text-ink text-fs-body font-semibold leading-snug">
              {name}
            </span>
          )}
        {description !== undefined && description !== "" && (
          <p className="text-ink-soft text-fs-meta leading-relaxed mt-1 m-0 line-clamp-2">
            {description}
          </p>
        )}
      </div>
      <div className="flex items-start gap-1.5 flex-wrap shrink-0 max-w-right-pane justify-end pt-0.5">
        <Tag kind="source" name={item.source === "dbcls" ? "DBCLS" : "DDBJ"} size="sm" />
        {item.categories.map((category) => (
          <Tag key={category} kind="tag" size="sm">
            {t(serviceCategoryLabelKey(category))}
          </Tag>
        ))}
      </div>
    </li>
  )
}
