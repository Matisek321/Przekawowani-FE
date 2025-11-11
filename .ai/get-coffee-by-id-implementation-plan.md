## API Endpoint Implementation Plan: GET /api/coffees/{id}

### 1. Przegląd punktu końcowego

- Publiczny endpoint zwracający szczegóły kawy wraz z metrykami zagregowanymi (bez ekspozycji surowych ocen w MVP).
- Dane pochodzą z widoku `public.coffee_aggregates` (agregaty oparte o tabele `public.coffees` i `public.ratings`).
- Brak wymogu uwierzytelnienia dla odczytu (public read).

### 2. Szczegóły żądania

- **Metoda HTTP**: GET
- **Struktura URL**: `/api/coffees/{id}`
- **Parametry**:
  - **Wymagane**:
    - `id` (path param): `uuid` kawy
  - **Opcjonalne**: brak
- **Nagłówki**: standardowe (brak wymogu `Authorization` dla public read)
- **Request Body**: brak
- **Astro**:
  - `export const prerender = false`
  - Handler `export async function GET(context: APIContext)`
  - Używać `context.locals.supabase` (klient z `src/db/supabase.client.ts`)

### 3. Wykorzystywane typy

- Z `src/types.ts`:
  - `CoffeeDetailDto` (alias `CoffeeDto`):
    - `id: string`
    - `roasteryId: string`
    - `name: string`
    - `avgMain: number | null`
    - `ratingsCount: number`
    - `smallSample: boolean`
    - `createdAt: string`
- Z `src/db/database.types.ts`:
  - Widok `public.coffee_aggregates.Row`:
    - `coffee_id`, `roastery_id`, `name`, `avg_main`, `ratings_count`, `small_sample`, `created_at`
- Z klienta:
  - `SupabaseClient` z `src/db/supabase.client.ts`

### 4. Szczegóły odpowiedzi

- **200 OK**:

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

- **404 Not Found**: `{ "error": { "code": "coffee_not_found", "message": "Coffee not found" } }`
- **400 Bad Request** (nieprawidłowy `id` – nie-UUID): `{ "error": { "code": "validation_failed", "message": "Invalid id" } }`
- **500 Internal Server Error**: `{ "error": { "code": "internal_error", "message": "Unexpected error" } }`

### 5. Przepływ danych

1. Router Astro: plik `src/pages/api/coffees/[id].ts`.
2. Handler `GET`:
   - Parsuje `id` z `params.id`.
   - Waliduje `id` jako UUID (Zod).
   - Pobiera `locals.supabase` (klient Supabase).
   - Zapytanie do `public.coffee_aggregates`:
     - `select('coffee_id, roastery_id, name, avg_main, ratings_count, small_sample, created_at')`
     - `.eq('coffee_id', id).single()`
   - Mapowanie rekordu do `CoffeeDetailDto`.
   - Zwrócenie 200 lub 404 (gdy rekord nie istnieje).
3. Brak interakcji z `ratings` (surowe oceny nie są eksponowane).

### 6. Względy bezpieczeństwa

- Public read; brak wymogu tokena w MVP. Przy aktywnym RLS widok korzysta z polityk bazowych tabel.
- Walidacja danych wejściowych (UUID) Zod-em, aby uniknąć nieprawidłowych zapytań.
- Brak interpolacji SQL (użycie query buildera Supabase), minimalizacja ryzyka SQLi.
- Rate limiting aplikacyjny (jeśli wdrożony globalnie): 120 req/min/IP dla odczytów.
- Nie ujawniamy surowych `ratings`, wyłącznie agregaty.

### 7. Obsługa błędów

- Scenariusze:
  - `validation_failed` (400): `id` nie jest UUID.
  - `coffee_not_found` (404): brak rekordu w widoku dla `coffee_id`.
  - `internal_error` (500): błędy serwerowe/Supabase.
- Logowanie:
  - Logi serwerowe (`console.error`) z korelacją żądania (np. `context.request.headers.get('x-request-id')` jeśli dostępne).
  - Brak dedykowanej tabeli logów w MVP; opcjonalnie w przyszłości: tabela `public.error_logs`.

### 8. Rozważania dotyczące wydajności

- Selekcja po kluczu głównym `coffee_id` → jednoznaczny odczyt; szybkie dzięki indeksom na `coffees.id`.
- Widok `coffee_aggregates` oparty o `coffees`; brak joinów runtime; minimalny narzut.
- Brak paginacji/bardzo mała odpowiedź → niski narzut sieciowy.
- Cel p95 ≤ 200 ms (SSR w regionie bliskim DB).

### 9. Kroki implementacji

1. Struktura plików
   - Utwórz plik endpointu: `src/pages/api/coffees/[id].ts`.
   - Utwórz/lub zaktualizuj serwis: `src/lib/services/coffees.service.ts` (jeśli nie istnieje).
2. Schemat walidacji (Zod)
   - Zdefiniuj `coffeeIdSchema = z.string().uuid()`.
3. Serwis domenowy
   - Funkcja: `getCoffeeById(supabase: SupabaseClient, id: string): Promise<CoffeeDetailDto | null>`.
   - Implementacja:
     - Zapytanie do `coffee_aggregates` z `.single()`.
     - Mapowanie pól widoku do DTO:
       - `id = row.coffee_id`
       - `roasteryId = row.roastery_id`
       - `name = row.name`
       - `avgMain = row.avg_main`
       - `ratingsCount = row.ratings_count`
       - `smallSample = row.small_sample`
       - `createdAt = row.created_at`
     - Zwróć `null` gdy brak rekordu.
4. Handler API
   - `export const prerender = false`
   - `export async function GET(context)`:
     - Pobierz `id` z `context.params.id`.
     - Waliduj Zod-em; w razie błędu zwróć 400 z `{ error: { code: 'validation_failed', message: 'Invalid id' } }`.
     - Pobierz `supabase` z `context.locals`.
     - `const coffee = await getCoffeeById(supabase, id)`.
     - Jeśli `!coffee` → 404 `{ error: { code: 'coffee_not_found', message: 'Coffee not found' } }`.
     - W przeciwnym razie 200 z `coffee`.
     - Opakuj wyjątki w 500 i zaloguj szczegóły na serwerze.
5. Typy i zgodność
   - Użyj `CoffeeDetailDto` z `src/types.ts`.
   - Użyj `SupabaseClient` z `src/db/supabase.client.ts`.
6. Testy ręczne
   - Przykładowe żądania:
     - `GET /api/coffees/{existing-uuid}` → 200 i poprawny JSON.
     - `GET /api/coffees/{non-existing-uuid}` → 404.
     - `GET /api/coffees/not-a-uuid` → 400.
7. Monitorowanie
   - Dodaj sensowne logi błędów w handlerze (stack trace ukryty przed klientem).

### 10. Przykładowe odpowiedzi

- **200 OK**

```json
{
  "id": "1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed",
  "roasteryId": "a4c3082a-3a50-4eda-b0f6-6a2a4e2a2a90",
  "name": "House Blend",
  "avgMain": 4.0,
  "ratingsCount": 7,
  "smallSample": true,
  "createdAt": "2025-11-11T12:34:56.000Z"
}
```

- **404 Not Found**

```json
{ "error": { "code": "coffee_not_found", "message": "Coffee not found" } }
```

- **400 Bad Request**

```json
{ "error": { "code": "validation_failed", "message": "Invalid id" } }
```

- **500 Internal Server Error**

```json
{ "error": { "code": "internal_error", "message": "Unexpected error" } }
```


