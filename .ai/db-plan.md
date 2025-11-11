## 1. Lista tabel z kolumnami, typami danych i ograniczeniami

Tabela users będzie zarządzana przez Supabase Auth.

### 1.1. profiles
- user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
- display_name text NULL
  - CHECK (display_name ~ '^[A-Za-z0-9ĄĆĘŁŃÓŚŹŻąćęłńóśźż .-]{1,32}$')
  - Uwaga: dopuszcza wielokrotne i wiodące/końcowe separatory: spacja, „-”, „.”
- normalized_display_name text GENERATED ALWAYS AS (lower(trim(unaccent(display_name)))) STORED
  - UNIQUE (normalized_display_name)
- created_at timestamptz NOT NULL DEFAULT now()
- Ograniczenia funkcjonalne:
  - display_name ustawiane jednokrotnie i nieedytowalne (egzekwowane triggerem)

### 1.2. roasteries
- id uuid PRIMARY KEY DEFAULT gen_random_uuid()
- name text NOT NULL
- normalized_name text GENERATED ALWAYS AS (lower(trim(unaccent(name)))) STORED
- city text NOT NULL
- normalized_city text GENERATED ALWAYS AS (lower(trim(unaccent(city)))) STORED
- created_at timestamptz NOT NULL DEFAULT now()
- Ograniczenia:
  - UNIQUE (normalized_name, normalized_city)

### 1.3. coffees
- id uuid PRIMARY KEY DEFAULT gen_random_uuid()
- roastery_id uuid NOT NULL REFERENCES roasteries(id) ON DELETE RESTRICT
- name text NOT NULL
- normalized_name text GENERATED ALWAYS AS (lower(trim(unaccent(name)))) STORED
- avg_main numeric(3,2) NULL DEFAULT NULL  -- średnia głównej oceny (denormalizacja)
- ratings_count integer NOT NULL DEFAULT 0  -- liczba ocen (denormalizacja)
- created_at timestamptz NOT NULL DEFAULT now()
- Ograniczenia:
  - UNIQUE (roastery_id, normalized_name)

### 1.4. ratings
- id uuid PRIMARY KEY DEFAULT gen_random_uuid()
- user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
- coffee_id uuid NOT NULL REFERENCES coffees(id) ON DELETE CASCADE
- main smallint NOT NULL CHECK (main BETWEEN 2 AND 10)           -- skala 1–5 w krokach 0.5 (×2)
- strength smallint NOT NULL CHECK (strength BETWEEN 2 AND 10)   -- j.w.
- acidity smallint NOT NULL CHECK (acidity BETWEEN 2 AND 10)     -- j.w.
- aftertaste smallint NOT NULL CHECK (aftertaste BETWEEN 2 AND 10) -- j.w.
- created_at timestamptz NOT NULL DEFAULT now()
- updated_at timestamptz NOT NULL DEFAULT now()
- Ograniczenia:
  - UNIQUE (user_id, coffee_id)  -- jedna ocena per użytkownik per kawa

### 1.5. Widoki (publiczne)
- VIEW coffee_aggregates (podgląd publiczny agregatów, bez dostępu do surowych ocen)
  - Kolumny przykładowe: coffee_id, roastery_id, name, avg_main, ratings_count, small_sample (ratings_count < 3), created_at
  - Definicja oparta o dane z `coffees`; brak materializacji w MVP

### 1.6. Wymagane rozszerzenia
- CREATE EXTENSION IF NOT EXISTS unaccent;
- CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- dla gen_random_uuid()


## 2. Relacje między tabelami
- profiles 1—1 auth.users: `profiles.user_id` → `auth.users.id` (PK/FK, CASCADE)
- roasteries 1—N coffees: `coffees.roastery_id` → `roasteries.id` (RESTRICT)
- ratings N—1 coffees: `ratings.coffee_id` → `coffees.id` (CASCADE)
- ratings N—1 users: `ratings.user_id` → `auth.users.id` (CASCADE)
- Kardynalności kluczowe:
  - Palarnia ma wiele kaw (1:N)
  - Kawa należy do jednej palarni (N:1)
  - Użytkownik może ocenić daną kawę maksymalnie raz (UNIQUE (user_id, coffee_id))


## 3. Indeksy
- profiles:
  - UNIQUE (normalized_display_name)

- roasteries:
  - UNIQUE (normalized_name, normalized_city)
  - INDEX (normalized_name)
  - INDEX (normalized_city)

