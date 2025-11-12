import type { SupabaseClient } from '../../db/supabase.client'
import type { ProfileDto } from '../../types'

export async function getPublicProfileByUserId(
  supabase: SupabaseClient,
  userId: string
): Promise<ProfileDto | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, display_name, created_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return null
  }

  return {
    userId: data.user_id,
    displayName: data.display_name,
    createdAt: data.created_at,
  }
}


