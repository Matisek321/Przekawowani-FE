import { z } from 'zod'

type PaginationDefaults = {
	defaultPage?: number
	defaultPageSize?: number
	maxPageSize?: number
}

export function buildPaginationSchema(defaults: PaginationDefaults = {}) {
	const {
		defaultPage = 1,
		defaultPageSize = 20,
		maxPageSize = 100,
	} = defaults

	return z.object({
		page: z.coerce.number().int().min(1).default(defaultPage),
		pageSize: z.coerce.number().int().min(1).max(maxPageSize).default(defaultPageSize),
	})
}

export type PaginationQuery = z.infer<ReturnType<typeof buildPaginationSchema>>


