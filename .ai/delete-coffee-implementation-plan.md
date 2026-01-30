## API Endpoint Implementation Plan: DELETE /api/coffees/{id}

### 1. Przegląd punktu końcowego

- Endpoint umożliwiający usunięcie kawy przez zalogowanego użytkownika.
- Usunięcie kawy powoduje kaskadowe usunięcie wszystkich powiązanych ocen.
- Wymaga uwierzytelnienia.
- Dane pochodzą z tabeli `public.coffees`.

### 2. Szczegóły żądania

- **Metoda HTTP**: DELETE
- **Struktura URL**: `/api/coffees/{id}`
- **Parametry**:
  - **Wymagane**:
    - `id` (path param): `uuid` kawy
  - **Opcjonalne**: brak
- **Nagłówki**: `Authorization: Bearer <token>` (wymagany)
- **Request Body**: brak
- **Astro**:
  - `export const prerender = false`
  - Handler `export async function DELETE(context: APIContext)`
  - Używać `context.locals.supabase` i `context.locals.user`

### 3. Zmiany w bazie danych

#### 3.1 Migracja: Kaskadowe usuwanie ocen

```sql
-- Migracja: 20260130_add_cascade_delete_coffees.sql

-- Dodaj kaskadowe usuwanie ocen przy usuwaniu kawy
-- (jeśli nie istnieje już w schemacie)
ALTER TABLE public.ratings
DROP CONSTRAINT IF EXISTS ratings_coffee_id_fkey,
ADD CONSTRAINT ratings_coffee_id_fkey
  FOREIGN KEY (coffee_id)
  REFERENCES public.coffees(id)
  ON DELETE CASCADE;

-- Dodaj politykę RLS dla DELETE na tabeli coffees
-- (zakładając że RLS jest włączone)
CREATE POLICY coffees_delete_authenticated ON public.coffees
  FOR DELETE
  TO authenticated
  USING (true);
```

### 4. Wykorzystywane typy

- Z `src/types.ts`:
  - `CoffeeDetailDto`
- Z `src/db/database.types.ts`:
  - `public.coffees.Row`
- Z klienta:
  - `SupabaseClient` z `src/db/supabase.client.ts`

### 5. Szczegóły odpowiedzi

- **204 No Content**: Pomyślne usunięcie kawy (brak body)
- **400 Bad Request**: `{ "code": "validation_failed", "message": "Invalid id" }`
- **401 Unauthorized**: `{ "code": "unauthorized", "message": "Authentication required" }`
- **404 Not Found**: `{ "code": "coffee_not_found", "message": "Coffee not found" }`
- **500 Internal Server Error**: `{ "code": "internal_error", "message": "Unexpected error" }`

### 6. Przepływ danych

1. Router Astro: plik `src/pages/api/coffees/[id].ts` - dodać handler DELETE.
2. Handler `DELETE`:
   - Sprawdź uwierzytelnienie użytkownika (`context.locals.user`).
   - Parsuj `id` z `params.id`.
   - Waliduj `id` jako UUID (Zod).
   - Pobierz `locals.supabase` (klient Supabase).
   - Pobierz kawę z bazy danych i sprawdź czy istnieje.
   - Usuń kawę z bazy danych.
   - Zwróć 204 No Content.
3. Kaskadowe usuwanie ocen następuje automatycznie dzięki FK constraint.

### 7. Względy bezpieczeństwa

- Wymaga ważnego tokena JWT w nagłówku Authorization.
- Każdy zalogowany użytkownik może usunąć kawę.
- RLS jako dodatkowa warstwa zabezpieczeń (polityka `coffees_delete_authenticated`).
- Walidacja danych wejściowych (UUID) Zod-em.
- Brak interpolacji SQL (użycie query buildera Supabase).
- Rate limiting aplikacyjny: 60 req/min/user dla operacji zapisu.

### 8. Obsługa błędów

- Scenariusze:
  - `validation_failed` (400): `id` nie jest UUID.
  - `unauthorized` (401): brak tokena lub token nieważny.
  - `coffee_not_found` (404): brak rekordu w tabeli dla podanego `id`.
  - `internal_error` (500): błędy serwerowe/Supabase.
- Logowanie:
  - Logi serwerowe (`console.error`) z korelacją żądania.

### 9. Rozważania dotyczące wydajności

- Selekcja po kluczu głównym `id` → jednoznaczny odczyt; szybkie dzięki indeksom.
- Kaskadowe usuwanie ocen może być wolniejsze dla kaw z dużą liczbą ocen.
- Cel p95 ≤ 300 ms.

### 10. Aktualizacja serwisu

Dodaj funkcję do `src/lib/services/coffee.service.ts`:

