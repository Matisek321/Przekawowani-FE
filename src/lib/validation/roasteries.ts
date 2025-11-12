import { z } from 'zod'
import { buildPaginationSchema } from './pagination'

export const GetRoasteriesQuerySchema = buildPaginationSchema({
	defaultPage: 1,
	defaultPageSize: 20,
	maxPageSize: 100,
}).extend({
	q: z
		.string()
		.trim()
		.min(1, 'q must not be empty')
		.max(64, 'q is too long')
		.optional(),
	city: z
		.string()
		.trim()
		.min(1, 'city must not be empty')
		.max(64, 'city is too long')
		.optional(),
})

export type GetRoasteriesQuery = z.infer<typeof GetRoasteriesQuerySchema>


