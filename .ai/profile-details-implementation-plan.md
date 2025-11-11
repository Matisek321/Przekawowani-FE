## API Endpoint Implementation Plan: Get profile by user id


### 1. Przegląd punktu końcowego
Publiczny endpoint do pobrania profilu użytkownika po `user_id`. Zwraca jedynie bezpieczne, publiczne pola profilu (`userId`, `displayName`, `createdAt`). Endpoint nie wymaga autentykacji (SELECT na `profiles` jest publiczny wg RLS).


### 2. Szczegóły żądania
- **Metoda HTTP**: GET
- **Struktura URL**: `/api/profiles/{userId}`
- **Parametry**:
  - **Wymagane (path)**: `userId: uuid`
  - **Opcjonalne**: brak
- **Request Body**: brak

Walidacja wejścia:
- `userId` musi być prawidłowym UUID (`z.string().uuid()`).


### 3. Wykorzystywane typy
- Z `src/types.ts`:
  - `ProfileDto`:
    - `userId: ProfileRow['user_id']`
    - `displayName: ProfileRow['display_name'] | null`
    - `createdAt: IsoDateString`
- Z `src/db/supabase.client.ts`:
  - `SupabaseClient` (typ klienta Supabase do wstrzykiwania przez `context.locals`).


### 4. Szczegóły odpowiedzi
- **200 OK** — znaleziono profil

```json
{
  "userId": "uuid",
  "displayName": "string|null",
  "createdAt": "ISO-8601"
}
```

- **404 Not Found** — `profile_not_found`
- **400 Bad Request** — nieprawidłowy `userId` (np. brak lub nie-UUID)
- **500 Internal Server Error** — błąd zaplecza/Supabase

Header-y odpowiedzi (zalecane):
- `Content-Type: application/json; charset=utf-8`
- `Cache-Control: public, max-age=60, stale-while-revalidate=600` (profil jest stabilny; można bezpiecznie cache’ować krótko)


### 5. Przepływ danych
1. Klient wywołuje `GET /api/profiles/{userId}`.
2. Middleware (`src/middleware/index.ts`) wstrzykuje `supabase` do `context.locals`.
3. Handler `GET`:
   - Waliduje `params.userId` przez Zod (UUID).
   - Wywołuje serwis domenowy `getPublicProfileByUserId(supabase, userId)`.
4. Serwis:
   - Zapytanie do `public.profiles` z selekcją dopuszczalnych kolumn (`user_id, display_name, created_at`) i filtrem `.eq('user_id', userId)`.
   - `maybeSingle()` aby uniknąć tablicy i prawidłowo mapować 404.
   - Mapowanie snake_case → camelCase do `ProfileDto`.
5. Zwrócenie odpowiedzi 200 z `ProfileDto`, albo błędy zgodnie z sekcją „Obsługa błędów”.


### 6. Względy bezpieczeństwa
- Endpoint publiczny zgodnie z RLS (SELECT: public). Brak wymogów uwierzytelniania.
- Minimalny zakres danych — tylko bezpieczne pola (`user_id`, `display_name`, `created_at`).
- Walidacja UUID dla `userId` zapobiega bezsensownym zapytaniom i potencjalnym błędom.
- Ochrona przed overfetchingiem: jawna lista kolumn w SELECT.
- Nagłówki cache: krótkie cache’owanie publicznych danych; brak danych wrażliwych.
- Rate limiting — poza zakresem MVP; do rozważenia na poziomie edge/proxy.


### 7. Obsługa błędów
- Walidacja wejścia (Zod):
  - 400 Bad Request
  - Body:
    ```json
    { "code": "invalid_request", "message": "userId must be a valid UUID" }
    ```
- Brak rekordu:
  - 404 Not Found
  - Body:
    ```json
    { "code": "profile_not_found", "message": "Profile not found" }
    ```
- Błędy Supabase/serwera:
  - 500 Internal Server Error
  - Body:
    ```json
    { "code": "internal_error", "message": "Unexpected server error" }
    ```
