'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

export default function Dashboard() {
  const [stats, setStats] = useState({
    places: 0,
    menus: 0,
    items: 0,
    pendingJobs: 0,
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    try {
      const [placesRes, menusRes, itemsRes, jobsRes] = await Promise.all([
        supabase.from('places').select('id', { count: 'exact', head: true }),
        supabase.from('menus').select('id', { count: 'exact', head: true }).eq('archived', false),
        supabase.from('menu_items').select('id', { count: 'exact', head: true }),
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      ])

      setStats({
        places: placesRes.count || 0,
        menus: menusRes.count || 0,
        items: itemsRes.count || 0,
        pendingJobs: jobsRes.count || 0,
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-primary">VeggieScore Admin</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold mb-6">Dashboard</h2>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-card border rounded-lg p-6">
            <div className="text-sm text-muted-foreground">Total Places</div>
            <div className="text-3xl font-bold mt-2">{stats.places}</div>
          </div>
          <div className="bg-card border rounded-lg p-6">
            <div className="text-sm text-muted-foreground">Active Menus</div>
            <div className="text-3xl font-bold mt-2">{stats.menus}</div>
          </div>
          <div className="bg-card border rounded-lg p-6">
            <div className="text-sm text-muted-foreground">Menu Items</div>
            <div className="text-3xl font-bold mt-2">{stats.items}</div>
          </div>
          <div className="bg-card border rounded-lg p-6">
            <div className="text-sm text-muted-foreground">Pending Jobs</div>
            <div className="text-3xl font-bold mt-2">{stats.pendingJobs}</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-card border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/dashboard/places"
              className="block p-4 border rounded-lg hover:bg-accent transition-colors"
            >
              <div className="font-semibold">Manage Places</div>
              <div className="text-sm text-muted-foreground mt-1">
                View and edit restaurants
              </div>
            </Link>
            <Link
              href="/dashboard/menus"
              className="block p-4 border rounded-lg hover:bg-accent transition-colors"
            >
              <div className="font-semibold">Manage Menus</div>
              <div className="text-sm text-muted-foreground mt-1">
                Edit menu items and labels
              </div>
            </Link>
            <Link
              href="/dashboard/jobs"
              className="block p-4 border rounded-lg hover:bg-accent transition-colors"
            >
              <div className="font-semibold">Job Queue</div>
              <div className="text-sm text-muted-foreground mt-1">
                Monitor processing jobs
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
