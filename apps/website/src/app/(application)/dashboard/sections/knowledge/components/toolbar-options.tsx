"use client"

// ** import core packages
import * as React from "react"
import { TrashIcon } from "lucide-react"

// ** import ui components
import { Button } from "@/components/ui/button"

// ** import components
import { AddKnowledgePopup } from "./actions/add-knowledge-popup"
import { BulkDeletePopup } from "./actions/bulk-delete-popup"

interface ToolbarOptionsProps {
  selectedKnowledge: { id: string; title: string }[]
  allSelectedKnowledgeIds?: (string | number)[]
  totalSelectedCount: number
  resetSelection: () => void
}

export const ToolbarOptions = ({
  selectedKnowledge,
  allSelectedKnowledgeIds = [],
  totalSelectedCount,
  resetSelection,
}: ToolbarOptionsProps) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  
  const selectionCount = totalSelectedCount || selectedKnowledge.length
  
  const selectedIds = allSelectedKnowledgeIds.length > 0 
    ? allSelectedKnowledgeIds 
    : selectedKnowledge.map(item => item.id)

  return (
    <div className="flex items-center gap-2">
      <AddKnowledgePopup />
      
      {selectionCount > 0 && (
        <>
          <Button 
            variant="outline"
            size="default"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <TrashIcon className="mr-2 size-4" aria-hidden="true" />
            Delete ({selectionCount})
          </Button>

          <BulkDeletePopup
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            selectedKnowledge={selectedKnowledge}
            allSelectedIds={selectedIds}
            totalSelectedCount={selectionCount}
            resetSelection={resetSelection}
          />
        </>
      )}
    </div>
  )
}