- coffees:
  - UNIQUE (roastery_id, normalized_name)
  - INDEX (roastery_id)
  - INDEX (avg_main DESC NULLS LAST, ratings_count DESC, id DESC)  -- ranking globalny
  - INDEX (roastery_id, avg_main DESC NULLS LAST, ratings_count DESC, id DESC)  -- ranking w obrębie palarni

- ratings:
  - UNIQUE (user_id, coffee_id)
  - INDEX (coffee_id)
  - INDEX (user_id)


## 4. Zasady PostgreSQL (RLS)

Uwaga: włącz RLS na wszystkich tabelach użytkownika:
- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
- ALTER TABLE roasteries ENABLE ROW LEVEL SECURITY;
- ALTER TABLE coffees ENABLE ROW LEVEL SECURITY;
- ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

Zasady (przykładowe, zgodne z Supabase i JWT claimami):

### 4.1. profiles
- SELECT: public (wszyscy)
  - USING: true
- INSERT: tylko właściciel (tworzone automatycznie w backendzie – opcjonalne)
- UPDATE: tylko właściciel
  - USING: auth.uid() = user_id
  - Uwaga: blokadę ponownej edycji `display_name` egzekwować TRIGGEREM (zmiana dozwolona tylko z NULL → wartość)
- DELETE: zabronione (operacyjnie niepotrzebne)

### 4.2. roasteries
- SELECT: public (wszyscy)
  - USING: true
- INSERT: tylko zalogowani
  - USING: auth.role() = 'authenticated'
  - CHECK: auth.role() = 'authenticated'
- UPDATE: zabronione (brak polityki)
- DELETE: zabronione (brak polityki)

### 4.3. coffees
- SELECT: public (wszyscy)
  - USING: true
- INSERT: tylko zalogowani
  - USING: auth.role() = 'authenticated'
  - CHECK: auth.role() = 'authenticated'
- UPDATE: zabronione (brak polityki)
- DELETE: zabronione (brak polityki)

### 4.4. ratings
- SELECT: tylko właściciel lub rola uprzywilejowana (np. admin/service)
  - Polityka 1 (właściciel): USING: auth.uid() = user_id
  - Polityka 2 (admin): USING: coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'admin'
- INSERT: tylko właściciel (oceniający użytkownik)
  - USING: auth.uid() = user_id
  - CHECK: auth.uid() = user_id
- UPDATE: tylko właściciel (edycja własnej oceny)
  - USING: auth.uid() = user_id
  - CHECK: auth.uid() = user_id
- DELETE: brak (poza kaskadą przy usunięciu konta)

Uwaga: rola Admin ma pełny dostęp (bypass) wg polityki claim `role = 'admin'` w JWT. Alternatywnie można użyć service_role poza RLS.


## 5. Dodatkowe uwagi i wyjaśnienia decyzji projektowych
- Normalizacja unikalności: wszystkie pola objęte unikalnością wykorzystują `lower(trim(unaccent(...)))` w kolumnach GENERATED STORED. Zmniejsza to ryzyko duplikatów różniących się wielkością liter, spacjami lub diakrytykami.
- Denormalizacje wydajnościowe:
  - `coffees.avg_main` i `coffees.ratings_count` są aktualizowane TRIGGERAMI na `ratings` (INSERT/UPDATE/DELETE).
  - Publiczne listy i szczegóły korzystają z widoku `coffee_aggregates` opartego na tych kolumnach.
- Skale ocen: przechowywane jako `smallint` ×2 (2..10), co eliminuje błędy zmiennoprzecinkowe i upraszcza CHECK.
- Usuwanie konta: `ratings.user_id` ma ON DELETE CASCADE, dzięki czemu oceny są usuwane wraz z kontem zgodnie z PRD.
- Brak edycji/usuwania palarni i kaw w MVP: egzekwowane przez brak polityk RLS dla UPDATE/DELETE oraz przez REVOKE na tych operacjach.
- Soft limity (MVP, bez paginacji): sugerowane `LIMIT` po stronie zapytań/API
  - 50 palarni na liście,
  - 30 kaw dla widoku palarni,
  - 100 kaw w widoku globalnym.
  Limity te nie są egzekwowane w DB (zostaną dodane paginacje w kolejnych iteracjach).
- Indeksy sortujące: kierunki i `NULLS LAST` zostały określone tak, by odpowiadać zapytaniom ORDER BY dla rankingów; tie-breaker `id` zapewnia stabilny porządek.
- Polityka prywatności ocen: surowe rekordy w `ratings` nie są publiczne; do UI wystarczą agregaty z `coffees`/widoku. Flaga „mała próba” wyliczana ad-hoc: `ratings_count < 3`.


