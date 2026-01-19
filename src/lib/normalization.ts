/**
 * Map of Polish diacritics to their ASCII equivalents.
 * Used to match database normalization (unaccent_pl function).
 */
const POLISH_CHAR_MAP: Record<string, string> = {
	Ą: 'A',
	Ć: 'C',
	Ę: 'E',
	Ł: 'L',
	Ń: 'N',
	Ó: 'O',
	Ś: 'S',
	Ź: 'Z',
	Ż: 'Z',
	ą: 'a',
	ć: 'c',
	ę: 'e',
	ł: 'l',
	ń: 'n',
	ó: 'o',
	ś: 's',
	ź: 'z',
	ż: 'z',
}

/**
 * Normalizes input string for search purposes.
 * Handles Polish diacritics explicitly (matching database unaccent_pl),
 * then applies Unicode NFKD normalization for other accented characters.
 *
 * @param input - The string to normalize
 * @returns Normalized lowercase string with diacritics removed
 */
export function normalizeForSearch(input: string): string {
	// First, replace Polish-specific characters that don't decompose properly
	let result = input
	for (const [polishChar, asciiChar] of Object.entries(POLISH_CHAR_MAP)) {
		result = result.replaceAll(polishChar, asciiChar)
	}

	// Then apply standard Unicode normalization for other diacritics
	return result
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.trim()
}

