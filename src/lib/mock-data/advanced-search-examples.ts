import {
  createConditionNode,
  createGroupNode,
} from "@/lib/advanced-search/tree"
import type {
  AdvancedExample,
  AdvancedGroupNode,
} from "@/lib/advanced-search/types"
import { ALL_DB_VALUE } from "@/lib/search-url"
import type { AdvancedCondition } from "@/types/search"

const cond = createConditionNode

const makeRoot = (
  children: AdvancedGroupNode["children"],
): AdvancedGroupNode => ({
  ...createGroupNode("AND"),
  id: "root",
  children,
})

const nested = (
  logic: "AND" | "OR" | "NOT",
  conditions: AdvancedCondition[],
): AdvancedGroupNode => ({
  ...createGroupNode(logic),
  children: conditions.map((c) => cond(c)),
})

export const ADVANCED_EXAMPLES: readonly AdvancedExample[] = [
  {
    id: "cross-tier1",
    labelKey: "routes.advancedSearch.examples.cross-tier1.label",
    db: ALL_DB_VALUE,
    tree: makeRoot([
      cond({ field: "title", operator: "contains", value: "cancer" }),
      cond({ field: "organism", operator: "equals", value: "Homo sapiens" }),
    ]),
  },
  {
    id: "bioproject-tier3",
    labelKey: "routes.advancedSearch.examples.bioproject-tier3.label",
    db: "bioproject",
    tree: makeRoot([
      cond({
        field: "project_type",
        operator: "equals",
        value: "Genome sequencing",
      }),
      cond({ field: "organism", operator: "equals", value: "Homo sapiens" }),
    ]),
  },
  {
    id: "date-between",
    labelKey: "routes.advancedSearch.examples.date-between.label",
    db: ALL_DB_VALUE,
    tree: makeRoot([
      cond({
        field: "date_published",
        operator: "between",
        value: { from: "2020-01-01", to: "2024-12-31" },
      }),
    ]),
  },
  {
    id: "or-compound",
    labelKey: "routes.advancedSearch.examples.or-compound.label",
    db: ALL_DB_VALUE,
    tree: makeRoot([
      nested("OR", [
        { field: "title", operator: "contains", value: "cancer" },
        { field: "title", operator: "contains", value: "tumor" },
      ]),
      cond({ field: "organism", operator: "equals", value: "Homo sapiens" }),
    ]),
  },
  {
    id: "single-tier1",
    labelKey: "routes.advancedSearch.examples.single-tier1.label",
    db: "biosample",
    tree: makeRoot([
      cond({
        field: "description",
        operator: "contains",
        value: "gut microbiome",
      }),
    ]),
  },
  {
    id: "identifier-wildcard",
    labelKey: "routes.advancedSearch.examples.identifier-wildcard.label",
    db: "bioproject",
    tree: makeRoot([
      cond({
        field: "identifier",
        operator: "wildcard",
        value: "PRJDB*",
      }),
    ]),
  },
]
