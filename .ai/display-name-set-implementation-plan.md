## API Endpoint Implementation Plan: Set display name (one-time)


### 1. Przegląd punktu końcowego
Endpoint służy do jednorazowego ustawienia pola `display_name` w profilu aktualnie zalogowanego użytkownika. Po ustawieniu wartość nie może być zmieniona (egzekwowane przez warstwę DB oraz logikę serwisową). Wartość musi spełniać wymogi formatu (regex, długość). Obsługiwane są konflikty unikalności znormalizowanej nazwy wyświetlanej (unikalne `normalized_display_name`).


### 2. Szczegóły żądania
- **Metoda HTTP**: POST
- **Struktura URL**: `/api/profiles/me/display-name`
- **Parametry**:
  - **Wymagane**: brak parametrów path/query
  - **Auth**: wymagany ważny JWT w nagłówku `Authorization: Bearer <access_token>` (Supabase Auth)
- **Request Body (JSON)**:
  ```json
  { "displayName": "string (<=32, regex ^[A-Za-z0-9ĄĆĘŁŃÓŚŹŻąćęłńóśźż .-]+$)" }
  ```

Walidacja wejścia:
- `displayName`:
  - typ `string`
  - długość 1..32
  - regex: `^[A-Za-z0-9ĄĆĘŁŃÓŚŹŻąćęłńóśźż .-]+$`
  - brak normalizacji po stronie aplikacji (DB ma kolumnę `normalized_display_name` GENERATED STORED; aplikacja jedynie weryfikuje format).


### 3. Wykorzystywane typy
- Z `src/types.ts`:
  - `ProfileDto` (odpowiedź 200):
    - `userId`
    - `displayName`
    - `createdAt`
  - `SetDisplayNameCommand` (request payload):
    - `displayName: string`
- Z `src/db/supabase.client.ts`:
  - `SupabaseClient` — typ klienta (używać z `context.locals.supabase`).


### 4. Szczegóły odpowiedzi
- **201 Created** — ustawiono (lub utworzono profil i ustawiono) wartość po raz pierwszy
  - Body (`ProfileDto`):
    ```json
    { "userId":"uuid","displayName":"string","createdAt":"ISO-8601" }
    ```
- **200 OK** — dopuszczalne alternatywnie, ale rekomendowane 201 przy pierwszorazowym ustawieniu; w tym planie stosujemy 201 przy sukcesie
- **400 Bad Request** — walidacja treści żądania (regex/length)
- **401 Unauthorized** — brak ważnego tokenu lub nieudane `auth.getUser()`
- **409 Conflict** — dwa scenariusze:
  - `display_name_already_set` — użytkownik ma już ustawioną wartość
  - `display_name_conflict` — konflikt unikalności z innym profilem (kolumna `normalized_display_name`)
- **500 Internal Server Error** — błąd wewnętrzny/Supabase

Zalecane nagłówki:
- `Content-Type: application/json; charset=utf-8`


### 5. Przepływ danych
1. Klient wywołuje `POST /api/profiles/me/display-name` z JWT w nagłówku `Authorization` oraz body z `displayName`.
2. Middleware `src/middleware/index.ts` podkłada `context.locals.supabase`. Aby mieć dostęp do tożsamości użytkownika w kontekście żądania, klient Supabase powinien mieć ustawiony nagłówek `Authorization` z tokenem z żądania (zalecana modyfikacja middleware: tworzyć request‑scoped klienta z `global.headers.Authorization`).
3. Handler `POST`:
   - Waliduje body (Zod).
   - Uzyskuje `userId` z `context.locals.supabase.auth.getUser()`.
   - Wywołuje serwis `setDisplayNameOnce(supabase, userId, displayName)`.
4. Serwis:
   - Sprawdza, czy profil istnieje i czy `display_name` jest już ustawione.
   - Jeśli profil nie istnieje:
     - Próbuje `insert` profilu z `user_id` i `display_name` (RLS: INSERT tylko dla zalogowanych).
   - Jeśli profil istnieje i `display_name` jest `NULL`:
     - Wykonuje `update` z warunkiem `display_name IS NULL` (ochrona przed wyścigiem).
   - Mapuje wynik do `ProfileDto`.
   - Obsługuje błąd `23505` (unikat `normalized_display_name`) jako `display_name_conflict`.
