// ** import core packages
import { useQuery, keepPreviousData } from "@tanstack/react-query"

// ** import apis  
import { fetchKnowledge } from "@/api/knowledge"

// ** import utils
import { preprocessSearch } from "@/components/data-table/utils"
import { CaseFormatConfig, DEFAULT_CASE_CONFIG } from "@/components/data-table/utils/case-utils"

/**
 * Hook to fetch knowledge with the current filters and pagination
 */
export function useKnowledgeData(
  page: number,
  pageSize: number,
  search: string,
  dateRange: { from_date: string; to_date: string },
  sortBy: string,
  sortOrder: string,
  caseConfig: CaseFormatConfig = DEFAULT_CASE_CONFIG
) {
  return useQuery({
    queryKey: [
      "knowledge",
      page,
      pageSize,
      preprocessSearch(search),
      dateRange,
      sortBy,
      sortOrder,
      caseConfig,
    ],
    queryFn: () =>
      fetchKnowledge({
        page,
        limit: pageSize,
        search: preprocessSearch(search),
        from_date: dateRange.from_date,
        to_date: dateRange.to_date,
        sort_by: sortBy,
        sort_order: sortOrder,
        caseConfig,
      }),
    placeholderData: keepPreviousData, // Keep previous data when fetching new data. If skeleton animation is needed when fetching data, comment this out.
  })
}

// Add a property to the function so we can use it with the DataTable component
useKnowledgeData.isQueryHook = true