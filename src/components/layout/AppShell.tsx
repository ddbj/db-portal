import { Outlet, useRouteLoaderData } from "react-router"

import type { MirroredNewsItem } from "@/server/news-mirror"

import Footer from "./Footer"
import Header from "./Header"
import NotificationBar from "./NotificationBar"

interface RootLoaderData {
  lang: "ja" | "en"
  notifications: MirroredNewsItem[]
}

const AppShell = () => {
  const rootData = useRouteLoaderData<RootLoaderData>("root")
  const notifications = rootData?.notifications ?? []

  return (
    <div className="flex min-h-screen flex-col bg-white text-gray-900">
      <Header />
      {notifications.length > 0 && <NotificationBar notifications={notifications} />}
      <main className="flex flex-1 flex-col">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

export default AppShell
