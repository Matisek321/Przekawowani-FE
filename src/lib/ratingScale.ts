import type { RatingScore } from '../types'

/**
 * Converts domain rating (1.0–5.0 in 0.5 increments) to DB representation (smallint ×2).
 * Example: 3.5 -> 7
 */
export function toDbSmallint(score: RatingScore): number {
	// RatingScore guarantees 0.5 steps, so this is an integer in 2..10.
	const value = Math.round(score * 2)
	if (!Number.isInteger(value) || value < 2 || value > 10) {
		throw new Error(`Invalid RatingScore value for DB scaling: ${score}`)
	}
	return value
}

/**
 * Converts DB representation (smallint ×2) back to domain rating (1.0–5.0 in 0.5 increments).
 * Example: 7 -> 3.5
 */
export function fromDbSmallint(value: number): RatingScore {
	if (!Number.isInteger(value) || value < 2 || value > 10) {
		throw new Error(`Invalid rating value from DB: ${value}`)
	}
	return (value / 2) as RatingScore
}

