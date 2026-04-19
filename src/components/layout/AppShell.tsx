import { Outlet } from "react-router"

import Footer from "./Footer"
import Header from "./Header"

const AppShell = () => {

  return (
    <div className="flex min-h-screen flex-col bg-white text-gray-900">
      <Header />
      <main className="flex flex-1 flex-col">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

export default AppShell
