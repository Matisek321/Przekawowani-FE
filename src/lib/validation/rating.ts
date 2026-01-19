import { z } from 'zod'

/**
 * Allowed domain-level rating values (1.0–5.0 in 0.5 increments).
 */
export const ratingScoreEnum = z.union([
	z.literal(1),
	z.literal(1.5),
	z.literal(2),
	z.literal(2.5),
	z.literal(3),
	z.literal(3.5),
	z.literal(4),
	z.literal(4.5),
	z.literal(5),
])

/**
 * Body schema for `PUT /api/coffees/{id}/my-rating`.
 */
export const UpsertRatingCommandSchema = z
	.object({
		main: ratingScoreEnum,
		strength: ratingScoreEnum,
		acidity: ratingScoreEnum,
		aftertaste: ratingScoreEnum,
	})
	.strict()

/**
 * UUID schema used for coffee id path parameter validation.
 */
export const UuidSchema = z.string().uuid()

