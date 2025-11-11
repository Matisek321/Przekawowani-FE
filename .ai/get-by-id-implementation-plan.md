# API Endpoint Implementation Plan: GET /api/roasteries/{id}

## 1. Przegląd punktu końcowego

Endpoint zwraca szczegóły palarni kawy (roastery) na podstawie identyfikatora UUID. Ma charakter odczytu (publiczny), zwraca pojedynczy obiekt w formacie zgodnym z `RoasteryDto`.

## 2. Szczegóły żądania

- **Metoda HTTP**: GET
- **Struktura URL**: `/api/roasteries/{id}`
- **Parametry**:
  - **Wymagane**: `id` (UUID w ścieżce)
  - **Opcjonalne**: brak
- **Request Body**: brak

Walidacja wejścia:
- Użyj Zod: `z.object({ id: z.string().uuid() })` na `context.params`.
- Błąd walidacji → 400.

## 3. Wykorzystywane typy

- **DTO**: `RoasteryDto` (już istnieje w `src/types.ts`)

```59:64:src/types.ts
export type RoasteryDto = {
  id: RoasteryRow['id']
  name: RoasteryRow['name']
  city: RoasteryRow['city']
  createdAt: RoasteryRow['created_at']
}
```

- **Klient bazy**: `SupabaseClient` z `src/db/supabase.client.ts` (używany przez `context.locals.supabase` zapewniony przez middleware).

Brak Command modeli (endpoint nie przyjmuje body).

## 3. Szczegóły odpowiedzi

- 200 OK: JSON zgodny z `RoasteryDto`
- 400 Bad Request: nieprawidłowy `id` (nie-UUID)
- 404 Not Found: brak rekordu o podanym `id`
- 500 Internal Server Error: błąd zaplecza/Supabase

Struktura 200:
```json
{ "id": "uuid", "name": "string", "city": "string", "createdAt": "ISO-8601" }
```

## 4. Przepływ danych

1. Klient wywołuje `GET /api/roasteries/{id}`.
2. Middleware (`src/middleware/index.ts`) wstrzykuje `supabase` do `context.locals`.
3. Handler API waliduje `id` (Zod).
4. Serwis (`src/lib/services/roasteries.service.ts`) wykonuje zapytanie do `public.roasteries` przez `context.locals.supabase`:
   - `select('id,name,city,created_at').eq('id', id).single()`
5. Mapowanie do `RoasteryDto` (snake_case → camelCase).
6. Zwrócenie 200 z obiektem lub odpowiedni kod błędu (400/404/500).

Źródła danych (Supabase, `public.roasteries`):
- Kolumny: `id`, `name`, `city`, `created_at` (plus `normalized_*` niepotrzebne dla DTO).

## 5. Względy bezpieczeństwa

- Endpoint odczytu (publiczny). Nie wymaga autoryzacji.
- RLS jest wyłączony (na podstawie migracji), ale zapytania wykonujemy wyłącznie po stronie serwera poprzez `context.locals.supabase` (klucz serwerowy z `import.meta.env`), nigdy po stronie klienta.
- Walidacja wejścia (UUID) zapobiega niepoprawnym zapytaniom i minimalizuje powierzchnię ataku.
- Ogranicz selekcję kolumn do niezbędnych (`id,name,city,created_at`) w celu minimalizacji wycieku danych.
- Rozważ nagłówki odpowiedzi:
  - `Cache-Control: public, max-age=60, stale-while-revalidate=300` (jeśli akceptowalne dla domeny i spójności).
  - Brak cache dla 4xx/5xx.

## 6. Obsługa błędów

- 400: `id` nie jest UUID (Zod parse error).
- 404: brak wiersza (`data === null` lub Supabase `status === 406`/`PGRST116` dla `.single()`).
- 500: `error` z Supabase (np. błąd połączenia, błąd SQL).
- Logowanie błędów: strukturalne `console.error` z kontekstem (route, id, supabase error). Brak dedykowanej tabeli błędów w schemacie — integrację można dodać później.

Format błędów (przykład):
```json
{ "error": { "code": "roastery_not_found", "message": "Roastery not found" } }
```

Mapowanie kodów:
- 400: `validation_failed`
- 404: `roastery_not_found`
- 500: `internal_error`

## 7. Rozważania dotyczące wydajności

- Pojedynczy odczyt po PK (`roasteries.id`) → O(1), indeks kluczowy istnieje domyślnie.
- Minimalny zestaw kolumn w `select` zmniejsza transfer.
- Reużycie połączenia Supabase poprzez middleware (`context.locals.supabase`).
- Opcjonalne krótkie cache HTTP (60s) dla popularnych zasobów, zależnie od wymagań spójności.

## 8. Etapy wdrożenia

1) Utwórz serwis domenowy
- Plik: `src/lib/services/roasteries.service.ts`
- Eksportuj:
  - `getRoasteryById(supabase: SupabaseClient, id: string): Promise<RoasteryDto | null>`
- Implementacja:
  - Walidacja parametru odbywa się w handlerze API (serwis zakłada poprawny UUID).
  - Zapytanie: `.from('roasteries').select('id,name,city,created_at').eq('id', id).single()`
  - Jeśli `error` → rzuć (`throw`) z zachowaniem `message` i `code` Supabase.
  - Jeśli `data` puste → zwróć `null`.
  - Mapuj do DTO: `{ id, name, city, createdAt: created_at }`.

2) Dodaj endpoint API
- Plik: `src/pages/api/roasteries/[id].ts`
- Wymagania Astro:
  - `export const prerender = false`
  - `export async function GET(context: APIContext) { ... }`
- Kroki w handlerze:
  1. Odczytaj `id` z `context.params`.
  2. Zwaliduj `id` przez Zod (`uuid()`).
     - Błąd → 400 z payloadem `{ error: { code: 'validation_failed', ... } }`.
  3. Wywołaj serwis `getRoasteryById(context.locals.supabase, id)`.
  4. Jeśli `null` → 404 `{ error: { code: 'roastery_not_found', ... } }`.
  5. Zwróć 200 z `RoasteryDto`.
  6. Błędy Supabase → zaloguj `console.error` i zwróć 500 `{ error: { code: 'internal_error', ... } }`.
  7. (Opcjonalnie) Ustaw `Cache-Control` na odpowiedzi 200.

3) Typowanie kontekstu
- Już zapewnione w `src/env.d.ts`:
```15:18:src/env.d.ts
declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient;
    }
  }
}
```

4) Walidacja i testy ręczne
- Scenariusze:
  - Prawidłowy UUID istniejącego roastery → 200 + poprawne mapowanie pola `createdAt`.
  - Prawidłowy UUID nieistniejącego roastery → 404.
  - Nieprawidłowy UUID → 400.
  - Wymuszenie błędu Supabase (np. błędny URL w env) → 500.

5) Jakość i zgodność
- Zgodność ze stackiem: Astro 5, TypeScript 5, Zod, Supabase (serwerowy klient z middleware).
- Zastosowanie zasad implementacyjnych:
  - Walidacja wejścia Zod.
  - Logika domenowa w serwisie (`src/lib/services`).
  - Middleware dostarcza `supabase` w `context.locals`.
  - `GET` z wielkimi literami, `prerender = false`.
  - Wczesne zwroty dla błędów (400/404/500), happy path na końcu.