```typescript
/**
 * Deletes a coffee by id.
 *
 * @param supabase - The Supabase client instance
 * @param coffeeId - Coffee UUID
 * @throws CoffeeServiceError with code:
 *   - 'coffee_not_found' if the coffee doesn't exist
 *   - 'server_error' for unexpected errors
 */
export async function deleteCoffee(
  supabase: SupabaseClient,
  coffeeId: string
): Promise<void> {
  // 1) Fetch coffee to check existence
  const { data: coffee, error: fetchError } = await supabase
    .from("coffees")
    .select("id")
    .eq("id", coffeeId)
    .maybeSingle();

  if (fetchError) {
    console.error("[coffee.service] Error fetching coffee for deletion", { 
      coffeeId, 
      error: fetchError 
    });
    throw new CoffeeServiceError("server_error", "Failed to fetch coffee");
  }

  if (!coffee) {
    throw new CoffeeServiceError("coffee_not_found", "Coffee not found");
  }

  // 2) Delete coffee (cascade will delete ratings)
  const { error: deleteError } = await supabase
    .from("coffees")
    .delete()
    .eq("id", coffeeId);

  if (deleteError) {
    console.error("[coffee.service] Error deleting coffee", { 
      coffeeId, 
      error: deleteError 
    });
    throw new CoffeeServiceError("server_error", "Failed to delete coffee");
  }
}
```

### 11. Aktualizacja API handlera

Dodaj handler DELETE do `src/pages/api/coffees/[id].ts`:

```typescript
/**
 * DELETE /api/coffees/{id}
 *
 * Deletes a coffee by id. Any authenticated user can delete.
 * All associated ratings are deleted (cascade).
 *
 * Responses:
 * - 204: Successful deletion (no content)
 * - 400: Invalid id (non-UUID)
 * - 401: Unauthorized (not authenticated)
 * - 404: Coffee not found
 * - 500: Internal server error
 */
export const DELETE: APIRoute = async (context) => {
  const requestId = context.request.headers.get("x-request-id") ?? undefined;

  try {
    // 1) Check authentication
    const user = context.locals.user;
    if (!user) {
      return jsonUnauthorized("unauthorized", "Authentication required");
    }

    // 2) Validate path params
    const parsedParams = coffeePathParamsSchema.safeParse(context.params);
    if (!parsedParams.success) {
      return jsonBadRequest("validation_failed", "Invalid id");
    }

    const { id } = parsedParams.data;

    // 3) Delete coffee via service
    await deleteCoffee(context.locals.supabase, id);

    // 4) Return 204 No Content
    return new Response(null, { status: 204 });
  } catch (err) {
    if (err instanceof CoffeeServiceError) {
      switch (err.code) {
        case "coffee_not_found":
          return jsonNotFound("coffee_not_found", err.message);
        default:
          console.error("[DELETE /api/coffees/{id}] service error", { 
            err, 
            requestId 
          });
          return jsonError("internal_error", "Unexpected error");
      }
    }

    console.error("[DELETE /api/coffees/{id}] error", { err, requestId });
    return jsonError("internal_error", "Unexpected error");
  }
};
```

### 12. Aktualizacja frontendu

#### 12.1 Hook useCoffeeDelete

Hook `useCoffeeDelete` został już utworzony w `src/components/coffees/hooks/useCoffeeDelete.ts`.

#### 12.2 Komponent DeleteCoffeeButton

Komponent `DeleteCoffeeButton` został już dodany do `CoffeeDetailView.tsx`.
Przycisk jest widoczny dla wszystkich zalogowanych użytkowników.

### 13. Kroki implementacji

1. **Migracja bazy danych**
   - Utwórz plik migracji `supabase/migrations/20260130_add_cascade_delete_coffees.sql`
   - Dodaj kaskadowe usuwanie ocen
   - Dodaj politykę RLS dla DELETE (dla zalogowanych użytkowników)

2. **Serwis domenowy**
   - Zaktualizuj `src/lib/services/coffee.service.ts` - dodaj funkcję `deleteCoffee`

3. **API Endpoint**
   - Zaktualizuj `src/pages/api/coffees/[id].ts` - dodaj handler DELETE

4. **Frontend** (ZROBIONE)
   - Hook `useCoffeeDelete` - utworzony
   - Komponent `DeleteCoffeeButton` w `CoffeeDetailView.tsx` - dodany
   - Przycisk widoczny dla wszystkich zalogowanych użytkowników

5. **Testy**
   - Dodaj testy API dla DELETE endpoint
   - Dodaj testy jednostkowe dla `deleteCoffee` service

### 14. Przykładowe odpowiedzi

- **204 No Content** (pomyślne usunięcie - brak body)

- **400 Bad Request**

```json
{ "code": "validation_failed", "message": "Invalid id" }
```

- **401 Unauthorized**

```json
{ "code": "unauthorized", "message": "Authentication required" }
```

- **404 Not Found**

```json
{ "code": "coffee_not_found", "message": "Coffee not found" }
```

- **500 Internal Server Error**

```json
{ "code": "internal_error", "message": "Unexpected error" }
```