5. Zwraca odpowiedź 201 z `ProfileDto` lub odpowiednie kody błędów.


### 6. Względy bezpieczeństwa
- **Auth wymagane**: wyłącznie uwierzytelniony użytkownik (JWT z Supabase).
- **Autoryzacja**: operacje na `profiles` ograniczone przez RLS (INSERT/UPDATE tylko właściciel). Serwis nie powinien używać `service_role`.
- **Zakres danych**: zwracamy jedynie bezpieczne pola (`userId`, `displayName`, `createdAt`).
- **Idempotencja biznesowa**: serwis zwraca 409 jeśli `display_name` był już ustawiony (nie zmienia wartości).
- **Ochrona przed wyścigami**: aktualizacja z warunkiem `display_name IS NULL` i/lub rely na DB trigger/constraint.
- **Walidacja wejścia**: Zod + ograniczenia DB (CHECK, UNIQUE).


### 7. Obsługa błędów
- 400 `validation_failed` — nieprawidłowy `displayName`:
  ```json
  { "code":"validation_failed","message":"Invalid displayName format" }
  ```
- 401 `unauthorized` — brak lub nieprawidłowy token:
  ```json
  { "code":"unauthorized","message":"Authentication required" }
  ```
- 409 `display_name_already_set` — `profiles.display_name` nie jest `NULL`:
  ```json
  { "code":"display_name_already_set","message":"Display name already set" }
  ```
- 409 `display_name_conflict` — konflikt unikalności z innym profilem (`normalized_display_name`):
  ```json
  { "code":"display_name_conflict","message":"Display name already taken" }
  ```
- 500 `internal_error` — błąd Supabase/serwera:
  ```json
  { "code":"internal_error","message":"Unexpected server error" }
  ```

Logowanie błędów (MVP):
- `console.error` z kontekstem (route, userId, payload skrócone, supabase error). W przyszłości: tabela `error_logs` lub APM.


### 8. Rozważania dotyczące wydajności
- Pojedynczy insert/update po PK — bardzo szybkie.
- Weryfikacja unikalności po stronie DB na `normalized_display_name`.
- Brak dodatkowych joinów; minimalny payload.


### 9. Kroki implementacji
1. (Opcjonalnie, zalecane) Zmodyfikować middleware `src/middleware/index.ts`, aby wstrzykiwał per‑request klienta Supabase z nagłówkiem Authorization:
   - Odczytać `Authorization` z `context.request.headers`.
   - Utworzyć nowy klient `createClient<Database>(url, anonKey, { global: { headers: { Authorization }}})`.
   - Przypisać do `context.locals.supabase`.
   - Zachować zgodność z regułą „Use supabase from context.locals” i typem `SupabaseClient`.

2. Utworzyć serwis: `src/lib/services/profile.service.ts`
   - API:
     ```ts
     import type { SupabaseClient } from '../../db/supabase.client';
     import type { ProfileDto } from '../../types';

     export async function setDisplayNameOnce(
       supabase: SupabaseClient,
       userId: string,
       displayName: string
     ): Promise<ProfileDto> {
       // 1) Sprawdź istniejący profil
       const { data: existing, error: selErr } = await supabase
         .from('profiles')
         .select('user_id, display_name, created_at')
         .eq('user_id', userId)
         .maybeSingle();
       if (selErr) throw selErr;

       if (!existing) {
         // 2) Wstaw jeśli nie istnieje
         const { data, error } = await supabase
           .from('profiles')
           .insert({ user_id: userId, display_name: displayName })
           .select('user_id, display_name, created_at')
           .single();
         if (error) throw error;
         return { userId: data.user_id, displayName: data.display_name, createdAt: data.created_at };
       }

       if (existing.display_name !== null) {
         // 3) Już ustawione — zwróć błąd domenowy (obsłuży go endpoint jako 409)
         const err = new Error('display_name_already_set');
         // @ts-ignore attach code for mapping
         err.code = 'display_name_already_set';
         throw err;
       }

       // 4) Ustaw gdy NULL z warunkiem — ochrona przed wyścigiem
       const { data, error } = await supabase
         .from('profiles')
         .update({ display_name: displayName })
         .eq('user_id', userId)
         .is('display_name', null)
         .select('user_id, display_name, created_at')
         .single();
       if (error) throw error;

       return { userId: data.user_id, displayName: data.display_name, createdAt: data.created_at };
     }
     ```
   - Mapowanie błędów:
     - `PostgrestError.code === '23505'` → `display_name_conflict` (409).
     - `Error.code === 'display_name_already_set'` → 409.

