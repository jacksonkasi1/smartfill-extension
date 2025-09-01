"use client"

// ** import core packages
import * as React from "react"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { useQueryClient } from "@tanstack/react-query"

// ** import apis
import { updateKnowledge } from "@/api/knowledge"

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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { TagInput } from "emblor"

type Tag = {
  id: string
  text: string
}

type FormValues = {
  title: string
  content: string
  tags: Tag[]
}

interface EditKnowledgePopupProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  knowledge: {
    id: string
    title: string
    content: string
    tags?: string[]
  }
  resetSelection: () => void
}

export function EditKnowledgePopup({
  open,
  onOpenChange,
  knowledge,
  resetSelection,
}: EditKnowledgePopupProps) {
  const [isLoading, setIsLoading] = React.useState(false)
  const [activeTagIndex, setActiveTagIndex] = React.useState<number | null>(null)
  const queryClient = useQueryClient()

  const form = useForm<FormValues>({
    defaultValues: {
      title: knowledge.title,
      content: knowledge.content,
      tags: knowledge.tags?.map((tag, index) => ({ id: index.toString(), text: tag })) || [],
    },
  })

  React.useEffect(() => {
    if (open) {
      form.reset({
        title: knowledge.title,
        content: knowledge.content,
        tags: knowledge.tags?.map((tag, index) => ({ id: index.toString(), text: tag })) || [],
      })
    }
  }, [open, knowledge, form])

  const onSubmit = async (data: FormValues) => {
    if (!data.title?.trim()) {
      toast.error("Title is required")
      return
    }
    if (!data.content?.trim()) {
      toast.error("Content is required")
      return
    }
    
    try {
      setIsLoading(true)
      
      const result = await updateKnowledge(knowledge.id, {
        title: data.title,
        content: data.content,
        tags: data.tags.map(tag => tag.text),
        type: "text",
      })

      if (result.success) {
        toast.success("Knowledge updated successfully")
        onOpenChange(false)
        resetSelection()
        await queryClient.invalidateQueries({ queryKey: ["knowledge"] })
      } else {
        toast.error(result.error || "Failed to update knowledge")
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update knowledge"
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Knowledge</DialogTitle>
          <DialogDescription>
            Update the knowledge entry with new information.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter title" 
                      {...field}
                      required
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter content" 
                      className="min-h-[100px]"
                      {...field}
                      required
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags</FormLabel>
                  <FormControl>
                    <TagInput
                      placeholder="Enter tags..."
                      tags={field.value}
                      setTags={(tags) => field.onChange(tags)}
                      activeTagIndex={activeTagIndex}
                      setActiveTagIndex={setActiveTagIndex}
                      className="sm:min-w-[450px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Updating..." : "Update Knowledge"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}