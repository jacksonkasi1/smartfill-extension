// ** import core packages
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

// ** import api
import { 
  fetchKnowledge, 
  fetchKnowledgeStats,
  createKnowledge, 
  uploadKnowledgeFile,
  deleteKnowledge 
} from '@/api/knowledge'

// ** import types

export function useKnowledge(page = 1, limit = 10, search = '') {
  return useQuery({
    queryKey: ['knowledge', page, limit, search],
    queryFn: () => fetchKnowledge({ page, limit, search }),
  })
}

export function useKnowledgeStats() {
  return useQuery({
    queryKey: ['knowledge-stats'],
    queryFn: fetchKnowledgeStats,
  })
}

export function useCreateKnowledge() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: any) => createKnowledge(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge'] })
      queryClient.invalidateQueries({ queryKey: ['knowledge-stats'] })
      toast.success('Knowledge created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create knowledge')
    },
  })
}

export function useUploadKnowledgeFile() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ file, title }: { file: File; title: string }) =>
      uploadKnowledgeFile(file, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge'] })
      queryClient.invalidateQueries({ queryKey: ['knowledge-stats'] })
      toast.success('File uploaded successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to upload file')
    },
  })
}

export function useDeleteKnowledge() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: deleteKnowledge,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge'] })
      queryClient.invalidateQueries({ queryKey: ['knowledge-stats'] })
      toast.success('Knowledge deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete knowledge')
    },
  })
}