3. Utworzyć endpoint: `src/pages/api/profiles/me/display-name.ts`
   - Zasady Astro:
     - `export const prerender = false`
     - `export const POST`
     - Zod do walidacji body
     - `context.locals.supabase` + `auth.getUser()` do ustalenia `userId`
   - Szkic:
     ```ts
     import type { APIRoute } from 'astro';
     import { z } from 'zod';
     import { setDisplayNameOnce } from '../../../lib/services/profile.service';

     export const prerender = false;

     const bodySchema = z.object({
       displayName: z.string()
         .min(1)
         .max(32)
         .regex(/^[A-Za-z0-9ĄĆĘŁŃÓŚŹŻąćęłńóśźż .-]+$/),
     });

     export const POST: APIRoute = async (context) => {
       try {
         const supabase = context.locals.supabase;

         const authRes = await supabase.auth.getUser();
         const user = authRes.data.user;
         if (!user) {
           return new Response(JSON.stringify({ code: 'unauthorized', message: 'Authentication required' }), {
             status: 401, headers: { 'Content-Type': 'application/json; charset=utf-8' }
           });
         }

         const json = await context.request.json().catch(() => null);
         const parsed = bodySchema.safeParse(json);
         if (!parsed.success) {
           return new Response(JSON.stringify({ code: 'validation_failed', message: 'Invalid displayName format' }), {
             status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' }
           });
         }

         try {
           const dto = await setDisplayNameOnce(supabase, user.id, parsed.data.displayName);
           return new Response(JSON.stringify(dto), {
             status: 201, headers: { 'Content-Type': 'application/json; charset=utf-8' }
           });
         } catch (err: any) {
           // Mapowanie do 409
           const code = err?.code || err?.cause?.code || err?.message;
           if (code === 'display_name_already_set') {
             return new Response(JSON.stringify({ code: 'display_name_already_set', message: 'Display name already set' }), {
               status: 409, headers: { 'Content-Type': 'application/json; charset=utf-8' }
             });
           }
           if (err?.code === '23505') {
             return new Response(JSON.stringify({ code: 'display_name_conflict', message: 'Display name already taken' }), {
               status: 409, headers: { 'Content-Type': 'application/json; charset=utf-8' }
             });
           }
           throw err;
         }
       } catch (err) {
         console.error('[POST /api/profiles/me/display-name] error', { err });
         return new Response(JSON.stringify({ code: 'internal_error', message: 'Unexpected server error' }), {
           status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' }
         });
       }
     };
     ```

4. Testy ręczne:
   - 401: brak/niepoprawny token
   - 400: `displayName` pusty, >32 znaki, niedozwolone znaki
   - 201: pierwszy sukces ustawienia
   - 409: powtórne ustawienie (already_set)
   - 409: konflikt unikalności (użyj drugiego konta z takim samym `displayName` różniącym się np. wielkością liter/diakrytykami)

5. (Opcjonalnie) Monitoring i logowanie:
   - `X-Request-Id` w logach;
   - Docelowo: zapis do tabeli `error_logs`/zewnętrzny APM.

6. Dokumentacja:
   - Opisać endpoint, przykłady request/response, scenariusze błędów, kody statusu.


### 10. Kryteria akceptacji
- 201 przy pierwszym ustawieniu, body zgodne z `ProfileDto`.
- 400 dla walidacji formatu/rozmiaru.
- 401 gdy brak autentykacji.
- 409 dla `display_name_already_set` i `display_name_conflict`.
- Brak modyfikacji `display_name`, jeśli było już ustawione.
- Zgodność z regułami: użycie `context.locals.supabase` i typu `SupabaseClient` z `src/db/supabase.client.ts`; walidacja Zod; handler `POST` i `prerender = false`.


