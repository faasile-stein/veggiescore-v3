'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import Link from 'next/link'

export default function PlaceDetailsPage() {
  const params = useParams()
  const [place, setPlace] = useState<any>(null)
  const [menus, setMenus] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (params.id) {
      loadPlace()
    }
  }, [params.id])

  async function loadPlace() {
    try {
      // Load place details
      const { data: placeData, error: placeError } = await supabase
        .from('places')
        .select('*')
        .eq('id', params.id)
        .single()

      if (placeError) throw placeError

      // Load menus
      const { data: menusData, error: menusError } = await supabase
        .from('menus')
        .select('id, menu_type, source_type, confidence_score, created_at')
        .eq('place_id', params.id)
        .eq('archived', false)
        .order('created_at', { ascending: false })

      if (menusError) throw menusError

      setPlace(placeData)
      setMenus(menusData || [])
    } catch (error) {
      console.error('Error loading place:', error)
    } finally {
      setLoading(false)
    }
  }

  async function triggerReprocess() {
    if (!confirm('Are you sure you want to reprocess this place?')) return

    try {
      // Archive existing menus
      await supabase
        .from('menus')
        .update({ archived: true })
        .eq('place_id', params.id)

      // Create new crawl job
      await supabase
        .from('jobs')
        .insert({
          job_type: 'crawl',
          payload: { place_id: params.id, force: true },
          priority: 100,
        })

      alert('Reprocess job enqueued successfully')
      loadPlace()
    } catch (error) {
      console.error('Error triggering reprocess:', error)
      alert('Failed to trigger reprocess')
    }
  }

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  if (!place) {
    return <div className="p-8">Place not found</div>
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard/places" className="text-primary hover:underline">
                ← Places
              </Link>
              <h1 className="text-xl font-bold">{place.name}</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Place Info */}
        <div className="bg-card border rounded-lg p-6 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Address</div>
              <div className="mt-1">{place.address || 'N/A'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Website</div>
              <div className="mt-1">
                {place.website ? (
                  <a href={place.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {place.website}
                  </a>
                ) : 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">VeggieScore</div>
              <div className="mt-1 text-2xl font-bold text-primary">
                {place.veggie_score || '-'}/100
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Cuisine Types</div>
              <div className="mt-1">{place.cuisine_types?.join(', ') || 'N/A'}</div>
            </div>
          </div>
          <div className="mt-6">
            <button
              onClick={triggerReprocess}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90"
            >
              Trigger Reprocess
            </button>
          </div>
        </div>

        {/* Menus */}
        <div className="bg-card border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Menus</h2>
          {menus.length === 0 ? (
            <p className="text-muted-foreground">No menus found</p>
          ) : (
            <div className="space-y-4">
              {menus.map((menu) => (
                <div key={menu.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold">{menu.menu_type || 'General'}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Source: {menu.source_type} • Confidence: {(menu.confidence_score * 100).toFixed(0)}%
                      </div>
                    </div>
                    <Link
                      href={`/dashboard/menus/${menu.id}`}
                      className="text-primary hover:underline"
                    >
                      Edit Items
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
