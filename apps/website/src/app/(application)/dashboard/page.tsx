// ** import core packages
'use client'
import React from 'react'

// ** import icons
import { FileText, Brain, Clock } from 'lucide-react'

// ** import shared components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// ** import components
import { HeroHeader } from '@/components/header'

export default function Dashboard() {
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

          <div className="grid gap-6 md:grid-cols-3">
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
                <div className="text-2xl font-bold">3</div>
                <p className="text-xs text-muted-foreground">Saved profiles</p>
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
        </div>
      </main>
    </>
  )
}