// ** import core packages
'use client'
import React, { useState } from 'react'

// ** import icons
import { FileText, Brain, Clock, Upload } from 'lucide-react'

// ** import ui components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

// ** import components
import { HeroHeader } from '@/components/header'
import { KnowledgeUploadModal } from '@/components/knowledge/knowledge-upload-modal'
import KnowledgeTable from './sections/knowledge'

// ** import hooks
import { useKnowledgeStats } from '@/hooks/use-knowledge'

export default function Dashboard() {
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const { data: knowledgeStats } = useKnowledgeStats()

  return (
    <>
      <HeroHeader />
      <main className="min-h-screen bg-background">
        <div className="container mx-auto max-w-6xl px-6 py-8 pt-24">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Your SmartFill overview
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Forms Filled</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">24</div>
                <p className="text-xs text-muted-foreground">+12 from last week</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Knowledge</CardTitle>
                <Brain className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(knowledgeStats as any)?.total || 0}</div>
                <p className="text-xs text-muted-foreground">Saved entries</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sessions</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2.4h</div>
                <p className="text-xs text-muted-foreground">Time saved</p>
              </CardContent>
            </Card>
          </div>

          {/* Knowledge Management Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Knowledge Management</h2>
              <Button onClick={() => setUploadModalOpen(true)} size="sm">
                <Upload className="w-4 h-4 mr-2" />
                Upload Knowledge
              </Button>
            </div>
            
            <KnowledgeTable />
          </div>

          <KnowledgeUploadModal 
            open={uploadModalOpen}
            onOpenChange={setUploadModalOpen}
          />
        </div>
      </main>
    </>
  )
}