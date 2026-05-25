import type { ReactNode } from "react"

import { Page } from "~/ui"

import { Breadcrumb } from "./breadcrumb"
import { Header } from "./header"
import { NotificationBar } from "./notification-bar"
import { SkipLink } from "./skip-link"
import { TranslationUnavailable } from "./translation-unavailable"

type ShellLayoutProps = {
  children: ReactNode
}

export const ShellLayout = ({ children }: ShellLayoutProps) => (
  <Page>
    <SkipLink />
    <Header />
    <NotificationBar />
    <TranslationUnavailable />
    <Breadcrumb />
    <main id="main" className="min-h-[60vh]">{children}</main>
  </Page>
)
