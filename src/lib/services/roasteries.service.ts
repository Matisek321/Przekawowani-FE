import type { SupabaseClient } from '../../db/supabase.client'
import type { RoasteryDto } from '../../types'

type ListParams = {
	qNorm?: string
	cityNorm?: string
	page: number
	pageSize: number
}

export async function listRoasteries(
	client: SupabaseClient,
	params: ListParams
): Promise<{ items: RoasteryDto[]; total: number }> {
	const from = (params.page - 1) * params.pageSize
	const to = from + params.pageSize - 1

	let query = client
		.from('roasteries')
		.select('id,name,city,created_at', { count: 'exact' })
		.order('name', { ascending: true })
		.order('id', { ascending: true })
		.range(from, to)

	if (params.qNorm) {
		query = query.ilike('normalized_name', `%${params.qNorm}%`)
	}
	if (params.cityNorm) {
		query = query.eq('normalized_city', params.cityNorm)
	}

	const { data, count, error } = await query
	if (error) {
		throw error
	}

	return {
		items:
			(data ?? []).map((row) => ({
				id: row.id,
				name: row.name,
				city: row.city,
				createdAt: row.created_at,
			})) ?? [],
		total: count ?? 0,
	}
}

export async function getRoasteryById(
	client: SupabaseClient,
	id: string
): Promise<RoasteryDto | null> {
	const { data, error } = await client
		.from('roasteries')
		.select('id,name,city,created_at')
		.eq('id', id)
		.maybeSingle()

	if (error) {
		throw error
	}

	if (!data) {
		return null
	}

	return {
		id: data.id,
		name: data.name,
		city: data.city,
		createdAt: data.created_at,
	}
}


