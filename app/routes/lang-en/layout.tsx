import { Outlet } from "react-router"

export const loader = async () => ({ lang: "en" as const })

const LangEnLayout = () => <Outlet />

export default LangEnLayout
