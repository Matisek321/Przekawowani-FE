import type { SupabaseClient } from '../../db/supabase.client'
import type { RoasteryCoffeeDto, RoasteryCoffeeListResponse } from '../../types'

export class RoasteryCoffeesServiceError extends Error {
	constructor(
		public code: 'roastery_not_found' | 'server_error',
		message: string
	) {
		super(message)
		this.name = 'RoasteryCoffeesServiceError'
	}
}

export async function fetchRoasteryCoffees(
	client: SupabaseClient,
	roasteryId: string,
	page: number,
	pageSize: number
): Promise<RoasteryCoffeeListResponse> {
	// 1) Verify roastery exists (distinct 404 vs "no coffees yet")
	const { data: roastery, error: roasteryError } = await client
		.from('roasteries')
		.select('id')
		.eq('id', roasteryId)
		.maybeSingle()

	if (roasteryError) {
		throw new RoasteryCoffeesServiceError('server_error', 'Failed to verify roastery')
	}
	if (!roastery) {
		throw new RoasteryCoffeesServiceError('roastery_not_found', 'Roastery not found')
	}

	const from = (page - 1) * pageSize
	const to = from + pageSize - 1

	const { data, count, error } = await client
		.from('coffee_aggregates')
		.select('coffee_id,name,avg_main,ratings_count,small_sample,created_at', {
			count: 'exact',
		})
		.eq('roastery_id', roasteryId)
		.order('avg_main', { ascending: false, nullsFirst: false })
		.order('ratings_count', { ascending: false, nullsFirst: false })
		.order('created_at', { ascending: false, nullsFirst: false })
		.order('name', { ascending: true, nullsFirst: false })
		.range(from, to)

	if (error) {
		throw new RoasteryCoffeesServiceError('server_error', 'Failed to fetch roastery coffees')
	}

	const items: RoasteryCoffeeDto[] = (data ?? [])
		.filter((row) => Boolean(row.coffee_id))
		.map((row) => ({
			id: row.coffee_id as string,
			name: row.name ?? '',
			avgMain: row.avg_main,
			ratingsCount: row.ratings_count ?? 0,
			smallSample: Boolean(row.small_sample),
			createdAt: row.created_at ?? new Date(0).toISOString(),
		}))

	return {
		page,
		pageSize,
		total: count ?? 0,
		items,
	}
}


