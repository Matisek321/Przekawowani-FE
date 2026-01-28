import type { SupabaseClient } from '../../db/supabase.client'
import type { CoffeeDto } from '../../types'

type ListCoffeesParams = {
	page: number
	pageSize: number
	roasteryId?: string
	q?: string
	sort: 'rating_desc'
}

/**
 * Normalizes the search query (`q`) to match database `normalized_name`.
 * Mirrors DB normalization based on `unaccent_pl` mapping + `lower(trim(...))`.
 */
function normalizeCoffeeQuery(q: string): string {
	const from = 'ĄĆĘŁŃÓŚŹŻąćęłńóśźż'
	const to = 'ACELNOSZZacelnoszz'

	let out = q
	for (let i = 0; i < from.length; i++) {
		out = out.replaceAll(from[i]!, to[i]!)
	}

	return out.trim().toLowerCase()
}

export async function listCoffees(
	supabase: SupabaseClient,
	params: ListCoffeesParams
): Promise<{ items: CoffeeDto[]; total: number }> {
	const from = (params.page - 1) * params.pageSize
	const to = from + params.pageSize - 1

	let query = supabase
		.from('coffees')
		.select('id, roastery_id, name, avg_main, ratings_count, created_at', { count: 'exact' })
		// ranking order: avg_main desc (nulls last), ratings_count desc, id desc for stability
		.order('avg_main', { ascending: false, nullsFirst: false })
		.order('ratings_count', { ascending: false })
		.order('id', { ascending: false })
		.range(from, to)

	if (params.roasteryId) {
		query = query.eq('roastery_id', params.roasteryId)
	}

	if (params.q) {
		const normalizedQ = normalizeCoffeeQuery(params.q)
		query = query.ilike('normalized_name', `%${normalizedQ}%`)
	}

	// `sort` is whitelisted to 'rating_desc' by validation; kept for future-proofing.
	// eslint-disable-next-line @typescript-eslint/no-unused-expressions
	params.sort

	const { data, count, error } = await query
	if (error) {
		console.error('[coffees.service] Error listing coffees', { params, error })
		throw error
	}

	const items: CoffeeDto[] = (data ?? []).map((row) => ({
		id: row.id,
		roasteryId: row.roastery_id,
		name: row.name,
		avgMain: row.avg_main,
		ratingsCount: row.ratings_count,
		createdAt: row.created_at,
	}))

	return { items, total: count ?? 0 }
}

