# REST API Plan

## 1. Resources

- profiles → `public.profiles` (1:1 with `auth.users`)
- roasteries → `public.roasteries`
- coffees → `public.coffees` (N:1 to `roasteries`)
- ratings → `public.ratings` (N:1 to `coffees`, N:1 to `auth.users`)
- coffeeAggregates → `public.coffee_aggregates` (view exposing denormalized aggregates for coffees)

Notes:
- Text uniqueness0 is enforced via generated normalized columns: lower(trim(unaccent_pl(...))).
- Aggregates: `coffees.avg_main` (numeric 3,2) and `coffees.ratings_count` maintained by triggers on `ratings`.
- Rating scales are stored as smallint ×2 (2..10) to represent 1.0–5.0 in 0.5 steps. API accepts/returns 1.0–5.0 (0.5 step) and converts internally.

## 2. Endpoints

Conventions:
- Path prefix: `/api`.
- Auth: Bearer access token from Supabase Auth in `Authorization: Bearer <token>`. In Astro API routes, use `locals.supabase` for SSR/server access.
- Pagination: `page` (1-based), `pageSize` (default 20, max 100). Responses include `page`, `pageSize`, `total`, `items`.
- Sorting: only by primary coffee rating (`avg_main`) as per MVP. Stable tie-breakers follow DB indexes (`ratings_count` desc, `id` desc).
- Errors: JSON `{ error: { code: string, message: string } }`.
- IDs are `uuid` strings.

### 2.1 Profiles

1) Get profile by user id
- Method: GET
- Path: `/api/profiles/{userId}`
- Description: Public profile lookup by `user_id`.
- Query params: none
- Response 200:
  ```json
  {
    "userId": "uuid",
    "displayName": "string|null",
    "createdAt": "ISO-8601"
  }
  ```
- Errors:
  - 404 profile_not_found

2) Set display name (one-time)
- Method: POST
- Path: `/api/profiles/me/display-name`
- Description: Set `display_name` once for the authenticated user. Cannot be changed afterwards.
- Auth: required
- Request:
  ```json
  { "displayName": "string (<=32, regex ^[A-Za-z0-9ĄĆĘŁŃÓŚŹŻąćęłńóśźż .-]+$)" }
  ```
- Response 200:
  ```json
  {
    "userId": "uuid",
    "displayName": "string",
    "createdAt": "ISO-8601"
  }
  ```
- Errors:
  - 400 validation_failed (regex/length)
  - 409 display_name_already_set
  - 409 display_name_conflict (unique normalized conflict)
  - 401 unauthorized

### 2.2 Roasteries

1) List roasteries
- Method: GET
- Path: `/api/roasteries`
- Description: Public list of roasteries with optional search and city filter.
- Query params:
  - `query` (optional; matches name using normalized search; prefix/contains)
  - `city` (optional; normalized exact match)
  - `page` (default 1), `pageSize` (default 20, max 100)
- Response 200:
  ```json
  {
    "page": 1,
    "pageSize": 20,
    "total": 123,
    "items": [
      {
        "id": "uuid",
        "name": "string",
        "city": "string",
        "createdAt": "ISO-8601"
      }
    ]
  }
  ```
- Errors: none (empty list is 200)

2) Create roastery
- Method: POST
- Path: `/api/roasteries`
- Description: Create a roastery (authenticated only).
- Auth: required
- Request:
  ```json
  { "name": "string", "city": "string" }
  ```
- Response 201:
  ```json
  {
    "id": "uuid",
    "name": "string",
    "city": "string",
    "createdAt": "ISO-8601"
  }
  ```
- Errors:
  - 400 validation_failed (required fields, non-empty strings)
  - 409 roastery_duplicate (normalized name+city unique)
  - 401 unauthorized

3) Get roastery by id
- Method: GET
- Path: `/api/roasteries/{id}`
- Description: Fetch a single roastery.
- Response 200:
  ```json
  { "id": "uuid", "name": "string", "city": "string", "createdAt": "ISO-8601" }
  ```
- Errors: 404 roastery_not_found

4) List roastery coffees (ranked)
- Method: GET
- Path: `/api/roasteries/{id}/coffees`
- Description: List coffees for a roastery sorted by aggregate rating.
- Query params:
  - `page` (default 1), `pageSize` (default 30, max 100)
