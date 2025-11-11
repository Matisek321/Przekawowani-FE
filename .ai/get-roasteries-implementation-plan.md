## API Endpoint Implementation Plan: GET /api/roasteries

### 1. Przegląd punktu końcowego
Publiczny endpoint zwracający stronicowaną listę palarni z opcjonalnym filtrowaniem po nazwie i mieście. Dane pochodzą z tabeli `public.roasteries`. Wyszukiwanie odbywa się na kolumnach znormalizowanych (`normalized_name`, `normalized_city`) zgodnie z planem DB, tak aby wyniki były spójne niezależnie od wielkości liter i znaków diakrytycznych.

### 2. Szczegóły żądania
- **Metoda HTTP**: GET
- **URL**: `/api/roasteries`
- **Parametry**:
  - **Wymagane**: brak
  - **Opcjonalne**:
    - `query`: string; wyszukiwanie po nazwie palarni (contains/prefix) na polu znormalizowanym
    - `city`: string; filtr po mieście (dokładny match) na polu znormalizowanym
    - `page`: number; domyślnie 1; minimalnie 1
    - `pageSize`: number; domyślnie 20; maksymalnie 100
- **Request Body**: brak

Walidacja parametrów wejściowych Zod (w handlerze):
- `query`: opcjonalny, przycięty, długość 1..64 po normalizacji (odrzuć puste ciągi po trim)
- `city`: opcjonalny, przycięty, długość 1..64 po normalizacji (odrzuć puste)
- `page`: liczba całkowita ≥ 1; domyślnie 1
- `pageSize`: liczba całkowita w zakresie 1..100; domyślnie 20

### 3. Wykorzystywane typy
- **DTO**:
  - `RoasteryDto` z `src/types.ts`:
    - `{ id, name, city, createdAt }`
  - `RoasteryListResponse = PaginatedResponse<RoasteryDto>`
- **Envelopy**:
  - `PaginatedResponse<T>` z `src/types.ts`: `{ page, pageSize, total, items }`
- **Zod Schemas (nowe)**:
  - `GetRoasteriesQuerySchema` (Zod) w `src/lib/validation/roasteries.ts`
- **Typy klienckie DB**:
  - `SupabaseClient` z `src/db/supabase.client.ts`
  - Tabela `public.roasteries` z `src/db/database.types.ts`

### 4. Szczegóły odpowiedzi
- **200 OK**: `RoasteryListResponse`
  - `page`: echo wartości wejściowej (po domyślnieniach)
  - `pageSize`: echo wartości wejściowej (po domyślnieniach)
  - `total`: całkowita liczba dopasowanych rekordów (exact count)
  - `items`: lista `RoasteryDto`
- **400 Bad Request**: `{ error: { code: "validation_failed", message: string } }` (np. nieprawidłowe `page`, `pageSize`)
- **500 Internal Server Error**: `{ error: { code: "internal_error", message: string } }` (niespodziewane błędy)

Uwaga: Pusta lista nie jest błędem — zwracamy `200` z `items: []`.

### 5. Przepływ danych
1. Request trafia do `src/pages/api/roasteries.ts`.
2. Middleware `src/middleware/index.ts` zapewnia `context.locals.supabase` (typ `SupabaseClient`).
3. Handler `GET`:
   - Parsuje query params i waliduje je Zodem.
   - Normalizuje `q` i `city` (lower/trim/unaccent) zgodnie z DB (patrz: `normalized_*` w tabeli).
   - Buduje zapytanie do Supabase:
     - `.from('roasteries')`
     - `.select('id,name,city,created_at', { count: 'exact' })`
     - Filtry:
       - jeśli `q`: `.ilike('normalized_name', '%<qNorm>%')` (contains; wspiera prefix via `<qNorm>%` w razie potrzeby)
       - jeśli `city`: `.eq('normalized_city', '<cityNorm>')`
     - Sortowanie: `.order('name', { ascending: true })` następnie `.order('id', { ascending: true })` jako tie-breaker
     - Paginacja: `.range(offset, offset + pageSize - 1)` gdzie `offset = (page - 1) * pageSize`
   - Odbiera `data` i `count` w jednej odpowiedzi (brak `head`).
   - Mapuje rekordy do `RoasteryDto` (renaming `created_at` → `createdAt`).
   - Zwraca `RoasteryListResponse`.
