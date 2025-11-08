'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import Link from 'next/link'

export default function MenuEditorPage() {
  const params = useParams()
  const [menu, setMenu] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [editingItem, setEditingItem] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (params.id) {
      loadMenu()
    }
  }, [params.id])

  async function loadMenu() {
    try {
      const { data: menuData, error: menuError } = await supabase
        .from('menus')
        .select('*, places(name)')
        .eq('id', params.id)
        .single()

      if (menuError) throw menuError

      const { data: itemsData, error: itemsError } = await supabase
        .from('menu_items')
        .select('*')
        .eq('menu_id', params.id)
        .order('section')

      if (itemsError) throw itemsError

      setMenu(menuData)
      setItems(itemsData || [])
    } catch (error) {
      console.error('Error loading menu:', error)
    } finally {
      setLoading(false)
    }
  }

  async function saveItem(item: any) {
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({
          name: item.name,
          description: item.description,
          price: item.price,
          dietary_labels: item.dietary_labels,
        })
        .eq('id', item.id)

      if (error) throw error

      // Log audit trail
      await supabase.from('admin_audit_logs').insert({
        action: 'edit_menu_item',
        resource_type: 'menu_item',
        resource_id: item.id,
        after: { name: item.name, description: item.description },
      })

      setEditingItem(null)
      loadMenu()
      alert('Item updated successfully')
    } catch (error) {
      console.error('Error saving item:', error)
      alert('Failed to save item')
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
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-primary hover:underline">
                ← Dashboard
              </Link>
              <h1 className="text-xl font-bold">
                {menu?.places?.name} - Menu Editor
              </h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-card border rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Labels</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4">
                    {editingItem?.id === item.id ? (
                      <input
                        type="text"
                        value={editingItem.name}
                        onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                        className="w-full px-2 py-1 border rounded"
                      />
                    ) : (
                      <div className="font-medium">{item.name}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingItem?.id === item.id ? (
                      <textarea
                        value={editingItem.description || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                        className="w-full px-2 py-1 border rounded"
                        rows={2}
                      />
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        {item.description || 'N/A'}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingItem?.id === item.id ? (
                      <input
                        type="number"
                        step="0.01"
                        value={editingItem.price || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, price: parseFloat(e.target.value) })}
                        className="w-20 px-2 py-1 border rounded"
                      />
                    ) : (
                      item.price ? `${item.currency} ${item.price}` : 'N/A'
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {item.dietary_labels?.map((label: string) => (
                        <span
                          key={label}
                          className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingItem?.id === item.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveItem(editingItem)}
                          className="text-primary hover:underline"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingItem(null)}
                          className="text-muted-foreground hover:underline"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingItem(item)}
                        className="text-primary hover:underline"
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
