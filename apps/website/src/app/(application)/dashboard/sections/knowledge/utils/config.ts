// ** import core packages
import { useMemo } from "react"

// ** import utils
import { CaseFormatConfig } from "@/components/data-table/utils/case-utils"
import { DataTransformFunction } from "@/components/data-table/utils/export-utils"

// ** import types
import type { Knowledge, KnowledgeExportable } from "../schema"

/**
 * Default export configuration for the knowledge data table
 */
export function useExportConfig() {
  // Column mapping for export
  const columnMapping = useMemo(() => {
    return {
      id: "ID",
      userId: "User ID", 
      title: "Title",
      content: "Content",
      type: "Type",
      tags: "Tags",
      createdAt: "Created Date",
      updatedAt: "Updated Date",
    }
  }, [])
  
  // Column widths for Excel export
  const columnWidths = useMemo(() => {
    return [
      { wch: 15 }, // ID
      { wch: 15 }, // User ID
      { wch: 25 }, // Title
      { wch: 50 }, // Content
      { wch: 10 }, // Type
      { wch: 20 }, // Tags
      { wch: 20 }, // Created At
      { wch: 20 }, // Updated At
    ]
  }, [])
  
  // Headers for CSV export
  const headers = useMemo(() => {
    return [
      "id",
      "userId", 
      "title",
      "content",
      "type",
      "tags",
      "createdAt",
      "updatedAt",
    ]
  }, [])

  // Case formatting configuration for the table
  const caseConfig: CaseFormatConfig = useMemo(() => ({
    urlFormat: 'camelCase', // URL parameters use camelCase (sortBy, pageSize)
    apiFormat: 'snake_case', // API parameters use snake_case (sort_by, page_size)
  }), [])

  // Transformation function for formatting data
  const transformFunction: DataTransformFunction<any> = useMemo(() => (row: Knowledge): KnowledgeExportable => {
    return {
      ...row,
      // Format tags array to string for export
      tags: Array.isArray(row.tags) ? row.tags.join(", ") : String(row.tags),
      // Format dates to readable format
      createdAt: new Date(row.createdAt).toLocaleDateString(),
      updatedAt: new Date(row.updatedAt).toLocaleDateString(),
    }
  }, [])

  return {
    columnMapping,
    columnWidths,
    headers,
    entityName: "knowledge",
    caseConfig,
    transformFunction
  }
}