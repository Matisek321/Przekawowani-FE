## API Endpoint Implementation Plan: GET /api/coffee-aggregates

### 1. Przegląd punktu końcowego

- Publiczny endpoint zwracający listę zagregowanych kaw (ranking) na podstawie widoku `coffee_aggregates`. Jest równoważny funkcjonalnie z `/api/coffees`, ale jawnie opiera się o widok, przez co nadaje się do zastosowań BI/consumers.
- Brak wymogu autoryzacji (dane publiczne, tylko agregaty; surowe oceny nie są ujawniane).
- Paginacja i opcjonalne filtrowanie po `roasteryId`.

### 2. Szczegóły żądania

- Metoda HTTP: GET
- Struktura URL: `/api/coffee-aggregates`
- Parametry zapytania:
  - Wymagane: brak
  - Opcjonalne:
    - `page`: number; domyślnie 1; minimalnie 1
    - `pageSize`: number; domyślnie 100; zakres 1–100 (twarde ograniczenie)
    - `roasteryId`: string (UUID); filtr po palarni
- Body: brak

### 3. Wykorzystywane typy

- DTOs (z `src/types.ts`):
  - `CoffeeDto` (pojedyncza pozycja listy)
  - `CoffeeListResponse` (uogólniona paginacja listy kaw)
  - `CoffeeAggregateListResponse = CoffeeListResponse` (alias dla endpointów agregatów)
- Brak Command modeli (endpoint tylko GET).

### 4. Szczegóły odpowiedzi

- Statusy:
  - 200 OK: Zwraca `CoffeeAggregateListResponse`
  - 400 Bad Request: Nieprawidłowe parametry zapytania (np. pageSize > 100, niepoprawny UUID)
  - 500 Internal Server Error: Błąd serwera/bazy danych
- Kształt odpowiedzi (alias `CoffeeAggregateListResponse`):

```json
{
  "page": 1,
  "pageSize": 100,
  "total": 123,
  "items": [
    {
      "id": "uuid",
      "roasteryId": "uuid",
      "name": "string",
      "avgMain": 4.5,
      "ratingsCount": 42,
      "smallSample": false,
      "createdAt": "ISO-8601"
    }
  ]
}
```

Uwaga: pusty wynik to wciąż 200 z `items: []` (nie używamy 404 dla listy).

### 5. Przepływ danych

1. Request trafia do handlera `GET` w `src/pages/api/coffee-aggregates.ts`.
2. Walidacja parametrów zapytania przez Zod (parsowanie `page`, `pageSize`, opcjonalnie `roasteryId` jako UUID).
3. Delegacja do serwisu `src/lib/services/coffeeAggregates.service.ts`:
   - Budowa zapytania do widoku `public.coffee_aggregates` przez `context.locals.supabase`.
   - Filtr `eq('roastery_id', roasteryId)` jeśli przekazano.
   - Sortowanie: `avg_main DESC NULLS LAST, ratings_count DESC, coffee_id DESC` (spójne z planem DB).
   - Paginacja przez `.range(offset, offset + pageSize - 1)` oraz `count: 'exact'`.
4. Mapowanie rekordów widoku na `CoffeeDto` (konwersja snake_case → camelCase, np. `coffee_id` → `id`, `avg_main` → `avgMain`, `ratings_count` → `ratingsCount`, `small_sample` → `smallSample`, `created_at` → `createdAt`, `roastery_id` → `roasteryId`).
5. Złożenie `CoffeeAggregateListResponse` i zwrot 200.
6. W przypadku błędów walidacji zwrot 400; w przypadku błędów DB zwrot 500 i logowanie.

### 6. Względy bezpieczeństwa

- Publiczny odczyt: wykorzystuje widok oparty o `coffees` z polityką RLS pozwalającą na publiczny SELECT. Surowe oceny (`ratings`) nie są ujawniane.
- Walidacja danych wejściowych:
  - `page` i `pageSize` ograniczone (min/max), aby zapobiec DoS przez nadmierne zakresy.
  - `roasteryId` walidowany jako UUID.
- Brak wykonywalnych fragmentów zapytań od użytkownika – Supabase query builder zapobiega SQL injection.
- Opcjonalne: rate limiting po stronie platformy/CDN lub middleware (poza zakresem tego wdrożenia, ale rekomendowane).

### 7. Obsługa błędów

- 400 Bad Request:
  - Nieprawidłowe typy/format parametrów (np. `pageSize` > 100, ujemne wartości, nie-UUID).
  - Zwracane wraz z szczegółami walidacji (bez wrażliwych informacji).
- 500 Internal Server Error:
  - Błędy zapytań do Supabase (np. niedostępność bazy, błędna definicja widoku).
  - Logowanie z kontekstem (ścieżka, zapytanie, korelacja).
- 200 OK z `items: []` dla pustych wyników.
- Logowanie błędów: centralna funkcja `logError` w `src/lib/errors.ts` (console.error + hook pod Sentry/Loki w przyszłości).

### 8. Rozważania dotyczące wydajności

