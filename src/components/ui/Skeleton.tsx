import cn from "./cn"

interface SkeletonProps {
  className?: string
  ariaLabel?: string
}

const Skeleton = ({ className, ariaLabel = "読み込み中" }: SkeletonProps) => {

  return (
    <div
      role="status"
      aria-label={ariaLabel}
      className={cn("animate-pulse rounded bg-gray-200", className)}
    />
  )
}

const SkeletonText = ({ lines = 3, className }: { lines?: number; className?: string }) => {

  return (
    <div role="status" aria-label="読み込み中" className={cn("space-y-2", className)}>
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className={cn("h-4 animate-pulse rounded bg-gray-200", i === lines - 1 ? "w-3/4" : "w-full")}
        />
      ))}
    </div>
  )
}

const SkeletonCard = ({ className }: { className?: string }) => {

  return (
    <div role="status" aria-label="読み込み中" className={cn("rounded-lg border border-gray-200 bg-white p-5", className)}>
      <div className="h-4 w-1/3 animate-pulse rounded bg-gray-200" />
      <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-gray-200" />
      <div className="mt-4 h-3 w-1/4 animate-pulse rounded bg-gray-200" />
    </div>
  )
}

export { Skeleton, SkeletonCard, SkeletonText }
