# Plan implementacji widoku Dodanie palarni

## 1. Przegląd
Widok **Dodanie palarni** umożliwia zalogowanemu użytkownikowi utworzenie nowej palarni na podstawie pól `name` oraz `city`. W MVP nie przewidujemy edycji ani usuwania palarni po utworzeniu. Po sukcesie użytkownik jest przekierowywany do widoku szczegółów utworzonej palarni.

Kluczowe wymagania biznesowe (PRD/US-005):
- Walidacja pól wymaganych (niepuste stringi).
- Deduplikacja po znormalizowanych wartościach (`normalized_name`, `normalized_city`) – duplikat kończy się błędem 409.
- Widok i akcja dostępne wyłącznie dla użytkownika zalogowanego.
- Dodatkowy warunek dostępu do akcji: `display_name` ustawiony (gate akcyjny).

## 2. Routing widoku
- **Ścieżka**: `/roasteries/new`
- **Plik routingu (Astro)**: `src/pages/roasteries/new.astro`
- **Zachowanie routingu**:
  - Jeśli użytkownik nie jest zalogowany → przekierowanie do `/login` (lub fallback: komunikat + link do logowania, jeśli `/login` jeszcze nie istnieje).
  - Jeśli użytkownik jest zalogowany, ale nie ma ustawionego `display_name` → przekierowanie do `/account/display-name?returnTo=/roasteries/new` (lub alternatywnie modal w tym widoku; rekomendowane przekierowanie dla spójności).
  - Po sukcesie utworzenia palarni → przekierowanie do `/roasteries/:id`.

## 3. Struktura komponentów
Główne elementy widoku (Astro + React):
- Strona Astro jako “shell” routingu i SSR (opcjonalnie) + osadzenie komponentu React do formularza.
- Komponent React formularza z walidacją UI, obsługą submit, stanami ładowania i błędami.

Wysokopoziomowy diagram drzewa komponentów:

```text
src/pages/roasteries/new.astro
└─ <Layout title="Dodaj palarnię">
   └─ <CreateRoasteryPage client:load>
      ├─ <DisplayNameGate> (logika: user/session + display_name)
      │  └─ (children)
      ├─ <PageHeader>
      ├─ <InfoBanner> (brak edycji/usuwania w MVP)
      └─ <CreateRoasteryForm>
         ├─ <Field name="name">
         ├─ <Field name="city">
         ├─ <FormErrorBanner> (błędy ogólne / 409 / 500)
         └─ <SubmitButton>
```

## 4. Szczegóły komponentów

### `new.astro` (strona routingu)
- **Opis komponentu**: Strona Astro wystawiająca route `/roasteries/new`. Odpowiada za ustawienie tytułu i osadzenie komponentu React.
- **Główne elementy**:
  - `<Layout title="Dodaj palarnię"> ... </Layout>` (obecny `src/layouts/Layout.astro` lub docelowy “app shell”).
  - Montowanie React: `<CreateRoasteryPage client:load />` (lub `client:visible`, ale tu rekomendowane `client:load` ze względu na natychmiastowe sprawdzenie gate).
- **Obsługiwane zdarzenia**: brak (SSR/strona).
- **Walidacja**: brak bezpośredniej; walidacja i gate w React.
- **Typy**: brak.
- **Propsy**: brak.

### `CreateRoasteryPage` (React; kontener widoku)
Proponowana lokalizacja: `src/components/roasteries/CreateRoasteryPage.tsx`
- **Opis komponentu**: Kontener UI widoku. Wykonuje sprawdzenia dostępu (auth + display_name gate), renderuje nagłówek i formularz.
- **Główne elementy**:
  - Nagłówek (`<h1>Dodaj palarnię</h1>`) + krótki opis.
  - Sekcja informacji “W MVP nie można edytować ani usuwać palarni po utworzeniu.”
  - `<CreateRoasteryForm onSuccess={...} />`
- **Obsługiwane zdarzenia**:
  - Inicjalizacja (mount) → pobranie sesji użytkownika i sprawdzenie `display_name`.
  - `onSuccess(roasteryId)` → nawigacja do `/roasteries/${id}`.
- **Walidacja**:
  - Warunek wstępny: użytkownik zalogowany.
  - Warunek wstępny: `display_name` ustawiony (nie `null`).
