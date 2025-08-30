"use client"

// ** import core packages
import * as React from "react"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { useQueryClient } from "@tanstack/react-query"

// ** import ui components
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

export function AddKnowledgePopup() {
  const [open, setOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [activeTagIndex, setActiveTagIndex] = React.useState<number | null>(null)
  const queryClient = useQueryClient()

  const form = useForm<FormValues>({
    defaultValues: {
      title: "",
      content: "",
      tags: [],
    },
  })

  const onSubmit = async (data: FormValues) => {
    // Basic validation
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
      
      const response = await fetch("http://localhost:3001/api/v1/knowledge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: data.title,
          content: data.content,
          tags: data.tags.map(tag => tag.text),
          type: "text",
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success("Knowledge added successfully")
        form.reset()
        setOpen(false)
        await queryClient.invalidateQueries({ queryKey: ["knowledge"] })
      } else {
        toast.error(result.error || "Failed to add knowledge")
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add knowledge"
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="default">
          Add Knowledge
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Knowledge</DialogTitle>
          <DialogDescription>
            Create a new knowledge entry with title, content and optional tags.
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
                onClick={() => setOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Adding..." : "Add Knowledge"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}