import { z } from 'zod'
import { buildPaginationSchema } from './pagination'

/**
 * Schema for validating coffee-related path parameters.
 * Used for endpoints that require a roastery ID in the path.
 */
export const coffeeIdSchema = z.string().uuid()

export const coffeePathParamsSchema = z.object({
	id: coffeeIdSchema,
})

/**
 * Schema for validating the CreateCoffeeCommand payload.
 * Name is trimmed and must be between 1-128 characters.
 */
export const createCoffeeCommandSchema = z.object({
	name: z.string().trim().min(1, 'Coffee name is required').max(128, 'Coffee name cannot exceed 128 characters'),
})

/**
 * Allowed sort options for the global coffee list.
 * Currently only rating_desc is supported.
 */
const coffeeSortOptions = z.enum(['rating_desc'])

/**
 * Schema for validating GET /api/coffees query parameters.
 * Supports pagination, filtering by roastery, search by name, and sorting.
 */
export const getCoffeesQuerySchema = buildPaginationSchema({
	defaultPage: 1,
	defaultPageSize: 100,
	maxPageSize: 100,
}).extend({
	roasteryId: z.string().uuid('roasteryId must be a valid UUID').optional(),
	q: z
		.string()
		.trim()
		.min(1, 'q must not be empty')
		.max(64, 'q is too long')
		.optional(),
	sort: coffeeSortOptions.default('rating_desc'),
})

export type CoffeePathParams = z.infer<typeof coffeePathParamsSchema>
export type CreateCoffeeCommandInput = z.infer<typeof createCoffeeCommandSchema>
export type GetCoffeesQuery = z.infer<typeof getCoffeesQuerySchema>
