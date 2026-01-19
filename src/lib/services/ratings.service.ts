import type { SupabaseClient } from '../../db/supabase.client'
import type { Tables } from '../../db/database.types'
import type { MyRatingDto, UpsertRatingCommand } from '../../types'
import { fromDbSmallint, toDbSmallint } from '../ratingScale'

type RatingDbRow = Pick<
	Tables<'ratings'>,
	| 'id'
	| 'coffee_id'
	| 'user_id'
	| 'main'
	| 'strength'
	| 'acidity'
	| 'aftertaste'
	| 'created_at'
	| 'updated_at'
>

export class RatingsServiceError extends Error {
	constructor(
		public readonly code: 'coffee_not_found' | 'server_error',
		message: string,
		public readonly cause?: unknown
	) {
		super(message)
		this.name = 'RatingsServiceError'
	}
}

/**
 * Verifies that a coffee exists in `public.coffees`.
 * Throws `RatingsServiceError('coffee_not_found')` when missing.
 */
export async function findCoffeeById(supabase: SupabaseClient, id: string): Promise<void> {
	const { data, error } = await supabase.from('coffees').select('id').eq('id', id).maybeSingle()

	if (error) {
		console.error('[ratings.service] Error checking coffee existence', { id, error })
		throw new RatingsServiceError('server_error', 'Failed to verify coffee existence', error)
	}

	if (!data) {
		throw new RatingsServiceError('coffee_not_found', `Coffee with id ${id} not found`)
	}
}

/**
 * Fetches the authenticated user's rating for a coffee.
 * Returns null when there is no rating yet.
 *
 * NOTE: RLS is disabled by migrations, so the (coffee_id, user_id) filter
 * must always be enforced server-side to prevent IDOR.
 */
export async function getMyRatingForCoffee(
	supabase: SupabaseClient,
	coffeeId: string,
	userId: string
): Promise<MyRatingDto | null> {
	const { data, error } = await supabase
		.from('ratings')
		.select('id, user_id, coffee_id, main, strength, acidity, aftertaste, created_at, updated_at')
		.eq('coffee_id', coffeeId)
		.eq('user_id', userId)
		.maybeSingle()

	if (error) {
		console.error('[ratings.service] Error fetching my rating for coffee', { userId, coffeeId, error })
		throw new RatingsServiceError('server_error', 'Failed to fetch rating', error)
	}

	if (!data) return null

	return toMyRatingDto(data)
}

/**
 * Creates or updates the current user's rating for a coffee (upsert on (user_id, coffee_id)).
 * Returns the persisted DB row representation.
 */
export async function upsertMyRating(
	supabase: SupabaseClient,
	userId: string,
	coffeeId: string,
	cmd: UpsertRatingCommand
): Promise<RatingDbRow> {
	const payload = {
		user_id: userId,
		coffee_id: coffeeId,
		main: toDbSmallint(cmd.main),
		strength: toDbSmallint(cmd.strength),
		acidity: toDbSmallint(cmd.acidity),
		aftertaste: toDbSmallint(cmd.aftertaste),
	}

	const { data, error } = await supabase
		.from('ratings')
		.upsert(payload, { onConflict: 'user_id,coffee_id' })
		.select('id, user_id, coffee_id, main, strength, acidity, aftertaste, created_at, updated_at')
		.single()

	if (error) {
		console.error('[ratings.service] Error upserting rating', { userId, coffeeId, error })
		throw new RatingsServiceError('server_error', 'Failed to upsert rating', error)
	}

	return data
}

/**
 * Maps DB rating row (×2 scale) to the public DTO (0.5 step scale).
 */
export function toMyRatingDto(row: RatingDbRow): MyRatingDto {
	return {
		id: row.id,
		coffeeId: row.coffee_id,
		userId: row.user_id,
		main: fromDbSmallint(row.main),
		strength: fromDbSmallint(row.strength),
		acidity: fromDbSmallint(row.acidity),
		aftertaste: fromDbSmallint(row.aftertaste),
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	}
}

