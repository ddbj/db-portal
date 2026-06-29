import { buildEditUrl } from "~/lib/content/edit-url"
import { useLang, useT } from "~/lib/i18n"
import type { PageSourcePath } from "~/schemas/content/page-content"
import { GitHubIcon } from "~/ui"

type Props = {
  sourcePath: PageSourcePath
}

export const EditOnGitHubLink = ({ sourcePath }: Props) => {
  const t = useT()
  const lang = useLang()
  const href = buildEditUrl(sourcePath, lang)

  return (
    // TextLink は ExternalIcon を末尾に強制注入 + brand 色強制で、 今回の
    // 「GitHub mark を leading に置く subdued リンク」 と合わないので素の <a>。
    // eslint-disable-next-line react/forbid-elements
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("docs.editAriaLabel")}
      className="inline-flex items-center gap-1.5 text-fs-body-sm text-ink-soft hover:text-brand no-underline hover:underline whitespace-nowrap"
    >
      <GitHubIcon size={14} aria-hidden />
      <span>{t("docs.edit")}</span>
    </a>
  )
}
