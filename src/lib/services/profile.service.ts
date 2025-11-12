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

export async function setDisplayNameOnce(
  supabase: SupabaseClient,
  userId: string,
  displayName: string
): Promise<ProfileDto> {
  const { data: existing, error: selErr } = await supabase
    .from('profiles')
    .select('user_id, display_name, created_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (selErr) {
    throw selErr
  }

  if (!existing) {
    const { data, error } = await supabase
      .from('profiles')
      .insert({ user_id: userId, display_name: displayName })
      .select('user_id, display_name, created_at')
      .single()

    if (error) {
      throw error
    }

    return {
      userId: data.user_id,
      displayName: data.display_name,
      createdAt: data.created_at,
    }
  }

  if (existing.display_name !== null) {
    const err = new Error('display_name_already_set') as Error & { code?: string }
    err.code = 'display_name_already_set'
    throw err
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ display_name: displayName })
    .eq('user_id', userId)
    .is('display_name', null)
    .select('user_id, display_name, created_at')
    .single()

  if (error) {
    throw error
  }

  return {
    userId: data.user_id,
    displayName: data.display_name,
    createdAt: data.created_at,
  }
}


