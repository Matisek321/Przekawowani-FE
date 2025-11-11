## API Endpoint Implementation Plan: POST /api/roasteries

### 1. Przegląd punktu końcowego
Endpoint tworzy nową palarnię w bazie (`public.roasteries`). Wymaga autentykacji (Supabase Auth). Rekord jest unikalny względem znormalizowanej pary `(name, city)` — duplikaty zwracają `409 roastery_duplicate`. W odpowiedzi zwracane są podstawowe pola nowo utworzonej palarni.


### 2. Szczegóły żądania
- **Metoda HTTP**: POST
- **URL**: `/api/roasteries`
- **Parametry**:
  - **Wymagane**: brak path/query parametrów
  - **Auth**: wymagany ważny JWT w `Authorization: Bearer <access_token>`
- **Request Body (JSON)**:
  ```json
  { "name": "string", "city": "string" }
  ```
- **Walidacja (Zod)**:
  - `name`: `string().trim().min(1).max(64)`
  - `city`: `string().trim().min(1).max(64)`
  - Odrzucenie pustych po `trim()` oraz zbyt długich wartości; brak dodatkowej normalizacji w payload (normalizacja jest po stronie DB).
- **Nagłówki żądania**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <token>`


### 3. Wykorzystywane typy
- **Z `src/types.ts`**:

```59:64:src/types.ts
export type RoasteryDto = {
  id: RoasteryRow['id']
  name: RoasteryRow['name']
  city: RoasteryRow['city']
  createdAt: RoasteryRow['created_at']
}
```

```71:74:src/types.ts
export type CreateRoasteryCommand = {
  name: TablesInsert<'roasteries'>['name']
  city: TablesInsert<'roasteries'>['city']
}
```

- **Z `src/db/database.types.ts`** (istotne kolumny):

```147:163:src/db/database.types.ts
roasteries: {
  Row: {
    city: string
    created_at: string
    id: string
    name: string
    normalized_city: string | null
    normalized_name: string | null
  }
  Insert: {
    city: string
    created_at?: string
    id?: string
    name: string
    normalized_city?: string | null
    normalized_name?: string | null
  }
  // ...
}
```

- **Klient Supabase**:
  - Typ: `SupabaseClient` z `src/db/supabase.client.ts`
  - Użycie: wyłącznie `context.locals.supabase` w endpointach


### 4. Szczegóły odpowiedzi
- **201 Created**: `RoasteryDto`
  ```json
  { "id": "uuid", "name": "string", "city": "string", "createdAt": "ISO-8601" }
  ```
  - Zalecany nagłówek: `Location: /api/roasteries/{id}`
- **400 Bad Request**: walidacja wejścia
  ```json
  { "error": { "code": "validation_failed", "message": "Invalid payload" } }
  ```
- **401 Unauthorized**: brak/niepoprawny token
  ```json
  { "error": { "code": "unauthorized", "message": "Authentication required" } }
  ```
- **409 Conflict**: duplikat `(name, city)` po normalizacji
  ```json
  { "error": { "code": "roastery_duplicate", "message": "Roastery already exists" } }
  ```
- **500 Internal Server Error**: błąd niespodziewany/DB
  ```json
  { "error": { "code": "internal_error", "message": "Unexpected server error" } }
  ```


### 5. Przepływ danych
1. Żądanie trafia do `src/pages/api/roasteries.ts` (ten sam plik co GET listy; dodajemy `export const POST`).  
2. Middleware (`src/middleware/index.ts`) wstrzykuje `supabase` do `context.locals`:

```5:8:src/middleware/index.ts
export const onRequest = defineMiddleware((context, next) => {
  context.locals.supabase = supabaseClient;
  return next();
});
```

3. Handler `POST`:
   - Odczytuje i parsuje `JSON` body.
   - Waliduje payload Zodem (`name`, `city` niepuste, max 64).
   - Sprawdza tożsamość: `const { data: { user } } = await supabase.auth.getUser()`; brak `user` → `401`.
   - Wywołuje serwis domenowy `createRoastery(supabase, { name, city })`.
4. Serwis `createRoastery`:
   - Wykonuje `insert` do `public.roasteries` (tylko `name`, `city`; normalizację zapewnia DB).
   - `.select('id,name,city,created_at').single()` i mapuje do `RoasteryDto`.
   - Mapuje błąd unikalności (`PostgrestError.code === '23505'`) na błąd domenowy `roastery_duplicate`.
5. Endpoint zwraca `201` z `RoasteryDto` oraz nagłówek `Location` wskazujący nowy zasób.


### 6. Względy bezpieczeństwa
- **Uwierzytelnianie wymagane**: tylko zalogowani użytkownicy mogą tworzyć palarnie.
- **Autoryzacja i RLS**: rely na politykach DB (INSERT ograniczony odpowiednio). Nie używać `service_role` w endpointach.
- **Użycie klienta**: bezpośrednio `context.locals.supabase` (zgodnie z zasadami). Dla pełnego kontekstu tożsamości rozważyć per‑request klienta z nagłówkiem `Authorization` (opcjonalna modyfikacja middleware).
- **Walidacja**: Zod + ograniczenia DB (UNIQUE na znormalizowanych polach).
- **Nagłówki**: `Content-Type: application/json; charset=utf-8`. Brak danych wrażliwych w odpowiedzi.
- **Rate limiting**: do rozważenia na poziomie edge/proxy.


### 7. Obsługa błędów
- **400 `validation_failed`**: niepoprawne body (brak pól, puste po `trim()`, >64 znaki).
- **401 `unauthorized`**: brak ważnego tokenu, `auth.getUser()` zwraca `null`.
- **409 `roastery_duplicate`**: błąd unikalności (`23505`) — para `(normalized_name, normalized_city)` w konflikcie.
- **500 `internal_error`**: każdy inny błąd Supabase/serwera.
- **Logowanie**:
  - Strukturalnie przez `console.error({ requestId, path, error })`.
  - Brak dedykowanej tabeli błędów w projekcie — w przyszłości opcjonalny insert do tabeli `error_logs`/APM (best‑effort, nie blokować odpowiedzi).


### 8. Rozważania dotyczące wydajności
- Operacja to pojedynczy `INSERT` po indeksach PK/UNIQUE — bardzo szybka.
- Normalizacja i unikalność po stronie DB eliminują konieczność pre‑check w aplikacji (unikamy wyścigów).
- Zwracamy tylko potrzebne pola (`id,name,city,created_at`).


### 9. Kroki implementacji
1. **Walidacja wejścia (Zod)**
   - Plik: `src/lib/validation/roasteries.ts` (jeśli nie istnieje, utworzyć; współdzielony dla GET/POST)
   - Dodaj:
     ```ts
     import { z } from 'zod';

     export const CreateRoasteryBodySchema = z.object({
       name: z.string().trim().min(1).max(64),
       city: z.string().trim().min(1).max(64),
     });
     export type CreateRoasteryBody = z.infer<typeof CreateRoasteryBodySchema>;
     ```

2. **Serwis domenowy**
   - Plik: `src/lib/services/roasteries.service.ts` (rozszerzyć istniejący lub utworzyć)
   - API:
     ```ts
     import type { SupabaseClient } from '../../db/supabase.client';
     import type { RoasteryDto, CreateRoasteryCommand } from '../../types';

     export async function createRoastery(
       client: SupabaseClient,
       payload: CreateRoasteryCommand,
     ): Promise<RoasteryDto> {
       const { data, error } = await client
         .from('roasteries')
         .insert({ name: payload.name, city: payload.city })
         .select('id,name,city,created_at')
         .single();

       if (error) {
         // 23505 → unique_violation
         if ((error as any).code === '23505') {
           const dup = new Error('roastery_duplicate');
           // @ts-ignore domain code for mapping
           dup.code = 'roastery_duplicate';
           throw dup;
         }
         throw error;
       }

       return {
         id: data.id,
         name: data.name,
         city: data.city,
         createdAt: data.created_at,
       };
     }
     ```

3. **Endpoint Astro**
   - Plik: `src/pages/api/roasteries.ts` (dodaj `export const POST` obok `GET` z planu listowania)
   - Szkic:
     ```ts
     import type { APIRoute } from 'astro';
     import { CreateRoasteryBodySchema } from '../../lib/validation/roasteries';
     import { createRoastery } from '../../lib/services/roasteries.service';
     import type { RoasteryDto } from '../../types';

     export const prerender = false;

     export const POST: APIRoute = async (context) => {
       const requestId = crypto.randomUUID();
       try {
         const supabase = context.locals.supabase;
         const { data: { user } } = await supabase.auth.getUser();
         if (!user) {
           return new Response(JSON.stringify({ error: { code: 'unauthorized', message: 'Authentication required' } }), {
             status: 401, headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Request-Id': requestId },
           });
         }

         const body = await context.request.json().catch(() => null);
         const parsed = CreateRoasteryBodySchema.safeParse(body);
         if (!parsed.success) {
           return new Response(JSON.stringify({ error: { code: 'validation_failed', message: 'Invalid payload' } }), {
             status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Request-Id': requestId },
           });
         }

         try {
           const dto: RoasteryDto = await createRoastery(supabase, parsed.data);
           return new Response(JSON.stringify(dto), {
             status: 201,
             headers: {
               'Content-Type': 'application/json; charset=utf-8',
               'Location': `/api/roasteries/${dto.id}`,
               'X-Request-Id': requestId,
             },
           });
         } catch (err: any) {
           const code = err?.code || err?.message;
           if (code === 'roastery_duplicate') {
             return new Response(JSON.stringify({ error: { code: 'roastery_duplicate', message: 'Roastery already exists' } }), {
               status: 409, headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Request-Id': requestId },
             });
           }
           throw err;
         }
       } catch (error) {
         console.error({ requestId, path: '/api/roasteries', method: 'POST', error });
         return new Response(JSON.stringify({ error: { code: 'internal_error', message: 'Unexpected server error' } }), {
           status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Request-Id': requestId },
         });
       }
     };
     ```

4. **Testy ręczne (smoke)**
   - 401: brak/niepoprawny token.
   - 400: `name` lub `city` puste po `trim()`, >64 znaki, brak w body.
   - 201: poprawne utworzenie, `Location` ustawione.
   - 409: utworzenie duplikatu (różnice tylko w wielkości liter/diakrytykach).

5. **Dokumentacja i monitoring**
   - Zaktualizować dokumentację API (przykłady request/response).
   - W logach sprawdzić `requestId`, payload (bez wrażliwych danych) i czasy wykonania.


### 10. Kryteria akceptacji
- Zwraca `201` z `RoasteryDto` przy sukcesie i `Location` nagłówkiem.
- Zwraca `400 validation_failed` dla nieprawidłowego body.
- Zwraca `401 unauthorized` gdy brak autentykacji.
- Zwraca `409 roastery_duplicate` dla konfliktów unikalności.
- Zwraca `500 internal_error` dla nieoczekiwanych błędów.
- Endpoint używa `context.locals.supabase` (typ `SupabaseClient` z `src/db/supabase.client.ts`).
- Walidacja Zod, `export const prerender = false`, handler `POST` wielkimi literami.


