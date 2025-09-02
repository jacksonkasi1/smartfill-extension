'use client'

// ** import core packages
import React, { useState } from 'react'
import { useForm } from 'react-hook-form'

// ** import ui components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

// ** import hooks
import { useCreateKnowledge, useUploadKnowledgeFile } from '@/hooks/use-knowledge'

interface KnowledgeUploadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function KnowledgeUploadModal({ open, onOpenChange }: KnowledgeUploadModalProps) {
  const [uploadMode, setUploadMode] = useState<'text' | 'file'>('text')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  
  const createKnowledgeMutation = useCreateKnowledge()
  const uploadFileMutation = useUploadKnowledgeFile()

  const form = useForm({
    defaultValues: {
      title: '',
      content: '',
      type: 'text' as const,
      tags: [],
    },
  })

  const onSubmit = async (data: any) => {
    try {
      if (uploadMode === 'file' && selectedFile) {
        await uploadFileMutation.mutateAsync({
          file: selectedFile,
          title: data.title,
        })
      } else {
        await createKnowledgeMutation.mutateAsync({
          ...data,
          type: 'text',
        })
      }
      
      // Reset form and close modal
      form.reset()
      setSelectedFile(null)
      setUploadMode('text')
      onOpenChange(false)
    } catch (error) {
      // Error handling is done in the mutation hooks
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Check if it's a .txt file
      if (file.type !== 'text/plain') {
        // You could show an error here
        return
      }
      setSelectedFile(file)
      // Auto-fill title with filename
      if (!form.getValues('title')) {
        form.setValue('title', file.name.replace('.txt', ''))
      }
    }
  }

  const isLoading = createKnowledgeMutation.isPending || uploadFileMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Upload Knowledge</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Upload Mode Toggle */}
          <div className="flex space-x-2">
            <Button
              type="button"
              variant={uploadMode === 'text' ? 'default' : 'outline'}
              onClick={() => setUploadMode('text')}
              size="sm"
            >
              Text Input
            </Button>
            <Button
              type="button"
              variant={uploadMode === 'file' ? 'default' : 'outline'}
              onClick={() => setUploadMode('file')}
              size="sm"
            >
              File Upload
            </Button>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {uploadMode === 'text' ? (
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Content</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter your knowledge content here..."
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium">File Upload</label>
                  <Input
                    type="file"
                    accept=".txt"
                    onChange={handleFileChange}
                    className="cursor-pointer"
                  />
                  {selectedFile && (
                    <p className="text-sm text-muted-foreground">
                      Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>
              )}

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
                  type="submit" 
                  disabled={
                    isLoading || 
                    (uploadMode === 'file' && !selectedFile) ||
                    (uploadMode === 'text' && !form.watch('content'))
                  }
                >
                  {isLoading ? 'Uploading...' : 'Upload'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}