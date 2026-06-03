import type { ServiceCategory } from "~/lib/api"

type ServiceCategoryLabelKey = `services.category.${ServiceCategory}`

export const serviceCategoryLabelKey = (
  category: ServiceCategory,
): ServiceCategoryLabelKey => `services.category.${category}` as ServiceCategoryLabelKey
