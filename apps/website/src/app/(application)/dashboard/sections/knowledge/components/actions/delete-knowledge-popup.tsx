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

interface DeleteKnowledgePopupProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  knowledgeId: string
  knowledgeTitle: string
  resetSelection?: () => void
}

export function DeleteKnowledgePopup({
  open,
  onOpenChange,
  knowledgeId,
  knowledgeTitle,
  resetSelection,
}: DeleteKnowledgePopupProps) {
  const queryClient = useQueryClient()
  const [isLoading, setIsLoading] = React.useState(false)

  const handleDelete = async () => {
    try {
      setIsLoading(true)
      
      const response = await fetch(`http://localhost:3001/api/v1/knowledge/${knowledgeId}`, {
        method: 'DELETE',
      })
      
      const result = await response.json()

      if (result.success) {
        toast.success("Knowledge deleted successfully")
        onOpenChange(false)
        
        if (resetSelection) {
          resetSelection()
        }
        
        await queryClient.invalidateQueries({ queryKey: ["knowledge"] })
      } else {
        toast.error(result.error || "Failed to delete knowledge")
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete knowledge")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Delete Knowledge</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{knowledgeTitle}"? This action cannot be undone.
          </DialogDescription>
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