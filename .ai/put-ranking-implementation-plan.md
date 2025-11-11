## API Endpoint Implementation Plan: PUT /api/coffees/{id}/my-rating

### 1. Przegląd punktu końcowego

- Cel: Utworzenie lub aktualizacja oceny kawy przez zalogowanego użytkownika (upsert). Jedna ocena na parę (user_id, coffee_id). Po operacji agregaty na `coffees` są automatycznie odświeżane przez triggery DB.
- Lokalizacja pliku endpointu: `src/pages/api/coffees/[id]/my-rating.ts`
- Integracje:
  - Supabase (DB, auth)
  - Zod (walidacja)
  - Astro Server Endpoints

### 2. Szczegóły żądania

- **Metoda**: PUT
- **URL**: `/api/coffees/{id}/my-rating`
- **Parametry**
  - **Path**:
    - `id` (uuid, wymagany): identyfikator kawy
  - **Query**: brak
  - **Headers**:
    - `Authorization: Bearer <access_token>` lub ciasteczka Supabase (`sb-access-token`), aby zidentyfikować użytkownika
- **Body (JSON)** – `UpsertRatingCommand`:
  - `main`: 1.0 | 1.5 | 2.0 | 2.5 | 3.0 | 3.5 | 4.0 | 4.5 | 5.0
  - `strength`: jw.
  - `acidity`: jw.
  - `aftertaste`: jw.

Walidacja wejścia jest realizowana Zod-em. Dopuszczalne wartości są w krokach co 0.5, przedział 1.0–5.0. W DB wartości te są przechowywane jako `smallint` w skali ×2 (2..10).

### 3. Wykorzystywane typy

Z `src/types.ts`:
- `UpsertRatingCommand` – struktura payloadu
- `RatingScore` – wartości domenowe 1.0–5.0 (kroki 0.5)
- `MyRatingDto` (alias `RatingDto`) – struktura odpowiedzi

Z `src/db/supabase.client.ts`:
- `SupabaseClient` – typ klienta

Mapowanie domena → DB:
- `RatingScore` (float, krok 0.5) → `smallint` (×2), np. 3.5 → 7.

### 4. Szczegóły odpowiedzi

- 201 Created – ocena utworzona
- 200 OK – ocena zaktualizowana
- 400 Bad Request – walidacja wejścia nie przeszła
- 401 Unauthorized – brak ważnego tokena użytkownika
- 404 Not Found – kawa nie istnieje
- 500 Internal Server Error – błąd serwera/DB

