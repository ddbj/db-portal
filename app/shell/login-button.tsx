import { useLocation } from "react-router"

import { buildLoginUrl, buildLogoutUrl, useAuth } from "~/lib/auth"
import { useT } from "~/lib/i18n"
import { UserIcon } from "~/ui"

const ANCHOR_BUTTON_CLASS =
  "inline-flex items-center gap-1.5 px-3 py-1 text-[14px] font-semibold text-ink no-underline border border-border-soft rounded-button hover:bg-surface-subtle"

export const LoginButton = () => {
  const auth = useAuth()
  const { pathname } = useLocation()
  const t = useT()

  if (auth.status === "loading") {
    return (
      <span
        role="status"
        aria-live="polite"
        className="inline-flex items-center gap-1.5 px-3 py-1 text-[14px] text-ink-soft border border-border-soft rounded-button"
      >
        {t("auth.loggingIn")}
      </span>
    )
  }

  if (auth.status === "authenticated") {
    return (
      <a href={buildLogoutUrl(pathname)} className={ANCHOR_BUTTON_CLASS}>
        <UserIcon size={14} className="text-ink-mid" />
        <span className="max-w-[10rem] overflow-hidden text-ellipsis whitespace-nowrap">
          {auth.user.name}
        </span>
        <span className="text-ink-soft font-normal">· {t("auth.logout")}</span>
      </a>
    )
  }

  return (
    <a href={buildLoginUrl(pathname)} className={ANCHOR_BUTTON_CLASS}>
      <UserIcon size={14} className="text-ink-mid" />
      {t("auth.login")}
    </a>
  )
}
