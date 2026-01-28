import type { Tables, TablesInsert } from './db/database.types'

type ProfileRow = Tables<'profiles'>
type RoasteryRow = Tables<'roasteries'>
type CoffeeRow = Tables<'coffees'>
type RatingRow = Tables<'ratings'>

type IsoDateString = ProfileRow['created_at']
type Uuid = ProfileRow['user_id']

/**
 * Domain-level rating value constrained to the 1.0–5.0 range in 0.5 increments.
 * Derived from the numeric columns stored in `public.ratings` (smallint×2).
 */
export type RatingScore = 1 | 1.5 | 2 | 2.5 | 3 | 3.5 | 4 | 4.5 | 5

/**
 * Generic pagination envelope reused by all list endpoints.
 */
export type PaginatedResponse<TItem> = {
  page: number
  pageSize: number
  total: number
  items: TItem[]
}

/**
 * Public profile representation exposed via `/api/profiles`.
 */
export type ProfileDto = {
  userId: ProfileRow['user_id']
  displayName: ProfileRow['display_name']
  createdAt: IsoDateString
}

/**
 * Command payload for `/api/profiles/me/display-name`.
 */
export type SetDisplayNameCommand = {
  displayName: NonNullable<TablesInsert<'profiles'>['display_name']>
}

/**
 * Roastery summary/detail DTO shared by list, detail and create responses.
 */
export type RoasteryDto = {
  id: RoasteryRow['id']
  name: RoasteryRow['name']
  city: RoasteryRow['city']
  createdAt: RoasteryRow['created_at']
}

export type RoasteryListResponse = PaginatedResponse<RoasteryDto>

/**
 * Command payload for `POST /api/roasteries`.
 */
export type CreateRoasteryCommand = {
  name: TablesInsert<'roasteries'>['name']
  city: TablesInsert<'roasteries'>['city']
}

/**
 * Coffee summary used for roastery-scoped listings.
 */
export type RoasteryCoffeeDto = {
  id: CoffeeRow['id']
  name: CoffeeRow['name']
  avgMain: CoffeeRow['avg_main']
  ratingsCount: CoffeeRow['ratings_count']
  createdAt: CoffeeRow['created_at']
}

export type RoasteryCoffeeListResponse = PaginatedResponse<RoasteryCoffeeDto>

/**
 * Coffee summary used for global listings and detail responses.
 */
export type CoffeeDto = {
  id: CoffeeRow['id']
  roasteryId: CoffeeRow['roastery_id']
  name: CoffeeRow['name']
  avgMain: CoffeeRow['avg_main']
  ratingsCount: CoffeeRow['ratings_count']
  createdAt: CoffeeRow['created_at']
}

export type CoffeeListResponse = PaginatedResponse<CoffeeDto>
export type CoffeeDetailDto = CoffeeDto

/**
 * Command payload for `POST /api/roasteries/{id}/coffees`.
 */
export type CreateCoffeeCommand = {
  name: TablesInsert<'coffees'>['name']
}

/**
 * Command payload for `PUT /api/coffees/{id}/my-rating`.
 */
export type UpsertRatingCommand = {
  main: RatingScore
  strength: RatingScore
  acidity: RatingScore
  aftertaste: RatingScore
}

/**
 * Rating DTO shared by create/update and read endpoints.
 */
export type RatingDto = {
  id: RatingRow['id']
  coffeeId: RatingRow['coffee_id']
  userId: Uuid
  main: RatingScore
  strength: RatingScore
  acidity: RatingScore
  aftertaste: RatingScore
  createdAt: IsoDateString
  updatedAt: RatingRow['updated_at']
}

export type MyRatingDto = RatingDto

/**
 * Coffee aggregate endpoints mirror the global coffee list shape.
 */
export type CoffeeAggregateListResponse = CoffeeListResponse
export type RoasteryCoffeeAggregateListResponse = RoasteryCoffeeListResponse

