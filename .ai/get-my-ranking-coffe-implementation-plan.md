## API Endpoint Implementation Plan: GET /api/coffees/{id}/my-rating

### 1. Przegląd punktu końcowego

Zwraca ocenę (rating) zalogowanego użytkownika dla wskazanej kawy. Jeśli użytkownik nie wystawił jeszcze oceny, zwraca 204 No Content. Wymaga uwierzytelnienia. Zgodnie ze specyfikacją:
- 200: znaleziono ocenę i zwrócono `MyRatingDto`,
- 204: brak oceny dla tej kawy i użytkownika,
- 401: użytkownik nie jest uwierzytelniony,
- 404: kawa o podanym `id` nie istnieje,
- 400: nieprawidłowe dane wejściowe (np. błędny UUID),
- 500: błąd serwera.

Technologie: Astro 5 (Server Endpoints), TypeScript 5, Supabase (DB, auth), Zod (walidacja), użycie `context.locals.supabase` (z middleware).


### 2. Szczegóły żądania

- Metoda HTTP: GET
- Struktura URL: `/api/coffees/{id}/my-rating`
- Parametry:
  - Wymagane: `id` (UUID kawy, segment ścieżki)
  - Opcjonalne: brak
- Nagłówki:
  - `Authorization: Bearer <access_token>` (wymagane do uwierzytelnienia)
- Request Body: brak
- Prerender: `export const prerender = false`

Walidacja danych wejściowych:
- `id`: `z.string().uuid()`
- Nagłówek `Authorization`: obecny i o formacie `Bearer <token>`


### 3. Wykorzystywane typy

- Typy bazodanowe: `public.coffees`, `public.ratings` z `src/db/database.types.ts`.
- Klient: `SupabaseClient` z `src/db/supabase.client.ts` (tylko typ; instancja z `context.locals.supabase`).
- DTO/Command z `src/types.ts`:
  - `RatingScore` — wartości 1.0–5.0 co 0.5.
  - `RatingDto` — struktura oceny.
  - `MyRatingDto = RatingDto` — alias.
- Brak payloadu komend w tym endpointzie (tylko odczyt).


### 4. Szczegóły odpowiedzi

- 200 OK (application/json): `MyRatingDto`
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
- 204 No Content — brak body
- 400 Bad Request — `{ "error": "validation_failed", "message": "<opis>" }`
- 401 Unauthorized — `{ "error": "unauthorized" }`
- 404 Not Found — `{ "error": "coffee_not_found" }`
- 500 Internal Server Error — `{ "error": "server_error", "message": "<traceId>" }`


### 5. Przepływ danych

1) Parsowanie i walidacja `id` (UUID) ze ścieżki Zodem. Brak body.
2) Autoryzacja: odczyt `Authorization` → wyciągnięcie tokena Bearer → `supabase.auth.getUser(token)` → pobranie `user.id`.
3) Weryfikacja istnienia kawy: `select id from coffees where id = :id limit 1`. Jeśli brak → 404.
4) Pobranie oceny użytkownika: `select * from ratings where coffee_id = :id and user_id = :userId limit 1`.
   - Jeśli brak wiersza → 204.
   - Jeśli istnieje → mapowanie na `MyRatingDto` (konwersja snake_case → camelCase).
5) Zwrócenie 200 z JSON DTO.

Uwaga: RLS wg migracji jest wyłączony, więc filtr `user_id = :userId` musi być bezwzględnie wymuszony w zapytaniu.


### 6. Względy bezpieczeństwa

- Uwierzytelnienie: wymagane; brak/nieprawidłowy token → 401.
- Autoryzacja/IDOR: zwracamy wyłącznie rekordy, gdzie `user_id` = zalogowany użytkownik, ignorując cudze oceny.
- Walidacja: `id` musi być UUID; inne formaty → 400.
- RLS: wyłączone polityki → pamiętać o precyzyjnych filtrach po stronie serwera.
- Nagłówki: nie logować pełnych tokenów; maskować w logach.
- Ochrona przed enumeracją: 204 dla “brak oceny” ogranicza wyciek informacji o istniejących użytkownikach/relacjach.


### 7. Obsługa błędów

- 400 validation_failed: nieprawidłowy UUID w parametrach.
- 401 unauthorized: brak nagłówka Authorization lub `getUser` nie zwrócił użytkownika.
- 404 coffee_not_found: brak kawy o `id`.
- 500 server_error: nieoczekiwany błąd Supabase/połączenia.

Logowanie błędów:
- Brak tabeli błędów w schemacie — logowanie strukturalne do konsoli (np. `console.error({ route, error, traceId })`) i zwrot `traceId` w 500.
- W przyszłości: rozważyć `errors` table lub zewnętrzny agregator (Sentry).


### 8. Rozważania dotyczące wydajności

- Zapytania punktowe z `limit 1` po kluczach: `coffees.id` oraz `(ratings.coffee_id, ratings.user_id)`.
- Zalecenie indeksu złożonego: `create index on ratings (coffee_id, user_id);` (jeśli brak).
- Wybierać tylko potrzebne kolumny; tu wymagane wszystkie do DTO, ale w `coffees` wystarczy `id` w checku istnienia.
- Brak cache po stronie serwera (dane per-user, dynamiczne) — SSR i `prerender = false`.


