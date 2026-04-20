import { Construction } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button, EmptyState } from "@/components/ui"

interface DetailPlaceholderProps {
  onBackToOverview: () => void
}

// 具体レベル TSX が未実装の leaf 向け placeholder。
// EmptyState を再利用し、親カードの概要レベルへ戻るアクションを用意。
const DetailPlaceholder = ({ onBackToOverview }: DetailPlaceholderProps) => {
  const { t } = useTranslation()

  return (
    <EmptyState
      icon={<Construction className="h-12 w-12" aria-hidden="true" />}
      title={t("routes.submit.detail.placeholder.title")}
      description={t("routes.submit.detail.placeholder.description")}
      action={
        <Button variant="secondary" onClick={onBackToOverview}>
          {t("routes.submit.detail.placeholder.action")}
        </Button>
      }
    />
  )
}

export default DetailPlaceholder