Body (201/200): `MyRatingDto`
```
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

Ustalenie 201 vs 200:
- Po `upsert` porównać `created_at` i `updated_at` – jeśli równe (pierwsze wstawienie) → 201; jeśli różne (trigger zaktualizował `updated_at`) → 200.

### 5. Przepływ danych

1) Autoryzacja użytkownika
- Pobierz token z `Authorization` (preferowane) lub z ciasteczek Supabase.
- `context.locals.supabase.auth.getUser(token)` → `user.id`; brak usera → 401.

2) Walidacja wejścia
- Zod: `id` (uuid), body zgodne z `UpsertRatingCommand` i enumeracją dozwolonych wartości (kroki 0.5).
- Wczesne zwroty 400 przy błędach walidacji.

3) Weryfikacja istnienia kawy
- `select` z `public.coffees` po `id`.
- Brak rekordu → 404.

4) Upsert oceny
- Zbuduj rekord:
  - `user_id`: z autoryzacji
  - `coffee_id`: z parametru
  - cztery skale: `Math.round(score * 2)` (range 2..10, weryfikowane przez Zod + check DB)
- `insert` z `onConflict: 'user_id,coffee_id'`, `upsert: true`, `returning: 'representation'`.
- Zwrócone kolumny: `id, user_id, coffee_id, main, strength, acidity, aftertaste, created_at, updated_at`.
- Triggery DB:
  - `updated_at` aktualizowane przy `update`
  - odświeżenie agregatów w `coffees` (avg_main, ratings_count)

5) Mapowanie do DTO
- Zamiana wartości z ×2 na domenę: `value / 2`.
- Zwrócenie `MyRatingDto` i kodu 201/200 zgodnie z regułą powyżej.

### 6. Względy bezpieczeństwa

- **Wymagana autoryzacja**: endpoint dostępny tylko dla zalogowanych użytkowników.
- **Brak `userId` w body**: zawsze pochodzi z tokena (ochrona przed spoofingiem).
- **Walidacja UUID**: path param `id` musi być poprawnym UUID (Zod).
- **RBAC/RLS**:
  - Aktualna migracja `20251111123000_disable_rls_policies.sql` wyłącza RLS (MVP). Endpoint musi samodzielnie egzekwować uprawnienia.
  - Rekomendacja: w środowisku produkcyjnym ponownie włączyć RLS i propagować token użytkownika do klienta Supabase (per-request) aby egzekwować polityki po stronie DB.
- **Rate limiting**: zalecane ograniczenie częstości wywołań PUT (np. minimalny interwał).
- **Logowanie bezpieczeństwa**: logować nieudane próby z nieprawidłowym tokenem/UUID (bez wrażliwych danych).

### 7. Obsługa błędów

- 400 validation_failed:
  - Niepoprawny UUID `id`
  - Wartości spoza 1.0–5.0 lub nie w krokach 0.5
  - Niepoprawny JSON
- 401 unauthorized:
  - Brak/niepoprawny token
  - `getUser(token)` nie zwrócił użytkownika
- 404 coffee_not_found:
  - Kawa o `id` nie istnieje
- 500 internal_server_error:
  - Błąd Supabase/DB (insert/upsert/select/trigger)

Logowanie:
- Minimalnie `console.error` z `requestId`/`userId`/`coffeeId`/`reason` (bez payloadu).
- W przyszłości: dedykowany serwis telemetryjny (np. `src/lib/services/telemetry.ts`) lub tabela logów błędów.

### 8. Rozważania dotyczące wydajności

- Jeden round-trip do DB (upsert) + automatyczne triggery.
- Indeksy:
  - `ratings_unique_user_coffee` (on conflict)
  - `ratings_user_id_idx`, `ratings_coffee_id_idx`
  - agregaty korzystają z indeksów `coffees_ranking_*`
- Brak N+1.
- Brak potrzeby prefetchu – weryfikacja kawy to pojedyncze zapytanie select (można połączyć w transakcję; w MVP wystarczy osobno).
- Ewentualny `retry` upsert przy konfliktach połączeń.

### 9. Kroki implementacji

1) Walidacja i utilsy
- Utwórz `src/lib/validation/rating.ts`
  - Zod schema `ratingScoreEnum` z wartościami: 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5
  - `UpsertRatingCommandSchema` zgodne z `UpsertRatingCommand`
  - `UuidSchema` (Zod) dla `id`
- Utwórz `src/lib/utils/ratingScale.ts`
  - `toDbSmallint(score: RatingScore): number` → `(score * 2) | 0`
  - `fromDbSmallint(value: number): RatingScore` → `value / 2`

2) Serwis domenowy
- Utwórz `src/lib/services/ratings.service.ts`
  - `findCoffeeById(client: SupabaseClient, id: string)` → Coffee exist check (throw 404)
  - `upsertMyRating(client: SupabaseClient, userId: string, coffeeId: string, cmd: UpsertRatingCommand)`
    - Skaluje wartości do smallint
    - Wykonuje `upsert` z `onConflict: 'user_id,coffee_id'`, `returning: representation`
    - Zwraca rekord DB
  - `toMyRatingDto(row): MyRatingDto` (skaluje z powrotem ×0.5)

3) Endpoint API
- Utwórz `src/pages/api/coffees/[id]/my-rating.ts`
  - `export const prerender = false`
  - `export const PUT: APIRoute = async ({ params, locals, request, cookies }) => { ... }`
  - Pobierz token:
    - Z nagłówka `Authorization` (Bearer)
    - Fallback: ciasteczko `sb-access-token`
  - `locals.supabase.auth.getUser(token)` → `user.id` lub 401
  - Walidacja `id` (uuid) i body (Zod)
  - `await findCoffeeById(...)` lub 404
  - `row = await upsertMyRating(...)`
  - `dto = toMyRatingDto(row)`
  - Status:
    - jeśli `row.created_at === row.updated_at` → 201
    - w przeciwnym wypadku → 200
  - `return new Response(JSON.stringify(dto), { status, headers: { 'Content-Type': 'application/json' } })`
  - Błędy:
    - Walidacja → 400 z `{"error":"validation_failed","details":[...]}`
    - Brak usera → 401 z `{"error":"unauthorized"}`
    - Brak kawy → 404 z `{"error":"coffee_not_found"}`
    - Inne → 500 z `{"error":"internal_server_error"}`
  - Logowanie `console.error({ requestId, userId, coffeeId, error })`

4) Testy ręczne (MVP)
- Scenariusze:
  - 401 bez tokena
  - 400 dla wartości 1.3/5.1 itp.
  - 404 dla nieistniejącej kawy
  - 201 przy pierwszym wystawieniu oceny
  - 200 przy aktualizacji oceny
  - Sprawdzenie odświeżenia agregatów w `coffees` (avg_main/ratings_count)

5) Utrzymanie i przyszłe usprawnienia
- Włączyć RLS i polityki dla `ratings` (oraz propagować token do klienta Supabase per-request)
- Dodać rate limiting i telemetry
- Rozszerzyć `MyRatingDto` o `version`/`etag` jeśli będzie potrzebna współbieżność

### 10. Szkice struktur (referencyjnie)

Walidacja (TypeScript, szkic):
```ts
import { z } from 'zod';

export const ratingScoreEnum = z.union([
  z.literal(1), z.literal(1.5), z.literal(2), z.literal(2.5),
  z.literal(3), z.literal(3.5), z.literal(4), z.literal(4.5), z.literal(5),
]);

export const UpsertRatingCommandSchema = z.object({
  main: ratingScoreEnum,
  strength: ratingScoreEnum,
  acidity: ratingScoreEnum,
  aftertaste: ratingScoreEnum,
});

export const UuidSchema = z.string().uuid();
```

API handler (Astro, szkic):
```ts
export const prerender = false;

export const PUT: APIRoute = async ({ params, locals, request, cookies }) => {
  const token =
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
    cookies.get('sb-access-token')?.value ||
    null;
  if (!token) return json({ error: 'unauthorized' }, 401);

  const { data: userData, error: authError } = await locals.supabase.auth.getUser(token);
  if (authError || !userData?.user) return json({ error: 'unauthorized' }, 401);
  const userId = userData.user.id;

  const coffeeId = UuidSchema.parse(params.id);
  const cmd = UpsertRatingCommandSchema.parse(await request.json());

  await findCoffeeById(locals.supabase, coffeeId);
  const row = await upsertMyRating(locals.supabase, userId, coffeeId, cmd);
  const dto = toMyRatingDto(row);
  const status = row.created_at === row.updated_at ? 201 : 200;
  return json(dto, status);
};
```

Uwaga: szkice służą jako odniesienie – implementacja docelowa powinna zostać rozbita na pliki zgodnie z sekcją „Kroki implementacji”.


