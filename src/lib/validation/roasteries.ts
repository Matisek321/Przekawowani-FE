import { z } from 'zod'

export const GetRoasteriesQuerySchema = z.object({
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
	page: z.coerce.number().int().min(1).default(1),
	pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export type GetRoasteriesQuery = z.infer<typeof GetRoasteriesQuerySchema>


