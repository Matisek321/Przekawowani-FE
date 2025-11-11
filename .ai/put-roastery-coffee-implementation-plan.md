## API Endpoint Implementation Plan: POST /api/roasteries/{id}/coffees

### 1. Przegląd punktu końcowego

Endpoint służy do utworzenia nowej kawy przypisanej do konkretnej palarni. Operacja jest dostępna wyłącznie dla uwierzytelnionych użytkowników. Zapewnia walidację danych wejściowych, weryfikację istnienia palarni oraz poprawne mapowanie konfliktów unikalności nazwy kawy w ramach palarni.

### 2. Szczegóły żądania

- Metoda HTTP: POST
- Struktura URL: `/api/roasteries/{id}/coffees`
- Parametry:
  - Wymagane (path): `id` – identyfikator palarni (UUID)
  - Opcjonalne: brak
- Request Body (JSON):
  - Zgodnie z `CreateCoffeeCommand`:
    - `name`: string (wymagane; przycinane; sugerowane ograniczenie długości 1–128)

### 3. Wykorzystywane typy

- DTO/Command z `src/types.ts`:
  - `CreateCoffeeCommand` – payload: `{ name: string }`
  - `CoffeeDto` – wynik zawiera: `id`, `roasteryId`, `name`, `avgMain`, `ratingsCount`, `smallSample`, `createdAt`

### 4. Szczegóły odpowiedzi

- 201 Created (sukces utworzenia):
  - Body: `CoffeeDto`
  - Przykład:
    - `id: uuid`
    - `roasteryId: uuid`
    - `name: string`
    - `avgMain: null`
    - `ratingsCount: 0`
    - `smallSample: true | false` (po utworzeniu, dla 0 ocen, `smallSample` będzie true wg logiki „ratings_count < 3”)
    - `createdAt: ISO-8601`
- 400 Bad Request:
  - `validation_failed` – nieprawidłowe `id` lub `name` (puste, zbyt długie, niepoprawny typ)
- 401 Unauthorized:
  - `unauthorized` – brak poprawnego tokena użytkownika
- 404 Not Found:
  - `roastery_not_found` – nie istnieje palarnia o podanym `id`
- 409 Conflict:
  - `coffee_duplicate` – unikalność nazwy kawy w ramach palarni (po normalizacji) naruszona
- 500 Internal Server Error:
  - `server_error` – nieoczekiwany błąd

### 5. Przepływ danych

1) Walidacja wejścia:
   - Z path: `id` (UUID)
   - Z body: `name` (string, trim, min 1, max 128)
2) Uwierzytelnienie:
   - Odczyt nagłówka `Authorization: Bearer <token>`
   - Weryfikacja użytkownika poprzez `supabase.auth.getUser(token)`
3) Weryfikacja palarni:
   - `select` po `roasteries.id = {id}`; w razie braku – 404
4) Utworzenie kawy:
   - `insert` do `coffees` z polami: `roastery_id`, `name`
   - Pola `normalized_name`, `avg_main`, `ratings_count`, `created_at` są zarządzane przez DB (generated/defaults)
   - Zwrócenie wiersza `.select().single()`
5) Mapowanie na `CoffeeDto`:
   - `smallSample = ratings_count < 3`
6) Odpowiedź 201 z `CoffeeDto`

### 6. Względy bezpieczeństwa

- Uwierzytelnienie wymagane: endpoint akceptuje tylko żądania z ważnym JWT (Supabase).
- Autoryzacja minimalna: brak ról; tworzenie kaw nie jest powiązane z użytkownikiem, ale wymaga bycia zalogowanym.
- Walidacja i sanityzacja danych wejściowych (Zod): ograniczenie długości i trim dla `name`, weryfikacja UUID dla `id`.
- Ochrona przed duplikatami: rely on DB unique (`coffees(roastery_id, normalized_name)`) i mapowanie błędu 23505 na 409.
- Ograniczenie powierzchni ataku: ignoruj nieznane pola w body; nie przekazuj nic poza `name`.
- Zalecenie: dodać limitowanie (np. middleware rate-limit) i monitoring nadużyć przy nadmiernej liczbie żądań.

### 7. Obsługa błędów

- 400 `validation_failed`: nieudana walidacja Zod (path param lub body).
- 401 `unauthorized`: brak tokena lub `getUser` zwraca brak użytkownika.
- 404 `roastery_not_found`: brak wpisu w `roasteries` dla `id`.
- 409 `coffee_duplicate`: błąd Postgres `23505` na unikalności `(roastery_id, normalized_name)`.
- 500 `server_error`: niesklasyfikowane błędy – zwracaj ogólny komunikat; zaloguj szczegóły po stronie serwera.
- Logowanie: w MVP log do `console.error` z korelacją (request id, ścieżka, kod, message, details). Brak tabeli błędów w schemacie – ewentualnie do rozważenia w przyszłości.

### 8. Rozważania dotyczące wydajności