- **Typy**:
  - `AuthState` (ViewModel lokalny) – opis w sekcji “Typy”.
- **Propsy**: brak (strona).

### `DisplayNameGate` (React; logika gate)
Opcje:
- jako komponent: `src/components/auth/DisplayNameGate.tsx`
- albo jako hook użyty w `CreateRoasteryPage`: `useDisplayNameGate()`

Rekomendacja: **hook + mały komponent stanu** (czytelniej i łatwiej współdzielić z innymi widokami “akcji zapisu”).

- **Opis**: Odpowiada za:
  - ustalenie czy jest sesja (`supabaseClient.auth.getSession()` / `getUser()`),
  - pozyskanie `userId`,
  - sprawdzenie czy profil ma `displayName` (np. przez `GET /api/profiles/:userId`),
  - wykonanie przekierowań.
- **Główne elementy**:
  - Renderuje `children` tylko gdy warunki spełnione.
  - Przy braku warunków: może zwrócić `null` (bo i tak przekierowuje) albo wyświetlić krótki ekran “Przekierowuję…”.
- **Obsługiwane zdarzenia**:
  - `useEffect` na mount → sprawdzenie i ewentualny redirect.
- **Walidacja**:
  - `session?.access_token` musi istnieć (auth gate).
  - `ProfileDto.displayName !== null` (display_name gate).
- **Typy**:
  - `ProfileDto` z `src/types.ts`
  - `GateDecision` (ViewModel lokalny)
- **Propsy**:
  - `returnTo: string` (np. `'/roasteries/new'`)
  - `children: React.ReactNode`

### `CreateRoasteryForm` (React; formularz)
Proponowana lokalizacja: `src/components/roasteries/CreateRoasteryForm.tsx`
- **Opis komponentu**: Formularz tworzenia palarni. Mapuje input użytkownika na `CreateRoasteryCommand`, wykonuje walidację UI zgodną z API i wysyła `POST /api/roasteries`.
- **Główne elementy HTML i komponenty dzieci**:
  - `<form>` z polami:
    - `<input name="name" ... />`
    - `<input name="city" ... />`
  - Etykiety `<label>` i opisy błędów powiązane z polami (`aria-describedby`).
  - Przycisk submit (np. `src/components/ui/button.tsx`).
  - Sekcja błędu ogólnego (np. “Roastery already exists” dla 409).
- **Obsługiwane zdarzenia**:
  - `onChange` pól → aktualizacja stanu formularza + opcjonalna walidacja “na bieżąco”.
  - `onBlur` pól → walidacja pola (opcjonalnie).
  - `onSubmit` → walidacja całego formularza + wysyłka żądania.
- **Warunki walidacji (zgodne z API `CreateRoasteryBodySchema`)**:
  - `name`:
    - `string`
    - `trim()`
    - `min(1)` → “Pole wymagane”
    - `max(64)` → “Maks. 64 znaki”
  - `city`:
    - `string`
    - `trim()`
    - `min(1)` → “Pole wymagane”
    - `max(64)` → “Maks. 64 znaki”
  - Blokada submitu gdy `isSubmitting === true` lub gdy walidacja nie przechodzi.
- **Typy (DTO i ViewModel)**:
  - `CreateRoasteryCommand` (request)
  - `RoasteryDto` (response)
  - `CreateRoasteryFormState`, `CreateRoasteryFormErrors` (ViewModel lokalny)
- **Propsy**:
  - `onSuccess: (created: RoasteryDto) => void`
  - (opcjonalnie) `initialValues?: Partial<CreateRoasteryFormState>`

## 5. Typy

### DTO (istniejące; `src/types.ts`)
- **`CreateRoasteryCommand`**:
  - `name: string`
  - `city: string`
- **`RoasteryDto`**:
  - `id: string (uuid)`
  - `name: string`
  - `city: string`
  - `createdAt: string (ISO-8601)`
- **`ProfileDto`** (do gate):
  - `userId: string (uuid)`
  - `displayName: string | null`
  - `createdAt: string (ISO-8601)`

### ViewModel (nowe; frontend)
Rekomendowane jako typy lokalne w plikach komponentów (lub w `src/types.ts` jeśli mają być współdzielone).

