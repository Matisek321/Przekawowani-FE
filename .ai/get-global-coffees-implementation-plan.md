## API Endpoint Implementation Plan: GET /api/coffees

## 1. Przegląd punktu końcowego

Globalna lista kaw (coffees) posortowana wg oceny agregowanej. Endpoint zwraca paginowaną listę obiektów kaw z ich metadanymi i danymi agregatów (średnia ocena, liczba ocen, flaga smallSample). Możliwa jest filtracja po palarni (`roasteryId`), proste wyszukiwanie po nazwie (`q`) oraz kontrola paginacji. Sortowanie ograniczone do zdefiniowanego wariantu rankingowego.

## 2. Szczegóły żądania

- **Metoda HTTP**: GET
- **Struktura URL**: `/api/coffees`
- **Parametry zapytania**:
  - **Wymagane**: brak
  - **Opcjonalne**:
    - `page`: number, domyślnie 1, minimalnie 1
    - `pageSize`: number, domyślnie 100, maksymalnie 100
    - `roasteryId`: uuid (filtr po palarni)
    - `q`: string (filtrowanie po nazwie kawy; dopasowanie do kolumny znormalizowanej)
    - `sort`: enum, domyślnie `rating_desc`; obsługiwane tylko `rating_desc`
- **Request Body**: brak

Walidacja parametrów wejściowych zostanie zrealizowana przez Zod. Niewspierane wartości `sort` lub niepoprawne typy/zakresy parametrów skutkują 400.

## 3. Wykorzystywane typy

- Z `src/types.ts`:
  - `CoffeeDto`
  - `CoffeeListResponse` (alias `PaginatedResponse<CoffeeDto>`)
- Brak Command modeli (endpoint tylko do odczytu).

## 3. Szczegóły odpowiedzi

- **200 OK** – `CoffeeListResponse`
  - `page`: number
  - `pageSize`: number
  - `total`: number (łączna liczba rekordów spełniających filtry)
  - `items`: `CoffeeDto[]`
    - `id`, `roasteryId`, `name`, `avgMain`, `ratingsCount`, `smallSample`, `createdAt`
- **400 Bad Request** – błędne parametry wejściowe (np. sort spoza whitelisty, niepoprawny UUID, nieprawidłowe zakresy).
- **500 Internal Server Error** – błąd w czasie zapytania do bazy lub nieprzewidziany błąd serwera.

Uwaga: 404 nie dotyczy listy – pusta lista powinna zwrócić 200 z `items: []` i `total: 0`.

## 4. Przepływ danych

1. Astro API route `src/pages/api/coffees.ts` (SSR, `export const prerender = false`) odbiera żądanie i odczytuje `searchParams` z `context.url`.
2. Walidacja parametrów przez Zod (page, pageSize, roasteryId, q, sort). Wartości domyślne ustawione po walidacji; `pageSize` obcięte do maks. 100.
3. Logika listowania w serwisie `src/lib/services/coffees.service.ts` (ekstrakcja z endpointu):
   - Użycie `context.locals.supabase` (typu `SupabaseClient` z `src/db/supabase.client.ts`).
   - Budowa zapytania do tabeli `public.coffees` (nie do widoku), aby umożliwić filtrację po `normalized_name` przy `q`:
     - Projekcja: `id, roastery_id, name, avg_main, ratings_count, created_at`.
     - Filtry:
       - jeżeli `roasteryId` podany: `eq('roastery_id', roasteryId)`
       - jeżeli `q` podane: wyznaczenie `normalizedQ` (niżej) i `ilike('normalized_name', %normalizedQ%)`
     - Sortowanie (dla `rating_desc`): `order('avg_main', { ascending: false, nullsFirst: false })`, następnie `order('ratings_count', { ascending: false })`, następnie `order('id', { ascending: false })` dla stabilności.
     - Paginacja: `from = (page - 1) * pageSize`, `to = from + pageSize - 1`, użycie `.range(from, to)`.
     - Zwrócenie jednocześnie danych i `count` przez `.select(columns, { count: 'exact' })`.
   - Wyliczenie `smallSample` jako `ratings_count < 3` po stronie serwera aplikacyjnego podczas mapowania na `CoffeeDto`.
4. Serwis zwraca `items` oraz `total`. Endpoint opakowuje wynik w `CoffeeListResponse` i zwraca 200.

Normalizacja zapytania `q`:
- Aby odwzorować bazodanowe `normalized_name` (które używa `unaccent_pl` + `lower(trim(...))`), należy zaimplementować pomocniczą funkcję w serwisie (JS) odwzorowującą polskie znaki na ASCII zgodnie z migracją: `'ĄĆĘŁŃÓŚŹŻąćęłńóśźż' -> 'ACELNOSZZacelnoszz'`, następnie `trim().toLowerCase()`.