- Minimalna liczba round-tripów: 1x `select` (roastery exists) + 1x `insert` (returning). Alternatywnie wykrywanie 404 poprzez przechwycenie 23503, ale jawne `select` daje lepsze kody błędów.
- Indeksy: istniejące indeksy i constrainty w migracjach wspierają szybkość (FK, unique, indeks po `roastery_id`).
- Normalizacja po stronie DB – brak dodatkowych obliczeń w aplikacji.
- Potencjalne hot paths: brak masowej pracy; POST to operacja jednostkowa.

### 9. Etapy wdrożenia

1) Schematy walidacji (Zod)
   - Utwórz `src/lib/schemas/coffees.ts`:
     - `coffeePathParamsSchema = z.object({ id: z.string().uuid() })`
     - `createCoffeeCommandSchema = z.object({ name: z.string().trim().min(1).max(128) })`
   - Eksportuj typy inferowane przydatne w route/service.

2) Warstwa serwisowa
   - Dodaj `src/lib/services/coffee.service.ts` z funkcją:
     - `createCoffee(supabase: SupabaseClient, roasteryId: string, cmd: CreateCoffeeCommand): Promise<CoffeeDto>`
   - Implementacja:
     - Sprawdź istnienie palarni: `supabase.from('roasteries').select('id').eq('id', roasteryId).maybeSingle()`
     - Jeśli brak – zwróć kontrolowany błąd `roastery_not_found`
     - `insert` do `coffees` z `roastery_id`, `name`; `.select().single()`
     - Na błąd `23505` → rzuć kontrolowany błąd `coffee_duplicate`
     - Zmapuj wynik na `CoffeeDto` (ustal `smallSample = ratings_count < 3`)

3) Endpoint Astro
   - Utwórz `src/pages/api/roasteries/[id]/coffees/index.ts`
   - W pliku:
     - `export const prerender = false`
     - Eksport `POST(context)`:
       - Pobierz `supabase` z `context.locals.supabase` (wstrzykiwane w `src/middleware/index.ts`)
       - Odczytaj nagłówek `Authorization` → token Bearer
       - Zweryfikuj użytkownika: `supabase.auth.getUser(token)`; w razie braku/niepoprawny → 401
       - Zparsuj path param: `id` via `coffeePathParamsSchema`
       - Zparsuj body JSON via `createCoffeeCommandSchema`
       - Wywołaj `createCoffee(supabase, id, cmd)`
       - Zwróć `new Response(JSON.stringify(dto), { status: 201 })` i nagłówek `Content-Type: application/json`
     - Obsłuż błędy:
       - Walidacja → 400 `validation_failed`
       - `roastery_not_found` → 404
       - `coffee_duplicate` → 409
       - Inne → 500
     - Logowanie błędów do `console.error` (bez ujawniania danych wrażliwych w odpowiedzi)

4) Typy i importy
   - Użyj typów z `src/types.ts`: `CreateCoffeeCommand`, `CoffeeDto`
   - Typ klienta: `SupabaseClient` z `src/db/supabase.client.ts`

5) Zgodność z regułami projektu
   - Backend: walidacja Zod, Supabase z `context.locals`, typy z lokalnych definicji
   - Astro: serwerowy endpoint, `prerender = false`, rozdzielenie logiki do `services`

6) Testy ręczne (MVP)
   - Szczęśliwa ścieżka: poprawny token, istniejąca palarnia, unikalna nazwa → 201
   - Brak tokena → 401
   - `id` nie-UUID → 400
   - `name` pusty/za długi → 400
   - Nieistniejąca palarnia → 404
   - Duplikat nazwy w tej samej palarni → 409

### 10. Szkice interfejsów (fragmenty do implementacji)

Przykładowe sygnatury i szkice (nie implementują pełnej logiki — patrz Kroki wdrożenia):

```ts
// src/lib/schemas/coffees.ts
import { z } from 'zod';

export const coffeePathParamsSchema = z.object({
  id: z.string().uuid(),
});

export const createCoffeeCommandSchema = z.object({
  name: z.string().trim().min(1).max(128),
});
```

```ts
// src/lib/services/coffee.service.ts
import type { SupabaseClient } from '@/db/supabase.client';
import type { CreateCoffeeCommand, CoffeeDto } from '@/types';

export async function createCoffee(
  supabase: SupabaseClient,
  roasteryId: string,
  cmd: CreateCoffeeCommand
): Promise<CoffeeDto> {
  // 1) ensure roastery exists
  // 2) insert coffee and map to CoffeeDto
  // 3) translate unique violation to domain error
  throw new Error('not_implemented');
}
```

```ts
// src/pages/api/roasteries/[id]/coffees/index.ts
import type { APIRoute } from 'astro';
export const prerender = false;

export const POST: APIRoute = async (context) => {
  // 1) auth via Bearer token + supabase.auth.getUser
  // 2) validate params/body
  // 3) call service and return 201 with CoffeeDto
  return new Response(null, { status: 501 });
};
```


