## API Endpoint Implementation Plan: GET /api/roasteries/{id}/coffee-aggregates

### 1. Przegląd punktu końcowego
Publiczny endpoint zwracający stronicowaną listę kaw dla danej palarni, oparty bezpośrednio o widok `public.coffee_aggregates`. Funkcjonalnie równoważny z `/api/roasteries/{id}/coffees`, ale jawnie korzysta z widoku agregatów (przydatne dla BI/consumers). Zwraca agregaty ocen, liczbę ocen i flagę małej próby dla każdej kawy, posortowane wg rankingu.

### 2. Szczegóły żądania
- Metoda HTTP: GET
- Struktura URL: `/api/roasteries/{id}/coffee-aggregates`
- Parametry:
  - Wymagane (path):
    - `id`: UUID palarni
  - Opcjonalne (query):
    - `page`: number; domyślnie 1; minimalnie 1
    - `pageSize`: number; domyślnie 30; zakres 1–100
- Request Body: brak

Walidacja wejścia (Zod, early-return):
- `id`: `z.string().uuid()`
- `page`: `z.string().optional().default('1')` → transform do `number` i `z.number().int().min(1)`
- `pageSize`: `z.string().optional().default('30')` → transform do `number` i `z.number().int().min(1).max(100)`

### 3. Wykorzystywane typy
- DTOs (z `src/types.ts`):
  - `RoasteryCoffeeDto` (element listy palarni)
  - `RoasteryCoffeeListResponse`
  - Alias agregatów: `RoasteryCoffeeAggregateListResponse = RoasteryCoffeeListResponse`
- Typy DB (z `src/db/database.types.ts` → widok `public.coffee_aggregates.Row`): `coffee_id`, `roastery_id`, `name`, `avg_main`, `ratings_count`, `small_sample`, `created_at`
- Command modele: brak (endpoint GET)

### 4. Szczegóły odpowiedzi
- 200 OK: `RoasteryCoffeeAggregateListResponse`:
  - `page`, `pageSize`, `total`, `items: RoasteryCoffeeDto[]`
  - Mapowanie pól: `coffee_id → id`, `avg_main → avgMain`, `ratings_count → ratingsCount`, `small_sample → smallSample`, `created_at → createdAt`
- 400 Bad Request: nieprawidłowe parametry (`id` nie-UUID, `page`/`pageSize` poza zakresem/nie-liczbowe)
- 404 Not Found: palarnia o `id` nie istnieje (`roastery_not_found`)
- 500 Internal Server Error: błąd serwera/bazy

Uwagi:
- Pusta lista (istniejąca palarnia bez kaw) zwraca 200 z `items: []`, `total: 0`.

### 5. Przepływ danych
1) Handler `GET` (`src/pages/api/roasteries/[id]/coffee-aggregates.ts`) pobiera `supabase` z `context.locals.supabase` i waliduje path/query (Zod).
2) Weryfikacja istnienia palarni: `select id from roasteries where id = :id limit 1`; brak → 404 `roastery_not_found`.
3) Zapytanie do widoku `public.coffee_aggregates` z filtrem `.eq('roastery_id', id)`, selekcją potrzebnych kolumn i `count: 'exact'`:
   - Sortowanie (deterministyczne, spójne z planem): `avg_main DESC NULLS LAST, ratings_count DESC, coffee_id DESC`
   - Paginacja: `range(offset, offset + pageSize - 1)`
4) Mapowanie rekordów (snake_case → camelCase) do `RoasteryCoffeeDto` z defensywnym rzutowaniem typów opcjonalnych (`Boolean(row.small_sample)` itd.).
5) Złożenie i zwrot `RoasteryCoffeeAggregateListResponse` (200).

### 6. Względy bezpieczeństwa
- Publiczny odczyt; brak autoryzacji wymaganej przez specyfikację dla katalogów publicznych.
- Używać `context.locals.supabase` (nie importować globalnego klienta). Typ: `SupabaseClient` z `src/db/supabase.client.ts`.
- Walidacja wszystkich parametrów (Zod) i twarde limity paginacji (ochrona przed nadużyciami).
- Query builder Supabase zapewnia parametryzację (SQLi-safe).
- Ewentualny rate limiting na poziomie platformy/middleware (rekomendowane).