4. Ustawia nagłówki:
   - `Cache-Control: public, max-age=60, stale-while-revalidate=120`
   - `Content-Type: application/json; charset=utf-8`
   - `X-Request-Id` (generowany UUID) dla spójnego logowania

### 6. Względy bezpieczeństwa
- **Autoryzacja**: publiczny odczyt (brak wymaganego JWT); zgodne z planem ról.
- **Walidacja i sanityzacja**: Zod + limit `pageSize` ≤ 100; odrzucanie pustych `q`/`city` po `trim()`.
- **Normalizacja wyszukiwania**: spójna z DB (lower/trim/unaccent) — używamy kolumn `normalized_*` i aplikacyjnej normalizacji do porównań.
- **Ochrona przed nadużyciami**: sugerowany rate-limit 120 RPM/IP dla odczytów (warstwa middleware/proxy — poza zakresem tego zadania, ale uwzględnione w planie).
- **Nagłówki**: brak wrażliwych danych w odpowiedzi; konsekwentne `Content-Type`.
- **RLS**: Odczyt katalogu publiczny — działa z `locals.supabase` i politykami DB; nie importować globalnego klienta poza middleware.

### 7. Obsługa błędów
- **400 validation_failed**: niepoprawne `page`, `pageSize`, zbyt długie `q`/`city` po normalizacji.
- **500 internal_error**: błąd komunikacji z DB, nieobsłużone wyjątki, nieoczekiwane kształty danych.
- **404**: N/D dla listy (pusta lista → `200`).
- **Logowanie błędów**:
  - Strukturalne logi serwerowe z kontekstem: `{ requestId, path, query, error }`.
  - Brak dedykowanej tabeli błędów w projekcie — opcjonalnie integracja z Sentry; jeśli w przyszłości powstanie tabela (np. `public.api_errors`), dodać asynchroniczny insert w bloku `catch` (best-effort, nie blokuje odpowiedzi).

Format błędu w odpowiedzi zgodny z planem API:
```json
{ "error": { "code": "validation_failed", "message": "..." } }
```

### 8. Rozważania dotyczące wydajności
- **Indeksy**: korzystanie z `normalized_name` i `normalized_city` (filtry i sortowanie po `name`) — zgodne z planem DB.
- **Selekt**: wybiera tylko potrzebne kolumny (`id,name,city,created_at`). Brak JOINów.
- **Count**: `count: 'exact'` dodaje narzut; dla rozmiarów do 100 rekordów paginacji jest akceptowalny. Ewentualna optymalizacja w przyszłości: szacunkowy count lub rezygnacja z total w wybranych widokach.
- **Paginacja**: limit `pageSize` do 100, co zapewnia kontrolę kosztu.
- **Cache**: krótkie cache publiczne i SWR redukują obciążenie.
- **Stabilne sortowanie**: `name asc, id asc` daje powtarzalną kolejność.

### 9. Kroki implementacji
1. **Zdefiniuj schemat walidacji query (Zod)**
   - Plik: `src/lib/validation/roasteries.ts`
   - `GetRoasteriesQuerySchema = z.object({ q?, city?, page?, pageSize? })` z domyślnieniami i limitami
2. **Dodaj helper normalizacji napisów**
   - Plik: `src/lib/normalization.ts`
   - `normalizeForSearch(input: string): string` — `trim()`, `toLowerCase()`, usuwanie diakrytyków (Intl API lub prosty mapa/regex); dokumentacja, że ma odzwierciedlać kolumny DB `normalized_*`
3. **Utwórz serwis do pobierania palarni**
   - Plik: `src/lib/services/roasteries.service.ts`
   - `listRoasteries(client: SupabaseClient, params: { qNorm?, cityNorm?, page, pageSize }): Promise<{ items: RoasteryDto[]; total: number }>`
   - Budowa zapytania: `.from('roasteries').select('id,name,city,created_at', { count: 'exact' })` + filtry + sortowanie + range
   - Mapowanie rekordów do `RoasteryDto`
