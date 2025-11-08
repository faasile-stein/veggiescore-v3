import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function checkAdminAccess(userId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('admin_users')
    .select('role')
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    return { hasAccess: false, role: null }
  }

  return { hasAccess: true, role: data.role }
}

export async function checkPermission(userId: string, permission: string) {
  const supabase = createClient()

  const { data } = await supabase
    .from('admin_users')
    .select('role')
    .eq('user_id', userId)
    .single()

  if (!data) return false

  const ROLES = {
    admin: ['*'],
    moderator: ['view:places', 'edit:menus', 'ban:users'],
    content_editor: ['view:places', 'edit:menus'],
    data_ops: ['view:jobs', 'trigger:reprocess'],
  }

  const allowedPermissions = ROLES[data.role as keyof typeof ROLES] || []
  return allowedPermissions.includes('*') || allowedPermissions.includes(permission)
}