Alternatywa (opcjonalna): gdy `q` nie jest używane, równie dobrze można czytać z widoku `public.coffee_aggregates` (ma kolumnę `small_sample`), jednak dla spójności i prostoty implementacji zalecane jest jedno źródło (`coffees`) i obliczanie `smallSample` w kodzie.

## 5. Względy bezpieczeństwa

- Brak wymogu autoryzacji (publiczny odczyt), ale:
  - Walidacja i whitelisting parametru `sort` (tylko `rating_desc`).
  - Limit `pageSize` (max 100) i sensowny zakres `page` (>= 1) – ochrona przed nadużyciem/DoS.
  - Unikanie interpolacji stringów – używamy query buildera Supabase (parametryzowane).
  - Zwracanie uogólnionych komunikatów błędów 500 (bez szczegółów bazy).
- CORS – korzystamy z domyślnej konfiguracji Astro; jeżeli endpoint będzie konsumowany spoza tej samej domeny, należy rozważyć politykę CORS na poziomie hostingu.

## 6. Obsługa błędów

- Scenariusze i kody:
  - Niepoprawny `page`, `pageSize`, niepoprawny `roasteryId` (UUID), nieobsługiwany `sort`, zbyt długie `q` → 400 (payload z kodem `validation_failed` i listą pól).
  - Błąd zapytania do Supabase (np. niedostępność bazy) → 500 (payload z kodem `server_error`).
  - Brak wyników → 200 z `items: []`, `total: 0`.
- Rejestrowanie błędów:
  - Brak dedykowanej tabeli błędów w schemacie – logi serwerowe (Astro) wystarczą w MVP.
  - Możliwość dodania centralnego loggera w przyszłości (np. do `src/lib`), z korelacją `requestId` z nagłówków.

## 7. Rozważania dotyczące wydajności

- Indeksy już obecne:
  - Globalny ranking: `coffees_ranking_global_idx (avg_main desc nulls last, ratings_count desc, id desc)`
  - Per palarnia: `coffees_ranking_per_roastery_idx (roastery_id, avg_main desc nulls last, ratings_count desc, id desc)`
- Filtr wyszukiwania po `normalized_name`:
  - Rozważyć dodanie indeksu: `create index if not exists coffees_normalized_name_idx on public.coffees (normalized_name);`
  - Dla wzorca `%term%` indeks może być mniej efektywny; akceptowalne w MVP, ewentualnie rozważyć trigramy w przyszłości.
- Unikać nadmiarowych kolumn – selekcjonować tylko potrzebne pola.
- Pojedyncze zapytanie z `count: 'exact'` + `range` – minimalizacja RTT.

## 8. Etapy wdrożenia

1. Utwórz serwis `src/lib/services/coffees.service.ts`:
   - Eksportuj funkcję `listCoffees(supabase: SupabaseClient, params): Promise<{ items: CoffeeDto[]; total: number }>`.
   - Zaimplementuj normalizację `q` (mapowanie znaków PL → ASCII, `trim().toLowerCase()`).
   - Zbuduj zapytanie do `public.coffees` z filtrami (`roastery_id`, `normalized_name`), sortowaniem i paginacją.
   - Zastosuj `.select('id, roastery_id, name, avg_main, ratings_count, created_at', { count: 'exact' })` oraz `.range(from, to)`.
   - Zmapuj wynik do `CoffeeDto` (ustaw `smallSample = ratings_count < 3`).
2. Dodaj walidację Zod w serwisie lub osobno w `src/lib/services/validation`:
   - Schemat `page` (int >= 1), `pageSize` (int 1..100), `roasteryId` (uuid), `q` (string 1..64), `sort` (literal `'rating_desc'`).
   - Zastosuj wartości domyślne: `page=1`, `pageSize=100`, `sort='rating_desc'`.
3. Zaimplementuj endpoint `src/pages/api/coffees.ts`:
   - `export const prerender = false`.
   - `export async function GET(context)`:
     - Pobierz `supabase` z `context.locals.supabase` (nie importuj klienta bezpośrednio).
     - Parsuj i waliduj `searchParams` przez Zod.
     - Wywołaj `listCoffees` i zwróć `CoffeeListResponse` z `200`.
     - Obsłuż błędy walidacji (400) i wewnętrzne (500) zgodnie z regułami.
4. Testy manualne (lokalne): przypadki brzegowe paginacji, filtrów (`roasteryId`, `q`), sortowania oraz pusta lista.
5. Opcjonalnie: dodać indeks `coffees_normalized_name_idx` jeśli wyszukiwanie po `q` będzie często używane.
6. Lint/typy – upewnij się, że brak błędów (`CoffeeDto`, `CoffeeListResponse` z `src/types.ts`).
7. Dokumentacja – krótki opis endpointu w README lub notatce `.ai`, z przykładami zapytań.