- Response 200:
  ```json
  {
    "page": 1,
    "pageSize": 30,
    "total": 42,
    "items": [
      {
        "id": "uuid",
        "name": "string",
        "avgMain": 4.5,
        "ratingsCount": 12,
        "smallSample": false,
        "createdAt": "ISO-8601"
      }
    ]
  }
  ```
- Errors:
  - 404 roastery_not_found

5) Create coffee under roastery
- Method: POST
- Path: `/api/roasteries/{id}/coffees`
- Description: Create a coffee attached to the specified roastery (authenticated only).
- Auth: required
- Request:
  ```json
  { "name": "string" }
  ```
- Response 201:
  ```json
  {
    "id": "uuid",
    "roasteryId": "uuid",
    "name": "string",
    "avgMain": null,
    "ratingsCount": 0,
    "createdAt": "ISO-8601"
  }
  ```
- Errors:
  - 400 validation_failed (required `name`)
  - 404 roastery_not_found
  - 409 coffee_duplicate (unique per roastery normalized name)
  - 401 unauthorized

### 2.3 Coffees

1) Global coffees list (ranked)
- Method: GET
- Path: `/api/coffees`
- Description: Global list sorted by aggregate rating.
- Query params:
  - `page` (default 1), `pageSize` (default 100, max 100)
  - `roasteryId` (optional; filter by roastery)
  - `q` (optional; matches coffee name normalized)
  - `sort` (optional; default `rating_desc`; only supported: `rating_desc`)
- Response 200:
  ```json
  {
    "page": 1,
    "pageSize": 100,
    "total": 1234,
    "items": [
      {
        "id": "uuid",
        "roasteryId": "uuid",
        "name": "string",
        "avgMain": 4.0,
        "ratingsCount": 7,
        "smallSample": true,
        "createdAt": "ISO-8601"
      }
    ]
  }
  ```

2) Get coffee by id (with aggregates)
- Method: GET
- Path: `/api/coffees/{id}`
- Description: Coffee detail with aggregate metrics; does not expose raw ratings in MVP.
- Response 200:
  ```json
  {
    "id": "uuid",
    "roasteryId": "uuid",
    "name": "string",
    "avgMain": 3.5,
    "ratingsCount": 2,
    "smallSample": true,
    "createdAt": "ISO-8601"
  }
  ```
- Errors:
  - 404 coffee_not_found

### 2.4 Ratings

MVP exposes only the current user’s rating write path and optionally fetch “my rating” for a coffee. Raw rating lists are not public; aggregates are used for listings.

1) Upsert my rating for a coffee
- Method: PUT
- Path: `/api/coffees/{id}/my-rating`
- Description: Create or update the authenticated user’s rating for the coffee.
- Auth: required
- Request:
  ```json
  {
    "main": 1.0,
    "strength": 3.5,
    "acidity": 2.0,
    "aftertaste": 4.5
  }
  ```
- Response 200 (updated) or 201 (created):
  ```json
  {
    "id": "uuid",
    "coffeeId": "uuid",
    "userId": "uuid",
    "main": 1.0,
    "strength": 3.5,
    "acidity": 2.0,
    "aftertaste": 4.5,
    "createdAt": "ISO-8601",
    "updatedAt": "ISO-8601"
  }
  ```
- Errors:
  - 400 validation_failed (values outside 1.0–5.0, non 0.5 step)
  - 404 coffee_not_found
  - 401 unauthorized
  - 403 forbidden (if attempting to act for another user, should not happen via this route)

2) Get my rating for a coffee
- Method: GET
- Path: `/api/coffees/{id}/my-rating`
- Description: Returns the authenticated user’s rating for the coffee, if any.
- Auth: required
- Response 200:
  ```json
  {
    "id": "uuid",
    "coffeeId": "uuid",
    "userId": "uuid",
    "main": 4.5,
    "strength": 3.0,
    "acidity": 2.5,
    "aftertaste": 4.0,
    "createdAt": "ISO-8601",
    "updatedAt": "ISO-8601"
  }
  ```
- Response 204: no_content (no rating yet)
- Errors:
  - 404 coffee_not_found
  - 401 unauthorized

### 2.5 Coffee aggregates (public view)

1) Aggregates list (global)
- Method: GET
- Path: `/api/coffee-aggregates`
- Description: Public list, equivalent to `/api/coffees` but explicitly view-backed. Prefer `/api/coffees` for app use; this endpoint exists for BI/consumers.
- Query params: same as `/api/coffees`
- Response 200: same shape as `/api/coffees` list