### 7. Obsługa błędów
- 400 validation_failed/invalid_request: błędne UUID `id`, niepoprawne `page`/`pageSize`.
- 404 roastery_not_found: brak `roasteries.id = :id`.
- 500 internal_error: błąd Supabase/nieoczekiwany wyjątek.
- Format błędu: `{ "error": { "code": string, "message": string } }`
- Rejestrowanie błędów: w MVP `console.error` (opcjonalnie wspólny helper `src/lib/errors.ts` z hookiem na Sentry/Loki w przyszłości). Brak dedykowanej tabeli błędów w schemacie – brak persistencji na DB na tym etapie.

### 8. Rozważania dotyczące wydajności
- Jeden round-trip z `.select(..., { count: 'exact' })` + `.range(...)`.
- Selekcja tylko używanych kolumn widoku.
- Indeksy wykorzystywane przez widok bazują na indeksach `coffees`:
  - Globalny ranking: `(avg_main DESC NULLS LAST, ratings_count DESC, id DESC)`
  - Per-palarnia: `(roastery_id, avg_main DESC NULLS LAST, ratings_count DESC, id DESC)`
- Limit `pageSize` do 100; domyślnie 30 (per spec roastery listy).

### 9. Etapy wdrożenia
1) Schemat walidacji
   - Plik: `src/lib/schemas/roasteryCoffeeAggregates.schema.ts`
   - Eksport: `GetRoasteryCoffeeAggregatesParamsSchema` (Zod) dla `{ id, page, pageSize }`
   - Typ: `GetRoasteryCoffeeAggregatesParams = z.infer<typeof ...>`

2) Serwis danych
   - Plik: `src/lib/services/coffeeAggregates.service.ts` (rozszerzyć istniejący jeżeli jest) lub nowy `roasteryCoffeeAggregates.service.ts`
   - Eksport sugerowany:
     - `mapAggregateRowToRoasteryCoffeeDto(row: Tables<'coffee_aggregates'>['Row']): RoasteryCoffeeDto`
     - `getRoasteryCoffeeAggregates(supabase: SupabaseClient, params: { roasteryId: string; page: number; pageSize: number; }): Promise<RoasteryCoffeeAggregateListResponse>`
   - Logika:
     - Weryfikacja istnienia palarni (SELECT na `roasteries`)
     - `from('coffee_aggregates').select('coffee_id,name,avg_main,ratings_count,small_sample,created_at', { count: 'exact' }).eq('roastery_id', roasteryId)`
     - `.order('avg_main', { ascending: false, nullsFirst: false })`
     - `.order('ratings_count', { ascending: false })`
     - `.order('coffee_id', { ascending: false })`
     - `.range(offset, offset + pageSize - 1)`
     - Mapowanie do `RoasteryCoffeeDto`
     - Zwrot `RoasteryCoffeeAggregateListResponse`

3) Endpoint HTTP
   - Plik: `src/pages/api/roasteries/[id]/coffee-aggregates.ts`
   - `export const prerender = false`
   - `export async function GET(context)`:
     - Pobierz `supabase` z `context.locals.supabase`
     - Parsuj path/query i waliduj przez `GetRoasteryCoffeeAggregatesParamsSchema`
     - Wywołaj `getRoasteryCoffeeAggregates` i zwróć 200
     - Obsłuż 400/404/500 zgodnie z sekcją błędów (early returns)

4) Testy manualne
   - `GET /api/roasteries/{uuid}/coffee-aggregates` (domyślna paginacja) → 200
   - `?page=2&pageSize=10` → 200, `items.length ≤ 10`
   - `?pageSize=101` → 400
   - `id` niepoprawny (nie-UUID) → 400
   - `id` nieistniejący → 404
   - Palarnia bez kaw → 200, `total=0`, `items: []`

### 10. Zgodność z zasadami i stackiem
- Astro API: `GET` (uppercase), `prerender=false`, SSR.
- Supabase: użycie `context.locals.supabase`; typ `SupabaseClient` z `src/db/supabase.client.ts`.
- Walidacja: Zod; wczesne wyjścia; komunikaty przyjazne użytkownikowi.
- Logika: wyodrębniona do serwisu w `src/lib/services`.
- DTO i typy: z `src/types.ts` (`RoasteryCoffeeAggregateListResponse`, `RoasteryCoffeeDto`).
- Kody statusu: 200/400/404/500 zgodnie ze specyfikacją.


