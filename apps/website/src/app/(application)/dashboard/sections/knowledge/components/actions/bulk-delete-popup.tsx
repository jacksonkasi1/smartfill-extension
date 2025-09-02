"use client"

// ** import core packages
import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

// ** import ui components
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface BulkDeletePopupProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedKnowledge: { id: string; title: string }[]
  allSelectedIds?: (string | number)[]
  totalSelectedCount?: number
  resetSelection: () => void
}

export function BulkDeletePopup({
  open,
  onOpenChange,
  selectedKnowledge,
  allSelectedIds,
  totalSelectedCount,
  resetSelection,
}: BulkDeletePopupProps) {
  const queryClient = useQueryClient()
  const [isLoading, setIsLoading] = React.useState(false)

  const idsToDelete = allSelectedIds || selectedKnowledge.map(item => item.id)
  const itemCount = totalSelectedCount ?? selectedKnowledge.length

  const handleDelete = async () => {
    try {
      setIsLoading(true)
      
      // Delete knowledge items sequentially
      for (const id of idsToDelete) {
        const response = await fetch(`http://localhost:3001/api/v1/knowledge/${id}`, {
          method: 'DELETE',
        })
        
        const result = await response.json()
        
        if (!result.success) {
          throw new Error(`Failed to delete knowledge ID ${id}`)
        }
      }

      toast.success(
        itemCount === 1
          ? "Knowledge deleted successfully"
          : `${itemCount} knowledge items deleted successfully`
      )

      onOpenChange(false)
      resetSelection()
      await queryClient.invalidateQueries({ queryKey: ["knowledge"] })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete knowledge items")
    } finally {
      setIsLoading(false)
    }
  }

  const getDialogTitle = () => {
    if (itemCount === 1) {
      return "Delete Knowledge"
    }
    return "Delete Knowledge Items"
  }

  const getDialogDescription = () => {
    if (itemCount === 1 && selectedKnowledge.length === 1) {
      return `Are you sure you want to delete "${selectedKnowledge[0].title}"? This action cannot be undone.`
    }
    return `Are you sure you want to delete ${itemCount} knowledge items? This action cannot be undone.`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
          <DialogDescription>{getDialogDescription()}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading}
          >
            {isLoading ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}