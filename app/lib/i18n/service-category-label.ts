import type { ServiceCategory } from "~/lib/api"

export type ServiceCategoryLabelKey = `services.category.${ServiceCategory}`

export const serviceCategoryLabelKey = (
  category: ServiceCategory,
): ServiceCategoryLabelKey => `services.category.${category}` as ServiceCategoryLabelKey
