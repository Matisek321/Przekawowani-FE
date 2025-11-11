## API Endpoint Implementation Plan: GET /api/roasteries/{id}/coffees

### 1. Przegląd punktu końcowego
Endpoint zwraca stronicowaną listę kaw dla wskazanej palarni, posortowaną malejąco wg zagregowanej oceny. Wspiera paginację z limitami i zwraca metadane paginacji. Brak uwierzytelniania (publiczne czytanie).

### 2. Szczegóły żądania
- Metoda HTTP: GET
- Struktura URL: `/api/roasteries/{id}/coffees`
- Parametry:
  - Wymagane (path):
    - `id`: UUID palarni (walidacja `z.string().uuid()`).
  - Opcjonalne (query):
    - `page`: liczba całkowita, domyślnie 1, minimalnie 1.
    - `pageSize`: liczba całkowita, domyślnie 30, minimalnie 1, maksymalnie 100.
- Request Body: brak

Walidacja wejścia (Zod):
- Schemat parametrów: `{ id: uuid; page?: int>=1; pageSize?: int in [1..100] }`.
- Błędne wartości (np. `page=0`, `pageSize=300`, nie-liczbowe) → 400.

### 3. Wykorzystywane typy
- DTO odpowiedzi listy i elementu:

```33:38:src/types.ts
export type PaginatedResponse<TItem> = {
  page: number
  pageSize: number
  total: number
  items: TItem[]
}
```

```80:90:src/types.ts
export type RoasteryCoffeeDto = {
  id: CoffeeRow['id']
  name: CoffeeRow['name']
  avgMain: CoffeeRow['avg_main']
  ratingsCount: CoffeeRow['ratings_count']
  smallSample: boolean
  createdAt: CoffeeRow['created_at']
}

export type RoasteryCoffeeListResponse = PaginatedResponse<RoasteryCoffeeDto>
```

- Źródła danych (Supabase `public`): tabela `roasteries`, widok `coffee_aggregates` (agregaty kaw).

```176:186:src/db/database.types.ts
coffee_aggregates: {
  Row: {
    avg_main: number | null
    coffee_id: string | null
    created_at: string | null
    name: string | null
    ratings_count: number | null
    roastery_id: string | null
    small_sample: boolean | null
  }
  // ...
}
```

- Kontrakt locals dla Supabase w Astro:

```14:19:src/env.d.ts
declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient;
    }
  }
}
```

Modele Command: brak (endpoint GET).

### 4. Szczegóły odpowiedzi
- Status 200 OK z ciałem zgodnym z `RoasteryCoffeeListResponse`:
  - `page`, `pageSize`, `total`, `items[]` gdzie `items[i]` odpowiada `RoasteryCoffeeDto`.
- Statusy błędów:
  - 400 invalid_request (z opisem walidacji)
  - 404 roastery_not_found
  - 500 internal_server_error

Przykład 200:
```json
{
  "page": 1,
  "pageSize": 30,
  "total": 42,
  "items": [
    {
      "id": "d2a2f9d7-5b0d-4f2d-9e2a-2a2f0a3a4c99",
      "name": "Ethiopia Yirgacheffe",
      "avgMain": 4.5,
      "ratingsCount": 12,
      "smallSample": false,
      "createdAt": "2025-11-01T12:00:00Z"
    }
  ]
}
```

### 5. Przepływ danych
1) Walidacja wejścia (Zod): `id`, `page`, `pageSize` z domyślnymi wartościami i limitami.
2) Weryfikacja istnienia palarni:
   - `SELECT id FROM roasteries WHERE id = :id LIMIT 1`
   - Jeśli brak → 404 `roastery_not_found`.
3) Pobranie listy kaw i łącznej liczby w 1 zapytaniu do widoku `coffee_aggregates`:
   - `SELECT coffee_id, name, avg_main, ratings_count, small_sample, created_at FROM coffee_aggregates WHERE roastery_id = :id ORDER BY avg_main DESC NULLS LAST, ratings_count DESC, created_at DESC, name ASC LIMIT :pageSize OFFSET (page-1)*pageSize` z `count: 'exact'` (Supabase).
   - Mapowanie rekordów widoku do `RoasteryCoffeeDto` (m.in. `id = coffee_id`).
4) Budowa i zwrot envelope `PaginatedResponse`.

Uwagi:
- Jeśli roasteria istnieje, ale nie ma kaw → 200 z `total=0` i pustą listą.
- Pola typu `null` w widoku należy defensywnie mapować (w szczególności `avg_main`, `ratings_count`, `small_sample`, `created_at`, `name`); brakujące traktować jako wartości domyślne (np. `smallSample = Boolean(row.small_sample)`).