- **`CreateRoasteryFormState`**
  - `name: string`
  - `city: string`

- **`CreateRoasteryFormErrors`**
  - `name?: string` – błąd walidacji pola `name`
  - `city?: string` – błąd walidacji pola `city`
  - `form?: string` – błąd ogólny (np. 409/500/network)

- **`CreateRoasterySubmitResult`** (opcjonalnie)
  - `status: 'success' | 'error'`
  - `created?: RoasteryDto`
  - `errorCode?: 'validation_failed' | 'roastery_duplicate' | 'unauthorized' | 'internal_error' | 'network_error'`
  - `message?: string`

- **`GateDecision`** (opcjonalnie)
  - `status: 'checking' | 'allowed' | 'redirected' | 'blocked'`
  - `reason?: 'unauthenticated' | 'display_name_missing' | 'error'`

## 6. Zarządzanie stanem
Zalecane podejście: **lokalny stan w React** (bez globalnego store).

Stan w `CreateRoasteryForm`:
- `values: CreateRoasteryFormState`
- `errors: CreateRoasteryFormErrors`
- `isSubmitting: boolean`
- `serverRequestId?: string` (opcjonalnie; jeśli chcemy logować `X-Request-Id`)

Stan w gate (`useDisplayNameGate` / `DisplayNameGate`):
- `gate: GateDecision`
- (opcjonalnie) `profile?: ProfileDto`

Custom hooki (rekomendowane):
- `useAuthSession()`:
  - pobiera sesję i userId z Supabase w przeglądarce,
  - udostępnia `accessToken` do wywołań API.
- `useDisplayNameGate({ returnTo })`:
  - używa `useAuthSession()`,
  - sprawdza profil przez API i wykonuje redirecty.

## 7. Integracja API

### Wymagane wywołania API
1) **POST `/api/roasteries`** – utworzenie palarni
- **Request body**: `CreateRoasteryCommand`
  - `{ "name": string, "city": string }`
- **Response (201)**: `RoasteryDto`
- **Błędy**:
  - 400 `validation_failed`
  - 401 `unauthorized`
  - 409 `roastery_duplicate`
  - 500 `internal_error`
- **Uwagi implementacyjne (frontend)**:
  - Trimuj `name` i `city` przed wysłaniem.
  - Ustaw `Content-Type: application/json`.
  - Przekaż token: `Authorization: Bearer <access_token>` (z sesji Supabase).
  - Sukces: użyj `dto.id` do przekierowania na trasę frontendu `/roasteries/${dto.id}` (nie na `Location`, bo wskazuje `/api/...`).

2) **GET `/api/profiles/{userId}`** – sprawdzenie `display_name` (gate)
- **Response (200)**: `ProfileDto`
- **Błędy**:
  - 404 `profile_not_found` (traktować jak brak display_name → przekierowanie do ustawienia)
  - 500 `internal_error`
- **Uwagi**:
  - Jeśli `displayName === null` → przekieruj do `/account/display-name?returnTo=/roasteries/new`.

### Akcje frontendowe mapowane na API
- **Submit formularza** → `POST /api/roasteries` → `onSuccess` → redirect do `/roasteries/:id`.
- **Wejście na stronę** → sprawdzenie sesji i profilu → ewentualny redirect.

## 8. Interakcje użytkownika
- **Wpisanie nazwy palarni**:
  - UI pokazuje błąd, jeśli pole puste po `trim()` lub przekracza 64 znaki.
- **Wpisanie miasta**:
  - UI pokazuje błąd, jeśli pole puste po `trim()` lub przekracza 64 znaki.
- **Klik “Dodaj palarnię”**:
  - Jeśli walidacja UI nie przechodzi → brak requestu, pokaz błędów pól.
  - Jeśli walidacja przechodzi → stan loading + request.
  - Po sukcesie → przekierowanie do `/roasteries/:id`.
- **Brak `display_name`**:
  - Wejście na stronę powoduje przekierowanie do `/account/display-name` z `returnTo`.
- **Brak zalogowania**:
  - Wejście na stronę powoduje przekierowanie do `/login` (lub wyświetlenie informacji + linku).

