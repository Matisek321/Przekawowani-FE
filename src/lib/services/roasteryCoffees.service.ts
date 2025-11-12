import type { SupabaseClient } from '../../db/supabase.client'
import type { RoasteryCoffeeDto } from '../../types'

export async function fetchRoasteryCoffees(
	client: SupabaseClient,
	roasteryId: string,
	page: number,
	pageSize: number
): Promise<{ items: RoasteryCoffeeDto[]; total: number }> {
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
		throw error
	}

	const items: RoasteryCoffeeDto[] =
		(data ?? []).map((row) => ({
			id: row.coffee_id ?? '',
			name: row.name ?? '',
			avgMain: row.avg_main,
			ratingsCount: row.ratings_count ?? 0,
			smallSample: Boolean(row.small_sample),
			createdAt: row.created_at ?? new Date(0).toISOString(),
		})) ?? []

	return {
		items,
		total: count ?? 0,
	}
}


