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

export const CreateRoasteryBodySchema = z.object({
	name: z.string().trim().min(1, 'name must not be empty').max(64, 'name is too long'),
	city: z.string().trim().min(1, 'city must not be empty').max(64, 'city is too long'),
})

export type CreateRoasteryBody = z.infer<typeof CreateRoasteryBodySchema>


