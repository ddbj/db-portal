import type { Dispatch } from "react"

import { useT } from "~/lib/i18n"
import { type AppliedFilter, AppliedFilters, DateFacet, FacetGroup, FacetRow, SidebarHeading } from "~/ui"

import type { DbSlug } from "../types"
import {
  FACET_ORGANISMS,
  FACET_STUDY_TYPES,
  FACET_SUBMITTERS,
  type FacetAction,
  type FacetState,
} from "./facet-state"

export type FacetPanelProps = {
  state: FacetState
  dispatch: Dispatch<FacetAction>
  db: DbSlug | null
}

export const FacetPanel = ({ state, dispatch, db }: FacetPanelProps) => {
  const t = useT()
  const perDbFacetsVisible = db !== null
  const applied: AppliedFilter[] = []
  for (const organism of state.organisms) {
    applied.push({
      label: t("search.facets.organism"),
      value: organism,
      onClear: () => dispatch({ type: "toggleOrganism", value: organism }),
    })
  }
  if (perDbFacetsVisible) {
    for (const submitter of state.submitters) {
      applied.push({
        label: t("search.facets.submitter"),
        value: submitter,
        onClear: () => dispatch({ type: "toggleSubmitter", value: submitter }),
      })
    }
    if (state.studyType) {
      applied.push({
        label: t("search.facets.studyType"),
        value: state.studyType,
        onClear: () => dispatch({ type: "setStudyType", value: null }),
      })
    }
  }

  return (
    <aside className="flex flex-col gap-4">
      <SidebarHeading>{t("search.facets.heading")}</SidebarHeading>
      <AppliedFilters
        applied={applied}
        onClearAll={() => dispatch({ type: "clear" })}
      />
      <FacetGroup label={t("search.facets.organism")} showMore>
        {FACET_ORGANISMS.map((organism) => (
          <FacetRow
            key={organism}
            type="checkbox"
            name="organism"
            label={organism}
            defaultChecked={state.organisms.includes(organism)}
            onChange={() => dispatch({ type: "toggleOrganism", value: organism })}
          />
        ))}
      </FacetGroup>
      {perDbFacetsVisible && (
        <>
          <FacetGroup
            label={t("search.facets.studyType")}
            appliedCount={state.studyType ? 1 : 0}
            {...(state.studyType
              ? { onClear: () => dispatch({ type: "setStudyType", value: null }) }
              : {})}
          >
            {FACET_STUDY_TYPES.map((studyType) => (
              <FacetRow
                key={studyType}
                type="radio"
                name="studyType"
                label={studyType}
                defaultChecked={state.studyType === studyType}
                onChange={() => dispatch({ type: "setStudyType", value: studyType })}
              />
            ))}
          </FacetGroup>
          <FacetGroup label={t("search.facets.submitter")} showMore>
            {FACET_SUBMITTERS.map((submitter) => (
              <FacetRow
                key={submitter}
                type="checkbox"
                name="submitter"
                label={submitter}
                defaultChecked={state.submitters.includes(submitter)}
                onChange={() => dispatch({ type: "toggleSubmitter", value: submitter })}
              />
            ))}
          </FacetGroup>
        </>
      )}
      <DateFacet
        label={t("search.facets.datePublished")}
        active={state.datePublished.active}
        appliedCount={state.datePublished.active === "all" && state.datePublished.from === "" && state.datePublished.to === "" ? 0 : 1}
        onClear={() => dispatch({ type: "setDateRange", active: "all" })}
        onRangeChange={(key) => dispatch({ type: "setDateRange", active: key })}
        from={state.datePublished.from}
        to={state.datePublished.to}
        onFromChange={(value) => dispatch({ type: "setDateFrom", value })}
        onToChange={(value) => dispatch({ type: "setDateTo", value })}
      />
    </aside>
  )
}
