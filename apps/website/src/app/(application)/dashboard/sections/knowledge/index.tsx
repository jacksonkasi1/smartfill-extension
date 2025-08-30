"use client"

// ** import components
import { DataTable } from "@/components/data-table/data-table"

// ** import utils
import { getColumns } from "./components/columns"
import { useExportConfig } from "./utils/config"
import { useKnowledgeData } from "./utils/data-fetching"

// ** import components
import { ToolbarOptions } from "./components/toolbar-options"


export default function KnowledgeTable() {
  const fetchKnowledgeByIds = async (ids: (string | number)[]) => {
    // This function would fetch knowledge items by their IDs
    // For now, return empty array - implement as needed
    console.log("Fetching knowledge by IDs:", ids)
    return []
  }

  return (
    <DataTable<any, unknown>
      getColumns={getColumns}
      exportConfig={useExportConfig()}
      fetchDataFn={useKnowledgeData}
      fetchByIdsFn={fetchKnowledgeByIds}
      idField="id"
      pageSizeOptions={[10, 20, 30, 40, 50, 100]}
      renderToolbarContent={({ selectedRows, allSelectedIds, totalSelectedCount, resetSelection }) => (
        <ToolbarOptions
          selectedKnowledge={selectedRows.map(row => ({
            id: row.id,
            title: row.title,
          }))}
          allSelectedKnowledgeIds={allSelectedIds}
          totalSelectedCount={totalSelectedCount}
          resetSelection={resetSelection}
        />
      )}
      config={{
        enableRowSelection: true,
        enableClickRowSelect: false,
        enableKeyboardNavigation: true,
        enableSearch: true,
        enableDateFilter: true,
        enableColumnVisibility: true,
        enableUrlState: true,
        size: "default",
        columnResizingTableId: "knowledge-table",
        searchPlaceholder: "Search knowledge"
      }}
    />
  )
}