4. **Zaimplementuj endpoint Astro**
   - Plik: `src/pages/api/roasteries.ts`
   - `export const prerender = false`
   - `export async function GET(context) { ... }`
   - Użyj `context.locals.supabase` (nie importować `supabaseClient` bezpośrednio)
   - Krok po kroku: parse+validate query → normalize `q/city` → call service → złożyć `RoasteryListResponse` → zwrócić `200`
   - Błędy walidacji → `400` z `{ error: { code: 'validation_failed', message } }`
   - Niespodziewane wyjątki → `500` z `{ error: { code: 'internal_error', message: 'Unexpected server error' } }` i log
5. **Nagłówki i DX**
   - Ustaw `Cache-Control`, `Content-Type`, `X-Request-Id`
6. **Testy ręczne / smoke**
   - `GET /api/roasteries` (bez parametrów) → 200, domyślna paginacja
   - `GET /api/roasteries?page=2&pageSize=5`
   - `GET /api/roasteries?q=Kawa` (contains)
   - `GET /api/roasteries?city=Warszawa`
   - Parametry niepoprawne: `page=0`, `pageSize=999` → 400
7. **Monitorowanie**
   - Zweryfikuj logi z `requestId`, czasem wykonania i błędami

### 10. Szkic interfejsów (dla referencji implementacyjnej)

Proponowane kształty (nie implementujemy tu, tylko referencja):

```ts
// src/lib/validation/roasteries.ts
export const GetRoasteriesQuerySchema = z.object({
  q: z.string().trim().min(1).max(64).optional(),
  city: z.string().trim().min(1).max(64).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type GetRoasteriesQuery = z.infer<typeof GetRoasteriesQuerySchema>;
```

```ts
// src/lib/normalization.ts
export function normalizeForSearch(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
```

```ts
// src/lib/services/roasteries.service.ts
export async function listRoasteries(
  client: SupabaseClient,
  params: { qNorm?: string; cityNorm?: string; page: number; pageSize: number },
): Promise<{ items: RoasteryDto[]; total: number }> {
  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;
  let query = client
    .from('roasteries')
    .select('id,name,city,created_at', { count: 'exact' })
    .order('name', { ascending: true })
    .order('id', { ascending: true })
    .range(from, to);
  if (params.qNorm) query = query.ilike('normalized_name', `%${params.qNorm}%`);
  if (params.cityNorm) query = query.eq('normalized_city', params.cityNorm);
  const { data, count, error } = await query;
  if (error) throw error;
  return {
    items: (data ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      city: r.city,
      createdAt: r.created_at,
    })),
    total: count ?? 0,
  };
}
```

```ts
// src/pages/api/roasteries.ts
export const prerender = false;
export async function GET(context: APIContext) {
  const requestId = crypto.randomUUID();
  try {
    const url = new URL(context.request.url);
    const raw = Object.fromEntries(url.searchParams.entries());
    const parsed = GetRoasteriesQuerySchema.safeParse(raw);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: { code: 'validation_failed', message: 'Invalid query' } }), {
        status: 400,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Request-Id': requestId },
      });
    }
    const { q, city, page, pageSize } = parsed.data;
    const qNorm = q ? normalizeForSearch(q) : undefined;
    const cityNorm = city ? normalizeForSearch(city) : undefined;
    const { items, total } = await listRoasteries(context.locals.supabase, { qNorm, cityNorm, page, pageSize });
    const body: RoasteryListResponse = { page, pageSize, total, items };
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=120',
        'X-Request-Id': requestId,
      },
    });
  } catch (error) {
    console.error({ requestId, path: '/api/roasteries', error });
    return new Response(JSON.stringify({ error: { code: 'internal_error', message: 'Unexpected server error' } }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Request-Id': requestId },
    });
  }
}
```

W powyższym szkicu zachowano wymagania: walidację, normalizację, użycie `locals.supabase`, limity paginacji, stabilne sortowanie, spójny format błędów oraz proste nagłówki cache.