- Logowanie błędów:
  - MVP: `console.error` z kontekstem (route, userId, supabase error).
  - Opcjonalnie: w przyszłości dedykowana tabela `error_logs` (asynchroniczny insert) lub zewnętrzny APM.


### 8. Rozważania dotyczące wydajności
- `profiles.user_id` to klucz główny — wyszukiwanie po `user_id` jest O(1) na indeksie PK.
- `maybeSingle()` redukuje transfer i uproszcza obsługę 404.
- Krótki `Cache-Control` zmniejsza obciążenie backendu.
- Payload jest minimalny (3 pola).


### 9. Etapy wdrożenia
1. Utworzyć serwis domenowy: `src/lib/services/profile.service.ts`
   - API:
     ```ts
     import type { SupabaseClient } from '../../db/supabase.client';
     import type { ProfileDto } from '../../types';

     export async function getPublicProfileByUserId(
       supabase: SupabaseClient,
       userId: string
     ): Promise<ProfileDto | null> {
       const { data, error } = await supabase
         .from('profiles')
         .select('user_id, display_name, created_at')
         .eq('user_id', userId)
         .maybeSingle();

       if (error) {
         throw error;
       }

       if (!data) {
         return null;
       }

       return {
         userId: data.user_id,
         displayName: data.display_name,
         createdAt: data.created_at
       };
     }
     ```

2. Utworzyć endpoint: `src/pages/api/profiles/[userId].ts`
   - Zgodnie z zasadami Astro:
     - `export const prerender = false`
     - `export const GET` (wielkie litery)
     - Użyć `context.locals.supabase` (nie importować klienta bezpośrednio)
     - Walidacja Zod dla `params.userId`
   - Szkic:
     ```ts
     import type { APIRoute } from 'astro';
     import { z } from 'zod';
     import { getPublicProfileByUserId } from '../../../lib/services/profile.service';

     export const prerender = false;

     const paramsSchema = z.object({
       userId: z.string().uuid(),
     });

     export const GET: APIRoute = async (context) => {
       try {
         const parse = paramsSchema.safeParse(context.params);
         if (!parse.success) {
           return new Response(JSON.stringify({
             code: 'invalid_request',
             message: 'userId must be a valid UUID'
           }), { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
         }

         const { userId } = parse.data;
         const profile = await getPublicProfileByUserId(context.locals.supabase, userId);

         if (!profile) {
           return new Response(JSON.stringify({
             code: 'profile_not_found',
             message: 'Profile not found'
           }), { status: 404, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
         }

         return new Response(JSON.stringify(profile), {
           status: 200,
           headers: {
             'Content-Type': 'application/json; charset=utf-8',
             'Cache-Control': 'public, max-age=60, stale-while-revalidate=600'
           }
         });
       } catch (err) {
         console.error('[GET /api/profiles/:userId] error', { err });
         return new Response(JSON.stringify({
           code: 'internal_error',
           message: 'Unexpected server error'
         }), { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
       }
     };
     ```

3. Testy manualne (smoke test):
   - 400: `curl -i http://localhost:4321/api/profiles/not-a-uuid`
   - 404: `curl -i http://localhost:4321/api/profiles/{valid-uuid-without-profile}`
   - 200: `curl -i http://localhost:4321/api/profiles/{existing-profile-uuid}`

4. (Opcjonalnie) Monitoring/logowanie:
   - Dodać korelacyjny `X-Request-Id` (jeśli mamy generator w middleware).
   - W przyszłości: persist do `error_logs` lub APM.

5. Dokumentacja:
   - Uzupełnić README/sekcję API o opis endpointu i przykłady.


### 10. Kryteria akceptacji
- Zgodność odpowiedzi ze specyfikacją (200 z właściwą strukturą, 404 `profile_not_found`).
- Brak użycia `@supabase/supabase-js` typu w endpointach (używamy `context.locals.supabase` i `SupabaseClient` z `src/db/supabase.client.ts`).
- Walidacja UUID i właściwe kody statusu (400, 404, 500).
- Brak wycieków danych (tylko `userId`, `displayName`, `createdAt`).
- Krótkie cache’owanie odpowiedzi i właściwe nagłówki.



