import { render, screen } from "@testing-library/react"
import { I18nextProvider } from "react-i18next"
import { createRoutesStub, Outlet } from "react-router"
import { describe, expect, test } from "vitest"

import type { BreadcrumbOptions } from "~/lib/content/breadcrumb"
import { useBreadcrumb } from "~/lib/content/breadcrumb"
import { createI18nInstance } from "~/lib/i18n"

type BreadcrumbProbeProps = {
  resolvers?: BreadcrumbOptions["resolvers"]
}

const BreadcrumbProbe = ({ resolvers }: BreadcrumbProbeProps) => {
  const items = useBreadcrumb(resolvers === undefined ? {} : { resolvers })

  return (
    <ul data-testid="breadcrumb">
      {items.map((item, i) => (
        <li key={`${i}-${item.href}`} data-href={item.href}>{item.label}</li>
      ))}
    </ul>
  )
}

const renderWithI18n = (ui: React.ReactNode) => {
  const i18n = createI18nInstance("ja")

  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>)
}

describe("useBreadcrumb", () => {
  test("useBreadcrumb_staticI18nKey_resolvesViaI18n", () => {
    const Stub = createRoutesStub([
      {
        path: "/databases",
        handle: { breadcrumbI18nKey: "breadcrumb.docs" },
        Component: () => <BreadcrumbProbe />,
      },
    ])
    renderWithI18n(<Stub initialEntries={["/databases"]} />)
    const list = screen.getByTestId("breadcrumb")
    expect(list).toHaveTextContent("ナレッジベース")
  })

  test("useBreadcrumb_dynamicResolver_invokedWithParams", () => {
    const Stub = createRoutesStub([
      {
        path: "/databases",
        handle: { breadcrumbI18nKey: "breadcrumb.docs" },
        Component: () => <Outlet />,
        children: [
          {
            path: ":slug",
            handle: { breadcrumbResolver: "database" },
            Component: () => (
              <BreadcrumbProbe
                resolvers={{
                  database: ({ params, pathname }) => ({
                    label: `db:${params.slug}`,
                    href: pathname,
                  }),
                }}
              />
            ),
          },
        ],
      },
    ])
    renderWithI18n(<Stub initialEntries={["/databases/bioproject"]} />)
    const list = screen.getByTestId("breadcrumb")
    expect(list).toHaveTextContent("ナレッジベース")
    expect(list).toHaveTextContent("db:bioproject")
  })

  test("useBreadcrumb_missingResolver_skipsDynamicMatch", () => {
    const Stub = createRoutesStub([
      {
        path: "/databases",
        handle: { breadcrumbI18nKey: "breadcrumb.docs" },
        Component: () => <Outlet />,
        children: [
          {
            path: ":slug",
            handle: { breadcrumbResolver: "unknown" },
            Component: () => <BreadcrumbProbe />,
          },
        ],
      },
    ])
    renderWithI18n(<Stub initialEntries={["/databases/bioproject"]} />)
    const list = screen.getByTestId("breadcrumb")
    expect(list.children).toHaveLength(1)
  })

  test("useBreadcrumb_routesWithoutHandle_returnsEmpty", () => {
    const Stub = createRoutesStub([
      {
        path: "/x",
        Component: () => <BreadcrumbProbe />,
      },
    ])
    renderWithI18n(<Stub initialEntries={["/x"]} />)
    const list = screen.getByTestId("breadcrumb")
    expect(list.children).toHaveLength(0)
  })

  test("useBreadcrumb_resolverReturnsNull_skipsItem", () => {
    const Stub = createRoutesStub([
      {
        path: "/databases",
        handle: { breadcrumbI18nKey: "breadcrumb.docs" },
        Component: () => <Outlet />,
        children: [
          {
            path: ":slug",
            handle: { breadcrumbResolver: "always-null" },
            Component: () => (
              <BreadcrumbProbe resolvers={{ "always-null": () => null }} />
            ),
          },
        ],
      },
    ])
    renderWithI18n(<Stub initialEntries={["/databases/x"]} />)
    const list = screen.getByTestId("breadcrumb")
    expect(list.children).toHaveLength(1)
  })

  test("useBreadcrumb_unknownI18nKey_returnsRawKeyAsLabel", () => {
    const Stub = createRoutesStub([
      {
        path: "/x",
        handle: { breadcrumbI18nKey: "nonexistent.key" },
        Component: () => <BreadcrumbProbe />,
      },
    ])
    renderWithI18n(<Stub initialEntries={["/x"]} />)
    const list = screen.getByTestId("breadcrumb")
    expect(list).toHaveTextContent("nonexistent.key")
    expect(list.children).toHaveLength(1)
  })

  test("useBreadcrumb_dualHandle_staticWinsOverDynamic", () => {
    const Stub = createRoutesStub([
      {
        path: "/databases",
        handle: { breadcrumbI18nKey: "breadcrumb.docs", breadcrumbResolver: "dyn" },
        Component: () => (
          <BreadcrumbProbe
            resolvers={{
              dyn: () => ({ label: "DYNAMIC_LABEL", href: "/dyn" }),
            }}
          />
        ),
      },
    ])
    renderWithI18n(<Stub initialEntries={["/databases"]} />)
    const list = screen.getByTestId("breadcrumb")
    expect(list).toHaveTextContent("ナレッジベース")
    expect(list).not.toHaveTextContent("DYNAMIC_LABEL")
  })
})
