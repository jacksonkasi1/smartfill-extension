"use client"

// ** import core packages
import * as React from "react"
import { DotsHorizontalIcon } from "@radix-ui/react-icons"
import { Row } from "@tanstack/react-table"

// ** import ui components
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// ** import schema
import { knowledgeSchema } from "../schema"

// ** import components
import { DeleteKnowledgePopup } from "./actions/delete-knowledge-popup"
import { EditKnowledgePopup } from "./actions/edit-knowledge-popup"

interface DataTableRowActionsProps<TData> {
  row: Row<TData>
  table: any
}

export function DataTableRowActions<TData>({
  row,
  table,
}: DataTableRowActionsProps<TData>) {
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [editDialogOpen, setEditDialogOpen] = React.useState(false)
  const knowledge = knowledgeSchema.parse(row.original)

  const handleEdit = () => {
    setEditDialogOpen(true)
  }

  // Function to reset all selections
  const resetSelection = () => {
    table.resetRowSelection()
  }

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
          >
            <DotsHorizontalIcon className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[160px]">
          <DropdownMenuItem onClick={handleEdit}>Edit</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDeleteDialogOpen(true)}>
            Delete
            <DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <EditKnowledgePopup
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        knowledge={knowledge}
        resetSelection={resetSelection}
      />
      <DeleteKnowledgePopup
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        knowledgeId={knowledge.id}
        knowledgeTitle={knowledge.title}
        resetSelection={resetSelection}
      />
    </>
  )
}