### 9. Etapy wdrożenia

1) Endpoint
   - Utwórz plik: `src/pages/api/coffees/[id]/my-rating.ts`.
   - Dodaj `export const prerender = false`.
   - Eksportuj `export async function GET(context)` zgodnie z Astro 5.
   - Pobierz `supabase` z `context.locals.supabase` (nie importować klienta bezpośrednio).
   - Wyciągnij i zweryfikuj token Bearer z nagłówka Authorization; `supabase.auth.getUser(token)`.

2) Walidacja
   - Zdefiniuj Zod schema dla params: `const ParamsSchema = z.object({ id: z.string().uuid() })`.
   - Zwróć 400 przy niepowodzeniu walidacji; body `{ error: "validation_failed", message }`.

3) Serwisy (`src/lib/services`)
   - `coffees.service.ts` (jeśli brak): `existsById(supabase: SupabaseClient, coffeeId: string): Promise<boolean>`.
   - `ratings.service.ts`: `getMyRatingForCoffee(supabase: SupabaseClient, coffeeId: string, userId: string): Promise<MyRatingDto | null>`.
   - Zapytania ogranicz do potrzebnych kolumn, mapuj snake_case → camelCase.

4) Flow endpointu
   - Sprawdź istnienie kawy → 404 jeśli brak.
   - Pobierz ocenę użytkownika → 204 jeśli brak, inaczej 200 z `MyRatingDto`.

5) Mapowanie DTO
   - Mapuj: `id`, `coffee_id→coffeeId`, `user_id→userId`, `main`, `strength`, `acidity`, `aftertaste`, `created_at→createdAt`, `updated_at→updatedAt`.
   - Typuj wynik jako `MyRatingDto` z `src/types.ts`.

6) Błędy i logowanie
   - Opakuj nieoczekiwane błędy w 500; loguj ze `traceId`.
   - Nie loguj pełnych tokenów; maskuj/obcinaj.

7) Testy ręczne (smoke)
   - 401 bez nagłówka Authorization.
   - 400 dla nie-UUID `id`.
   - 404 dla nieistniejącej kawy.
   - 204 dla istniejącej kawy bez ratingu.
   - 200 i poprawne DTO dla kawy z ratingiem użytkownika.


### 10. Szkic implementacji (fragmenty)

Endpoint (Astro):
```ts
// src/pages/api/coffees/[id]/my-rating.ts
import type { APIRoute } from 'astro';
import { z } from 'zod';
import type { SupabaseClient } from '@/db/supabase.client';
import type { MyRatingDto } from '@/types';
import { existsById as coffeeExists } from '@/lib/services/coffees.service';
import { getMyRatingForCoffee } from '@/lib/services/ratings.service';

export const prerender = false;

const ParamsSchema = z.object({ id: z.string().uuid() });

export const GET: APIRoute = async (context) => {
  try {
    const { params, request, locals } = context;
    const parse = ParamsSchema.safeParse(params);
    if (!parse.success) {
      return new Response(JSON.stringify({ error: 'validation_failed', message: 'Invalid coffee id' }), { status: 400 });
    }

    const auth = request.headers.get('authorization') ?? request.headers.get('Authorization');
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });

    const supabase = locals.supabase as SupabaseClient;
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });

    const coffeeId = parse.data.id;
    const userId = userData.user.id;

    const exists = await coffeeExists(supabase, coffeeId);
    if (!exists) return new Response(JSON.stringify({ error: 'coffee_not_found' }), { status: 404 });

    const rating: MyRatingDto | null = await getMyRatingForCoffee(supabase, coffeeId, userId);
    if (!rating) return new Response(null, { status: 204 });

    return new Response(JSON.stringify(rating), { status: 200, headers: { 'content-type': 'application/json' } });
  } catch (error) {
    const traceId = crypto.randomUUID();
    console.error({ route: 'GET /api/coffees/:id/my-rating', error, traceId });
    return new Response(JSON.stringify({ error: 'server_error', message: traceId }), { status: 500 });
  }
};
```

Serwisy (sygnatury):
```ts
// src/lib/services/coffees.service.ts
import type { SupabaseClient } from '@/db/supabase.client';
export async function existsById(supabase: SupabaseClient, coffeeId: string): Promise<boolean> { /* ... */ }

// src/lib/services/ratings.service.ts
import type { SupabaseClient } from '@/db/supabase.client';
import type { MyRatingDto } from '@/types';
export async function getMyRatingForCoffee(supabase: SupabaseClient, coffeeId: string, userId: string): Promise<MyRatingDto | null> { /* ... */ }
```

Mapowanie w `ratings.service.ts` (zarys):
```ts
// SELECT id, coffee_id, user_id, main, strength, acidity, aftertaste, created_at, updated_at
return row && ({
  id: row.id,
  coffeeId: row.coffee_id,
  userId: row.user_id,
  main: row.main,
  strength: row.strength,
  acidity: row.acidity,
  aftertaste: row.aftertaste,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});
```


