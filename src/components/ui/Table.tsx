import type { ComponentProps } from "react"

import cn from "./cn"

type TableProps = ComponentProps<"table">

const Table = ({ className, children, ...rest }: TableProps) => {

  return (
    <table className={cn("table-ddbj", className)} {...rest}>
      {children}
    </table>
  )
}

export default Table
