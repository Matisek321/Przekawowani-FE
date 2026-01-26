import type { AuthError } from '@supabase/supabase-js'
import type { SupabaseClient } from '../../db/supabase.client'

export type AuthLoginResult = {
  user: {
    id: string
    email: string | null
  }
  session: {
    accessToken: string
    refreshToken: string
    expiresAt: number | null
  }
}

type AuthServiceError = Error & { code: string }

function createAuthError(code: string): AuthServiceError {
  const error = new Error(code) as AuthServiceError
  error.code = code
  return error
}

type RegisterResult = {
  user: {
    id: string
    email: string | null
  }
  requiresEmailConfirmation: boolean
}

function mapLoginErrorCode(error: AuthError): string {
  if (error.status === 429) return 'too_many_requests'

  const message = error.message.toLowerCase()
  if (message.includes('email not confirmed') || error.code === 'email_not_confirmed') {
    return 'email_not_confirmed'
  }
  if (error.status === 400 || error.status === 401 || message.includes('invalid')) {
    return 'invalid_credentials'
  }

  return 'internal_error'
}

function mapRegisterErrorCode(error: AuthError): string {
  if (error.status === 429) return 'too_many_requests'

  const message = error.message.toLowerCase()
  if (message.includes('already registered') || message.includes('user already')) {
    return 'email_taken'
  }
  if (message.includes('password') && message.includes('weak')) {
    return 'weak_password'
  }
  if (message.includes('invalid') && message.includes('email')) {
    return 'invalid_email'
  }

  return 'internal_error'
}

function mapResetErrorCode(error: AuthError): string {
  const message = error.message.toLowerCase()
  if (message.includes('expired') || message.includes('invalid')) {
    return 'invalid_token'
  }
  if (message.includes('password') && message.includes('weak')) {
    return 'weak_password'
  }
  return 'internal_error'
}

function mapForgotPasswordErrorCode(error: AuthError): string {
  if (error.status === 429) return 'too_many_requests'
  return 'internal_error'
}

export async function loginUser(
  supabase: SupabaseClient,
  email: string,
  password: string,
): Promise<AuthLoginResult> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw createAuthError(mapLoginErrorCode(error))
  }

  if (!data.user || !data.session) {
    throw createAuthError('internal_error')
  }

  return {
    user: {
      id: data.user.id,
      email: data.user.email ?? null,
    },
    session: {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at ?? null,
    },
  }
}

export async function registerUser(
  supabase: SupabaseClient,
  email: string,
  password: string,
): Promise<RegisterResult> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    throw createAuthError(mapRegisterErrorCode(error))
  }

  if (!data.user) {
    throw createAuthError('internal_error')
  }

  return {
    user: {
      id: data.user.id,
      email: data.user.email ?? null,
    },
    requiresEmailConfirmation: !data.session,
  }
}

export async function logoutUser(supabase: SupabaseClient): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) {
    throw createAuthError('internal_error')
  }
}

export async function sendPasswordResetEmail(
  supabase: SupabaseClient,
  email: string,
  redirectTo: string,
): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
  if (error) {
    throw createAuthError(mapForgotPasswordErrorCode(error))
  }
}

export async function updatePassword(
  supabase: SupabaseClient,
  newPassword: string,
): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) {
    throw createAuthError(mapResetErrorCode(error))
  }
}