## 9. Warunki i walidacja
Warunki wymagane przez API i sposób weryfikacji w UI:
- **Auth required (401)**:
  - Weryfikacja w UI: `useAuthSession()` musi zwrócić `accessToken`.
  - Zachowanie UI przy 401 z API: przekierowanie do `/login` lub wyświetlenie komunikatu “Sesja wygasła”.
- **Payload validation (400)**:
  - Weryfikacja w UI: walidacja pól `name`, `city` zgodna z `CreateRoasteryBodySchema`:
    - `trim()`, `min(1)`, `max(64)`.
  - Zachowanie UI przy 400: pokaz błędu ogólnego lub mapowanie na błędy pól (jeśli rozszerzymy API o szczegóły; w MVP wystarczy banner “Nieprawidłowe dane”).
- **Duplicate constraint (409 `roastery_duplicate`)**:
  - UI nie jest w stanie w 100% wykryć duplikatu (normalizacja i unikalność w DB).
  - Zachowanie UI przy 409: komunikat “Taka palarnia już istnieje (nazwa + miasto)”.
- **MVP: brak edycji/usuwania**:
  - UI: wyświetlić stałą informację (tekst w widoku).

## 10. Obsługa błędów
Scenariusze i rekomendowane zachowanie:
- **Network error / timeout**:
  - Ustawić `errors.form = 'Nie udało się połączyć z serwerem. Spróbuj ponownie.'`
  - Pozwolić ponowić submit.
- **401 `unauthorized`**:
  - Przekierowanie do `/login?returnTo=/roasteries/new` (jeśli wspierane) albo link do logowania.
- **409 `roastery_duplicate`**:
  - Pokazać komunikat w bannerze (nie jako błąd pola).
- **500 `internal_error`**:
  - Pokazać ogólny komunikat “Wystąpił błąd serwera”.
- **Brak profilu (404 `profile_not_found`)** w gate:
  - Traktować jako brak `display_name` i przekierować do ustawienia (profil może zostać utworzony przy ustawieniu nazwy).

## 11. Kroki implementacji
1. **Utwórz route Astro**:
   - Dodaj `src/pages/roasteries/new.astro`.
   - Osadź `Layout` i komponent React `CreateRoasteryPage` (np. `client:load`).
2. **Dodaj komponent kontenera**:
   - Utwórz `src/components/roasteries/CreateRoasteryPage.tsx`.
   - Dodaj nagłówek, opis MVP i mount formularza.
3. **Zaimplementuj gate auth + display_name**:
   - Utwórz `src/components/auth/useAuthSession.ts` (lub lokalnie w widoku).
   - Utwórz `src/components/auth/useDisplayNameGate.ts` (lub `DisplayNameGate.tsx`).
   - Logika:
     - brak sesji → redirect do `/login`
     - brak `display_name` → redirect do `/account/display-name?returnTo=/roasteries/new`
4. **Zaimplementuj formularz**:
   - Utwórz `src/components/roasteries/CreateRoasteryForm.tsx`.
   - Dodaj pola `name`, `city`, walidację UI (trim, required, max 64), stan `isSubmitting`.
   - Użyj `Button` z `src/components/ui/button.tsx` (jeśli pasuje stylistycznie).
5. **Dodaj warstwę wywołania API (opcjonalnie jako helper)**:
   - Opcja A: inline w `CreateRoasteryForm`.
   - Opcja B: `src/lib/api/roasteries.ts` z funkcją `createRoastery(command, accessToken): Promise<RoasteryDto>`.
6. **Obsłuż przekierowanie po sukcesie**:
   - Po 201: `window.location.assign(`/roasteries/${dto.id}`)`.
7. **Dodaj obsługę błędów**:
   - Mapuj statusy 400/401/409/500 na `errors.form` i ewentualne redirecty.
8. **Sprawdź UX i dostępność formularza**:
   - `label` powiązane z `input`.
   - `aria-invalid` i `aria-describedby` dla błędów pól.
   - Focus na pierwsze pole z błędem po submit.
9. **Smoke-test manualny**:
   - Brak loginu → redirect / komunikat.
   - Brak `display_name` → redirect do ustawienia.
   - Sukces → redirect do `/roasteries/:id`.
   - Duplikat → komunikat o duplikacie, brak przekierowania.
   - Puste pola / za długie → walidacja UI bez requestu.