- Indeksy zgodne z planem DB wspierają sortowanie i filtrację:
  - `coffees`: `(avg_main DESC NULLS LAST, ratings_count DESC, id DESC)` oraz `(roastery_id, avg_main DESC NULLS LAST, ratings_count DESC, id DESC)`
  - Widok `coffee_aggregates` opiera się o te kolumny – zachowuje wysoką selektywność.
- Limit `pageSize` do 100. Domyślnie 100.
- `count: 'exact'` może być kosztowne przy bardzo dużych zbiorach; w MVP akceptujemy. Ewentualna optymalizacja: `count: 'planned'` albo podwójne zapytanie tylko na pierwszej stronie.
- Brak N+1 – odczyt wyłącznie z widoku.
- Potencjalna materializacja widoku w przyszłości (poza MVP).

### 9. Kroki implementacji

1) Schemat walidacji parametrów
- Plik: `src/lib/schemas/coffeeAggregates.schema.ts`
- Treść: Zod schema `GetCoffeeAggregatesQuerySchema`:
  - `page`: z.string().transform(Number).default('1') → z.number().int().min(1)
  - `pageSize`: z.string().transform(Number).default('100') → z.number().int().min(1).max(100)
  - `roasteryId`: z.string().uuid().optional()
  - Eksportowany typ: `GetCoffeeAggregatesQuery`

2) Serwis danych
- Plik: `src/lib/services/coffeeAggregates.service.ts`
- Eksport:
  - `mapAggregateRowToCoffeeDto(row: Tables<'coffee_aggregates'>): CoffeeDto`
  - `getCoffeeAggregates(supabase: SupabaseClient, params: { page: number; pageSize: number; roasteryId?: string; }): Promise<CoffeeAggregateListResponse>`
- Logika:
  - Budowa zapytania: `from('coffee_aggregates').select('*', { count: 'exact' })`
  - Filtrowanie: `.eq('roastery_id', roasteryId)` jeśli jest
  - Sortowanie: `.order('avg_main', { ascending: false, nullsFirst: false })`, potem `.order('ratings_count', { ascending: false })`, `.order('coffee_id', { ascending: false })`
  - Paginacja: `.range(offset, offset + pageSize - 1)`
  - Mapowanie rekordów na `CoffeeDto`
  - Zwrócenie `CoffeeAggregateListResponse`

3) Endpoint HTTP
- Plik: `src/pages/api/coffee-aggregates.ts`
- Wymagania:
  - `export const prerender = false`
  - `export async function GET(context: APIContext)`
  - Pobranie `supabase` z `context.locals.supabase`
  - Parsowanie i walidacja query: `GetCoffeeAggregatesQuerySchema.parse(context.url.searchParams)` (wcześniej konwersja do plain object)
  - Wywołanie serwisu i zwrot `Response.json(data, { status: 200 })`
  - Obsługa błędów walidacji: 400 z informacją o polach
  - Obsługa błędów wewnętrznych: 500 i logowanie przez `logError`

4) Logger błędów
- Plik: `src/lib/errors.ts`
- Eksport `logError(scope: string, err: unknown, context?: Record<string, unknown>): void`
- Implementacja: `console.error` + serializacja minimalnego kontekstu. Hak na przyszły transport (Sentry).

5) Typowanie i spójność
- Używać `SupabaseClient` z `src/db/supabase.client.ts` (nie z `@supabase/supabase-js`).
- Strukturę odpowiedzi typować jako `CoffeeAggregateListResponse`.
- Input types generować z Zod (`z.infer<typeof GetCoffeeAggregatesQuerySchema>`).

6) Testy ad-hoc (manualne)
- Przykładowe zapytania:
  - `/api/coffee-aggregates`
  - `/api/coffee-aggregates?page=2&pageSize=50`
  - `/api/coffee-aggregates?roasteryId={uuid}`
- Scenariusze błędów:
  - `pageSize=1000` → 400
  - `roasteryId=not-a-uuid` → 400

### 10. Przykładowe sygnatury

```ts
// src/lib/schemas/coffeeAggregates.schema.ts
export type GetCoffeeAggregatesQuery = {
  page: number
  pageSize: number
  roasteryId?: string
}
```

```ts
// src/lib/services/coffeeAggregates.service.ts
export async function getCoffeeAggregates(
  supabase: SupabaseClient,
  params: { page: number; pageSize: number; roasteryId?: string }
): Promise<CoffeeAggregateListResponse> {}
```

### 11. Kody statusu i zgodność

- 200: poprawny odczyt (zawiera paginację i dane lub pustą listę).
- 400: błędy walidacji wejścia.
- 401: nie dotyczy (publiczny endpoint; brak danych wrażliwych).
- 404: nie dotyczy dla list (pusty wynik → 200).
- 500: błąd wewnętrzny serwera lub bazy.

### 12. Uwagi implementacyjne (Astro/Supabase/Zod)

- Zgodnie z zasadami:
  - API route jako `GET` (wielkie litery), `prerender = false`.
  - Walidacja Zod, early-return 400.
  - Wyodrębnienie logiki do serwisu w `src/lib/services`.
  - Supabase z `context.locals.supabase` (typ `SupabaseClient` lokalny).
  - Jednolity mapping snake_case → camelCase w DTO.
  - Logowanie błędów przez wspólny helper.