2) Aggregates for roastery
- Method: GET
- Path: `/api/roasteries/{id}/coffee-aggregates`
- Description: Public, equivalent to `/api/roasteries/{id}/coffees` but explicitly view-backed.
- Query params: same as roastery coffees list
- Response 200: same shape as roastery coffees list

## 3. Authentication and Authorization

- Provider: Supabase Auth (JWT). Clients send `Authorization: Bearer <access_token>` to API routes.
- Server access: In Astro API routes, use `locals.supabase` to resolve the user/session securely and perform Supabase queries with RLS where enabled.
- Roles (MVP):
  - Anonymous: can read `profiles` (public fields), `roasteries`, `coffees`, `coffee_aggregates`.
  - Authenticated: can create `roasteries`, create `coffees`, upsert own `ratings`, set own `display_name` once.
  - Admin: out of scope (MVP); if present, can bypass via claim `role=admin`.
- RLS: The DB plan enables RLS with policies enforcing owner-only access for ratings and public reads for catalogs. If RLS is temporarily disabled in environments, enforce equivalent checks in API handlers (e.g., match `user_id` to auth uid, restrict write operations to authenticated users).

Security headers and practices:
- Validate and sanitize inputs (Zod). Normalize search inputs to match DB normalization (lower/trim/unaccent) for consistency.
- Rate limit: Suggested defaults (application-level):
  - Reads: 120 requests/minute per IP.
  - Writes (create/upsert): 60 requests/minute per user/IP.
- Avoid exposing raw `ratings` in public endpoints; use aggregate view for listings.
- Return generic messages for conflicts/forbidden; log detailed errors server-side.

## 4. Validation and Business Logic

Validation (use Zod in handlers):
- profiles.displayName:
  - Required for POST `/profiles/me/display-name`.
  - Max length 32.
  - Regex `^[A-Za-z0-9ĄĆĘŁŃÓŚŹŻąćęłńóśźż .-]{1,32}$`.
  - Uniqueness by normalized value (lower/trim/unaccent).
- roasteries:
  - Required: `name`, `city`; non-empty.
  - Duplicate detection via normalized `(name, city)` unique index → respond 409.
- coffees:
  - Required: `name`; non-empty; valid roastery id.
  - Duplicate per roastery by normalized name → respond 409.
- ratings:
  - Required: `main`, `strength`, `acidity`, `aftertaste` in [1.0, 5.0] with 0.5 step.
  - Convert to smallint ×2 before insert/update; convert back on response.

Business logic mapping:
- Display name one-time set: DB trigger denies change after initial non-null set; API pre-check returns 409 if already set.
- Deduplication: rely on unique indexes; surface as 409 conflicts with actionable messages.
- Aggregates: do not compute in API; rely on DB triggers and `coffee_aggregates` view.
- Sorting and small sample:
  - Sort by `avg_main` desc, then `ratings_count` desc, `id` desc for stable results (matches DB index).
  - `smallSample` exposed as `ratings_count < 3`.

Performance considerations:
- Use keyset pagination where possible for large lists (future); MVP uses page/limit bounded to max 100.
- Ensure queries use indexes:
  - Roasteries: filter by normalized name/city.
  - Coffees: global ranking index and per-roastery ranking index.
- Response budgets: target p95 ≤ 300ms for list endpoints with standard sizes.

Error codes (common):
- 400 validation_failed
- 401 unauthorized
- 403 forbidden
- 404 not_found (roastery_not_found, coffee_not_found, profile_not_found)
- 409 conflict (display_name_conflict, display_name_already_set, roastery_duplicate, coffee_duplicate)
- 422 unprocessable (semantic issues not covered by 400)
- 429 rate_limited
- 500 internal_error

---

Implementation notes (Astro + Supabase alignment):
- Handlers live under `src/pages/api/**`. Use `locals.supabase` (do not import global client) and types from `src/db/supabase.client.ts`.
- Validate with Zod schemas per endpoint; map DB types from `src/db/database.types.ts`.
- Translate API rating values <-> DB smallint×2 consistently.
- Prefer selecting from `public.coffee_aggregates` for lists/details to avoid joining raw ratings.
- Normalize search inputs (lower/trim/unaccent) when building filter expressions to match DB normalized columns.


