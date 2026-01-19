import type { SupabaseClient } from '../../db/supabase.client'
import type { CoffeeDetailDto, CoffeeDto, CreateCoffeeCommand } from '../../types'

/**
 * Custom error class for domain-specific coffee service errors.
 */
export class CoffeeServiceError extends Error {
	constructor(
		public readonly code: 'roastery_not_found' | 'coffee_duplicate' | 'server_error',
		message: string
	) {
		super(message)
		this.name = 'CoffeeServiceError'
	}
}

/**
 * Fetches a single coffee detail from the aggregated view (`coffee_aggregates`).
 * Returns null when the coffee doesn't exist.
 *
 * @param supabase - The Supabase client instance
 * @param id - Coffee UUID
 */
export async function getCoffeeById(
	supabase: SupabaseClient,
	id: string
): Promise<CoffeeDetailDto | null> {
	const { data, error } = await supabase
		.from('coffee_aggregates')
		.select('coffee_id, roastery_id, name, avg_main, ratings_count, small_sample, created_at')
		.eq('coffee_id', id)
		.maybeSingle()

	if (error) {
		console.error('[coffee.service] Error fetching coffee by id', { id, error })
		throw new CoffeeServiceError('server_error', 'Failed to fetch coffee')
	}

	if (!data) return null

	// Defensive guards: the view is typed as nullable, but domain DTO is not.
	if (
		!data.coffee_id ||
		!data.roastery_id ||
		!data.name ||
		data.ratings_count == null ||
		!data.created_at
	) {
		console.error('[coffee.service] Unexpected nullable fields in coffee_aggregates row', { id, data })
		throw new CoffeeServiceError('server_error', 'Failed to fetch coffee')
	}

	const dto: CoffeeDetailDto = {
		id: data.coffee_id,
		roasteryId: data.roastery_id,
		name: data.name,
		avgMain: data.avg_main,
		ratingsCount: data.ratings_count,
		smallSample: data.small_sample ?? data.ratings_count < 3,
		createdAt: data.created_at,
	}

	return dto
}

/**
 * Creates a new coffee for a given roastery.
 *
 * @param supabase - The Supabase client instance
 * @param roasteryId - The UUID of the roastery
 * @param cmd - The command containing the coffee name
 * @returns The created coffee as CoffeeDto
 * @throws CoffeeServiceError with code:
 *   - 'roastery_not_found' if the roastery doesn't exist
 *   - 'coffee_duplicate' if a coffee with the same normalized name exists in the roastery
 *   - 'server_error' for unexpected errors
 */
export async function createCoffee(
	supabase: SupabaseClient,
	roasteryId: string,
	cmd: CreateCoffeeCommand
): Promise<CoffeeDto> {
	// 1) Verify roastery exists
	const { data: roastery, error: roasteryError } = await supabase
		.from('roasteries')
		.select('id')
		.eq('id', roasteryId)
		.maybeSingle()

	if (roasteryError) {
		console.error('[coffee.service] Error checking roastery existence', { roasteryId, error: roasteryError })
		throw new CoffeeServiceError('server_error', 'Failed to verify roastery')
	}

	if (!roastery) {
		throw new CoffeeServiceError('roastery_not_found', `Roastery with id ${roasteryId} not found`)
	}

	// 2) Insert coffee
	const { data: coffee, error: insertError } = await supabase
		.from('coffees')
		.insert({
			roastery_id: roasteryId,
			name: cmd.name,
		})
		.select('id, roastery_id, name, avg_main, ratings_count, created_at')
		.single()

	if (insertError) {
		// Handle unique constraint violation (PostgreSQL error code 23505)
		if (insertError.code === '23505') {
			throw new CoffeeServiceError('coffee_duplicate', `Coffee with name "${cmd.name}" already exists in this roastery`)
		}

		console.error('[coffee.service] Error inserting coffee', { roasteryId, cmd, error: insertError })
		throw new CoffeeServiceError('server_error', 'Failed to create coffee')
	}

	// 3) Map to CoffeeDto
	const dto: CoffeeDto = {
		id: coffee.id,
		roasteryId: coffee.roastery_id,
		name: coffee.name,
		avgMain: coffee.avg_main,
		ratingsCount: coffee.ratings_count,
		smallSample: coffee.ratings_count < 3,
		createdAt: coffee.created_at,
	}

	return dto
}
