'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      router.push('/login')
      return
    }

    // Check if user is admin
    const { data } = await supabase
      .from('admin_users')
      .select('role')
      .eq('user_id', session.user.id)
      .single()

    if (!data) {
      router.push('/unauthorized')
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">VeggieScore Admin</h1>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}
