import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '../../db/supabase.client'
import type { Database } from '../../db/database.types'

type AccountServiceError = Error & { code: string }

function createAccountError(code: string): AccountServiceError {
  const error = new Error(code) as AccountServiceError
  error.code = code
  return error
}

/**
 * Deletes a user account completely:
 * 1. Deletes the user's profile (cascades to delete ratings via FK)
 * 2. Deletes the user from Supabase Auth
 */
export async function deleteAccount(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  // First, delete the profile (this will cascade delete ratings)
  const { error: profileError } = await supabase
    .from('profiles')
    .delete()
    .eq('user_id', userId)

  if (profileError) {
    console.error('Failed to delete profile:', profileError)
    throw createAccountError('delete_profile_failed')
  }

  // Then, delete the user from Supabase Auth using admin client
  const supabaseAdmin = createClient<Database>(
    import.meta.env.SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)

  if (authError) {
    console.error('Failed to delete auth user:', authError)
    throw createAccountError('delete_auth_user_failed')
  }
}
