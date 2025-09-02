"use client"

// ** import core packages
import { format } from "date-fns"
import { ColumnDef } from "@tanstack/react-table"

// ** import ui components
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"

// ** import utils
import { DataTableColumnHeader } from "@/components/data-table/column-header"

// ** import schema
import { Knowledge } from "../schema"

// ** import components
import { DataTableRowActions } from "./row-actions"

export const getColumns = (
  handleRowDeselection: ((rowId: string) => void) | null | undefined
): ColumnDef<Knowledge>[] => {
  // Base columns without the select column
  const baseColumns: ColumnDef<Knowledge>[] = [
    {
      accessorKey: "id",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="ID" />
      ),
      cell: ({ row }) => (
        <div className="truncate text-left font-mono text-xs">
          {(row.getValue("id") as string).slice(0, 8)}...
        </div>
      ),
      size: 100,
    },
    {
      accessorKey: "title",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Title" />
      ),
      cell: ({ row }) => (
        <div className="font-medium truncate text-left">
          {row.getValue("title")}
        </div>
      ),
      size: 250,
    },
    {
      accessorKey: "content",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Content" />
      ),
      cell: ({ row }) => {
        const content = row.getValue("content") as string
        const preview = content.length > 50 ? `${content.slice(0, 50)}...` : content
        return (
          <div className="truncate text-left text-muted-foreground">
            {preview}
          </div>
        )
      },
      size: 300,
    },
    {
      accessorKey: "type",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Type" />
      ),
      cell: ({ row }) => {
        const type = row.getValue("type") as string
        return (
          <Badge variant={type === "file" ? "default" : "outline"}>
            {type}
          </Badge>
        )
      },
      size: 80,
    },
    {
      accessorKey: "tags",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Tags" />
      ),
      cell: ({ row }) => {
        const tags = row.getValue("tags") as string[]
        if (!tags || tags.length === 0) {
          return <div className="text-muted-foreground">No tags</div>
        }
        return (
          <div className="flex gap-1 flex-wrap">
            {tags.slice(0, 2).map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {tags.length > 2 && (
              <Badge variant="secondary" className="text-xs">
                +{tags.length - 2}
              </Badge>
            )}
          </div>
        )
      },
      size: 150,
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Created" />
      ),
      cell: ({ row }) => {
        const date = new Date(row.getValue("createdAt"))
        const formattedDate = format(date, "MMM d, yyyy")
        return (
          <div className="max-w-full text-left truncate">{formattedDate}</div>
        )
      },
      size: 120,
    },
    {
      accessorKey: "updatedAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Updated" />
      ),
      cell: ({ row }) => {
        const date = new Date(row.getValue("updatedAt"))
        const formattedDate = format(date, "MMM d, yyyy")
        return (
          <div className="max-w-full text-left truncate">{formattedDate}</div>
        )
      },
      size: 120,
    },
    {
      id: "actions",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Actions" />
      ),
      cell: ({ row, table }) => <DataTableRowActions row={row} table={table} />,
      size: 100,
    },
  ]

  // Only include the select column if row selection is enabled
  if (handleRowDeselection !== null) {
    return [
      {
        id: "select",
        header: ({ table }) => (
          <div className="pl-2 truncate">
            <Checkbox
              checked={
                table.getIsAllPageRowsSelected() ||
                (table.getIsSomePageRowsSelected() && "indeterminate")
              }
              onCheckedChange={(value) =>
                table.toggleAllPageRowsSelected(!!value)
              }
              aria-label="Select all"
              className="translate-y-0.5 cursor-pointer"
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="truncate">
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => {
                if (value) {
                  row.toggleSelected(true)
                } else {
                  row.toggleSelected(false)
                  if (handleRowDeselection) {
                    handleRowDeselection(row.id)
                  }
                }
              }}
              aria-label="Select row"
              className="translate-y-0.5 cursor-pointer"
            />
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
        size: 50,
      },
      ...baseColumns,
    ]
  }

  return baseColumns
}