### 6. Względy bezpieczeństwa
- Walidacja wszystkich parametrów (Zod) i ograniczenia paginacji (DoS odporność).
- Brak modyfikacji danych (tylko SELECT); biblioteka Supabase parametryzuje zapytania (SQL injection safe).
- Brak wymogu autoryzacji wg specyfikacji; RLS w projekcie jest wyłączony globalnie w migracjach — endpoint pozostaje publiczny do odczytu. W przyszłości rozważyć przywrócenie RLS i polityki SELECT publiczne wyłącznie dla nie-wrażliwych pól.
- Rozważyć rate limiting na poziomie middleware/reverse proxy.

### 7. Obsługa błędów
- 400 invalid_request: błędny UUID, nieprawidłowa paginacja.
- 404 roastery_not_found: brak palarni o `id`.
- 500 internal_server_error: błąd Supabase/nieoczekiwany.

Format ciał błędów (spójny, prosty):
```json
{ "error": { "code": "invalid_request", "message": "pageSize must be <= 100" } }
```

Rejestrowanie błędów:
- Brak dedykowanej tabeli błędów w projekcie — na ten moment logi serwerowe (`console.error`) i monitoring środowiska. Gdy pojawi się tabela błędów/telemetrii, dodać asynchroniczne logowanie z korelacją `requestId`.

### 8. Rozważania dotyczące wydajności
- Jeden round-trip do Supabase z `count: 'exact'` i `range` (zamiast osobnego zapytania `count`).
- Selekcja wyłącznie potrzebnych kolumn widoku.
- Porządkowanie:
  - `ORDER BY avg_main DESC NULLS LAST, ratings_count DESC, created_at DESC, name ASC` (deterministyczne).
- Indeksy (po stronie bazowej, nie w tym wdrożeniu):
  - Upewnić się, że `coffees.roastery_id` jest zindeksowane.
  - Indeksy bazowe, z których korzysta widok pod kątem `avg_main`/`ratings_count` i `created_at` (jeśli agregaty są materializowane/utrzymywane funkcją).
- Limit `pageSize` do 100.

### 9. Kroki implementacji
1) Service: `src/lib/services/roasteryCoffees.service.ts`
   - Eksport: `fetchRoasteryCoffees(client: SupabaseClient, roasteryId: string, page: number, pageSize: number): Promise<RoasteryCoffeeListResponse>`
   - Kroki:
     - Weryfikacja istnienia palarni (select `roasteries.id`).
     - Zapytanie do `coffee_aggregates` z `count: 'exact'`, `order`, `range`.
     - Mapowanie pól widoku → `RoasteryCoffeeDto` (w tym `id = coffee_id` i `smallSample = Boolean(small_sample)`).
     - Zwrócenie envelope `RoasteryCoffeeListResponse`.

2) Endpoint: `src/pages/api/roasteries/[id]/coffees.ts`
   - `export const prerender = false`.
   - `export const GET: APIRoute` (w UPPERCASE, zgodnie z wytycznymi Astro).
   - Użycie `context.locals.supabase` (typ z `src/db/supabase.client.ts`). Nie importować klienta bezpośrednio.
   - Walidacja Zod parametrów `{ id, page, pageSize }`:
     - Parsowanie query string do liczb, domyślne wartości: `page=1`, `pageSize=30`.
     - Limity: `page>=1`, `1<=pageSize<=100`.
   - Wywołanie serwisu i zwrócenie 200 z JSON.
   - Obsługa błędów: 400/404/500 zgodnie z sekcją „Obsługa błędów”.

3) Walidacja
   - Lokalny schemat Zod w pliku endpointu lub wspólny helper: `src/lib/validation/pagination.ts` (opcjonalnie) dla ponownego użycia:
     - `parsePagination(query, { defaultPage: 1, defaultPageSize: 30, maxPageSize: 100 })`.

4) Testy ręczne
   - Scenariusze:
     - `GET /api/roasteries/{uuid}/coffees` bez parametrów → 200, domyślna paginacja.
     - `?page=2&pageSize=10` → 200, poprawne `total` i `items.length<=10`.
     - `?pageSize=101` → 400.
     - Nieistniejący `id` → 404.
     - Istniejący `id` bez kaw → 200 z pustą listą.

5) Jakość/konwencje
   - Zastosować wczesne wyjścia (guard clauses) i jasne komunikaty błędów.
   - Unikać zagnieżdżeń warunków i zbędnych `else`.
   - Dbać o spójne typowanie zwracanych struktur.

### 10. Szkic interfejsów (informacyjnie)
Service:
```ts
type FetchRoasteryCoffees = (client: SupabaseClient, roasteryId: string, page: number, pageSize: number) => Promise<RoasteryCoffeeListResponse>
```

Sortowanie:
```sql
ORDER BY avg_main DESC NULLS LAST, ratings_count DESC, created_at DESC, name ASC
```

Zachowanie statusów:
- 200 dla udanego odczytu
- 400 dla nieprawidłowych danych wejściowych
- 404 dla braku zasobu (palarnia)
- 500 dla błędów serwera


