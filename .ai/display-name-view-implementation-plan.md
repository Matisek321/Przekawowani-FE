# Plan implementacji widoku Ustawienie display_name

## 1. Przegląd

Widok **Ustawienie display_name** umożliwia zalogowanemu użytkownikowi jednorazowe ustawienie publicznej nazwy wyświetlanej (`display_name`). Nazwa ta jest widoczna dla innych użytkowników w systemie i nie może być zmieniona po ustawieniu. Widok jest wywoływany automatycznie przez `useDisplayNameGate` gdy użytkownik próbuje wykonać akcję wymagającą ustawionego `display_name` (np. dodanie palarni).

Kluczowe wymagania biznesowe (PRD/US-003):
- Walidacja: unikalne globalnie, ≤ 32 znaki, alfanumeryczne + polskie diakrytyki; dozwolone separatory: spacja, „-", „.".
- Nazwa ustawiana jednokrotnie i nieedytowalna później.
- Błędny lub zajęty `display_name` powoduje czytelny komunikat błędu.

## 2. Routing widoku

- **Ścieżka**: `/account/display-name`
- **Plik routingu (Astro)**: `src/pages/account/display-name.astro`
- **Query params**: `?returnTo=/path` (opcjonalny URL do przekierowania po sukcesie)
- **Zachowanie routingu**:
  - Jeśli użytkownik nie jest zalogowany → middleware przekieruje do `/login?returnTo=/account/display-name`
  - Jeśli użytkownik ma już ustawiony `display_name` → przekierowanie do `/` lub `returnTo`
  - Po sukcesie → przekierowanie do `returnTo` lub `/`

## 3. Struktura komponentów

```text
src/pages/account/display-name.astro
└─ <Layout title="Ustaw nazwę wyświetlaną">
   └─ <SetDisplayNamePage client:load returnTo={returnTo}>
      ├─ <Card>
      │  ├─ <CardHeader>
      │  │  ├─ <CardTitle>
      │  │  └─ <CardDescription>
      │  └─ <CardContent>
      │     ├─ <Alert> (informacja o jednorazowości)
      │     └─ <SetDisplayNameForm onSuccess={...}>
      │        ├─ <Alert> (błędy formularza)
      │        ├─ <Field displayName>
      │        │  ├─ <Label>
      │        │  ├─ <Input>
      │        │  └─ <p> (błąd pola / licznik znaków)
      │        └─ <Button type="submit">
      └─ (opcjonalnie) stan ładowania / sprawdzania profilu
```

## 4. Szczegóły komponentów

### `display-name.astro` (strona routingu)

- **Opis**: Strona Astro wystawiająca route `/account/display-name`. Odpowiada za osadzenie layoutu i komponentu React.
- **Główne elementy**:
  - `<Layout title="Ustaw nazwę wyświetlaną">`
  - Odczyt `returnTo` z query params
  - Montowanie React: `<SetDisplayNamePage client:load returnTo={returnTo} />`
- **Obsługiwane zdarzenia**: brak (SSR/strona)
- **Walidacja**: brak bezpośredniej
- **Typy**: brak
- **Propsy**: brak

### `SetDisplayNamePage` (React; kontener widoku)

Proponowana lokalizacja: `src/components/account/SetDisplayNamePage.tsx`

- **Opis**: Kontener UI widoku. Sprawdza czy użytkownik ma już ustawiony `display_name` i odpowiednio przekierowuje lub renderuje formularz.
- **Główne elementy**:
  - `<Card>` z nagłówkiem i opisem
  - `<Alert>` z informacją o jednorazowości ustawienia
  - `<SetDisplayNameForm onSuccess={...} />`
- **Obsługiwane zdarzenia**:
  - Inicjalizacja (mount) → pobranie profilu użytkownika przez `useAuthSession`
  - `onSuccess()` → nawigacja do `returnTo` lub `/`
- **Walidacja**:
  - Sprawdzenie czy `displayName` już istnieje → przekierowanie
- **Typy**:
  - `SetDisplayNamePageProps`
- **Propsy**:
  - `returnTo?: string` (URL do przekierowania po sukcesie)

### `SetDisplayNameForm` (React; formularz)

Proponowana lokalizacja: `src/components/account/SetDisplayNameForm.tsx`

- **Opis**: Formularz ustawiania `display_name`. Mapuje input użytkownika na `SetDisplayNameCommand`, wykonuje walidację UI i wysyła `POST /api/profiles/me/display-name`.
- **Główne elementy HTML i komponenty dzieci**:
  - `<form>` z polem:
    - `<input name="displayName" ... />`
  - Etykieta `<Label>` i opis błędu powiązany z polem (`aria-describedby`)
  - Licznik znaków (X/32)
  - Przycisk submit (`Button` z `src/components/ui/button.tsx`)
  - Sekcja błędu ogólnego (np. dla 409)
- **Obsługiwane zdarzenia**:
  - `onChange` pola → aktualizacja stanu formularza + walidacja na bieżąco
  - `onBlur` pola → walidacja pola
  - `onSubmit` → walidacja całego formularza + wysyłka żądania
- **Warunki walidacji (zgodne z API `DisplayNameSchema`)**:
  - `displayName`:
    - `string`
    - `trim()`
    - `min(1)` → "Nazwa wyświetlana jest wymagana"
    - `max(32)` → "Maksymalnie 32 znaki"
    - `regex: ^[A-Za-z0-9ĄĆĘŁŃÓŚŹŻąćęłńóśźż .-]+$` → "Dozwolone są tylko litery, cyfry, spacje, myślniki i kropki"
  - Blokada submitu gdy `isSubmitting === true` lub walidacja nie przechodzi
- **Typy (DTO i ViewModel)**:
  - `SetDisplayNameCommand` (request)
  - `ProfileDto` (response)
  - `SetDisplayNameFormState`, `SetDisplayNameFormErrors` (ViewModel lokalny)
- **Propsy**:
  - `accessToken: string`
  - `onSuccess: (profile: ProfileDto) => void`

## 5. Typy

### DTO (istniejące; `src/types.ts`)

- **`SetDisplayNameCommand`**:
  - `displayName: string`

- **`ProfileDto`**:
  - `userId: string (uuid)`
  - `displayName: string | null`
  - `createdAt: string (ISO-8601)`

### ViewModel (nowe; frontend)

Rekomendowane jako typy lokalne w plikach komponentów.

- **`SetDisplayNameFormState`**
  - `displayName: string`

- **`SetDisplayNameFormErrors`**
  - `displayName?: string` – błąd walidacji pola
  - `form?: string` – błąd ogólny (np. 409/500/network)

- **`SetDisplayNamePageProps`**
  - `returnTo?: string`

## 6. Zarządzanie stanem

Zalecane podejście: **lokalny stan w React** (bez globalnego store).

Stan w `SetDisplayNameForm`:
- `value: string` (wartość pola displayName)
- `errors: SetDisplayNameFormErrors`
- `isSubmitting: boolean`
- `touched: boolean`

Stan w `SetDisplayNamePage`:
- `isCheckingProfile: boolean`
- `profileAlreadySet: boolean`

Custom hooki (używane):
- `useAuthSession()` - dostarcza `userId` i `accessToken` do wywołań API

## 7. Integracja API

### Wymagane wywołania API

**1) GET `/api/profiles/{userId}`** – sprawdzenie czy displayName jest już ustawiony

- **Response (200)**: `ProfileDto`
- **Błędy**:
  - 404 `profile_not_found` (traktować jako brak displayName)
- **Uwagi**:
  - Jeśli `displayName !== null` → przekierowanie (już ustawione)

**2) POST `/api/profiles/me/display-name`** – ustawienie displayName

- **Request body**: `SetDisplayNameCommand`
  - `{ "displayName": string }`
- **Response (200)**: `ProfileDto`
- **Błędy**:
  - 400 `validation_failed` - nieprawidłowy format
  - 401 `unauthorized` - brak autoryzacji
  - 409 `display_name_already_set` - już ustawiony
  - 409 `display_name_conflict` - nazwa zajęta
  - 500 `internal_error`
- **Uwagi implementacyjne (frontend)**:
  - Trimuj `displayName` przed wysłaniem
  - Ustaw `Content-Type: application/json`
  - Przekaż token: `Authorization: Bearer <access_token>`
  - Sukces: wywołaj `onSuccess(profileDto)` → przekierowanie

### Akcje frontendowe mapowane na API

- **Mount strony** → GET profilu → sprawdzenie czy displayName już istnieje
- **Submit formularza** → POST display-name → `onSuccess` → redirect

## 8. Interakcje użytkownika

- **Wpisanie nazwy wyświetlanej**:
  - UI pokazuje licznik znaków (X/32)
  - UI pokazuje błąd jeśli pole puste po `trim()`, przekracza 32 znaki lub zawiera niedozwolone znaki
- **Klik "Ustaw nazwę"**:
  - Jeśli walidacja UI nie przechodzi → brak requestu, pokazanie błędów pól
  - Jeśli walidacja przechodzi → stan loading + request
  - Po sukcesie → przekierowanie do `returnTo` lub `/`
- **Błąd 409 (nazwa zajęta)**:
  - Wyświetlenie komunikatu "Ta nazwa jest już zajęta. Wybierz inną."
- **Błąd 409 (już ustawiona)**:
  - Przekierowanie do `returnTo` lub `/` (lub komunikat i link)

## 9. Warunki i walidacja

Warunki wymagane przez API i sposób weryfikacji w UI:

| Warunek | Weryfikacja UI | Zachowanie UI przy błędzie |
|---------|---------------|---------------------------|
| Auth required (401) | `useAuthSession()` musi zwrócić `accessToken` | Przekierowanie do `/login` |
| Pole wymagane | `trim().length >= 1` | Błąd pola: "Nazwa wyświetlana jest wymagana" |
| Max 32 znaki | `trim().length <= 32` | Błąd pola: "Maksymalnie 32 znaki" |
| Dozwolone znaki | Regex `^[A-Za-z0-9ĄĆĘŁŃÓŚŹŻąćęłńóśźż .-]+$` | Błąd pola: "Dozwolone są tylko litery, cyfry, spacje, myślniki i kropki" |
| Unikalność (409 conflict) | Nie można zweryfikować w UI | Banner: "Ta nazwa jest już zajęta. Wybierz inną." |
| Już ustawiona (409 already_set) | Sprawdzenie profilu na mount | Przekierowanie lub banner |

## 10. Obsługa błędów

| Scenariusz | Zachowanie UI |
|------------|--------------|
| Network error / timeout | `errors.form = 'Nie udało się połączyć z serwerem. Spróbuj ponownie.'` |
| 401 `unauthorized` | Przekierowanie do `/login?returnTo=/account/display-name` |
| 400 `validation_failed` | Mapowanie na błąd pola lub banner ogólny |
| 409 `display_name_already_set` | Przekierowanie lub banner "Nazwa została już ustawiona" |
| 409 `display_name_conflict` | Banner "Ta nazwa jest już zajęta. Wybierz inną." |
| 500 `internal_error` | Banner "Wystąpił błąd serwera. Spróbuj ponownie później." |

## 11. Kroki implementacji

1. **Utwórz folder i stronę Astro**:
   - Dodaj `src/pages/account/display-name.astro`
   - Osadź `Layout` i komponent React `SetDisplayNamePage` (`client:load`)
   - Odczytaj `returnTo` z query params i przekaż do komponentu

2. **Dodaj komponent kontenera**:
   - Utwórz `src/components/account/SetDisplayNamePage.tsx`
   - Użyj `useAuthSession()` do pobrania `userId` i `accessToken`
   - Sprawdź profil użytkownika (GET `/api/profiles/{userId}`)
   - Jeśli `displayName` już ustawiony → przekierowanie
   - Renderuj `Card` z nagłówkiem, bannerem informacyjnym i formularzem

3. **Zaimplementuj formularz**:
   - Utwórz `src/components/account/SetDisplayNameForm.tsx`
   - Dodaj pole `displayName` z walidacją UI:
     - wymagane, max 32, regex dla dozwolonych znaków
   - Dodaj licznik znaków (X/32)
   - Użyj `Button` z `src/components/ui/button.tsx`

4. **Dodaj wywołanie API**:
   - POST `/api/profiles/me/display-name` z `Authorization: Bearer <token>`
   - Obsłuż odpowiedzi 200/400/401/409/500

5. **Obsłuż przekierowanie po sukcesie**:
   - Po 200: `window.location.assign(returnTo || '/')`

6. **Dodaj obsługę błędów**:
   - Mapuj statusy 400/401/409/500 na `errors.form` lub `errors.displayName`
   - Dla 401: przekierowanie do logowania
   - Dla 409 already_set: przekierowanie

7. **Sprawdź UX i dostępność formularza**:
   - `label` powiązane z `input`
   - `aria-invalid` i `aria-describedby` dla błędów pól
   - Focus na pole z błędem po submit
   - Informacja o jednorazowości ustawienia (banner Alert)

8. **Smoke-test manualny**:
   - Brak loginu → redirect do `/login`
   - Już ustawiony `displayName` → redirect
   - Sukces → redirect do `returnTo`
   - Nazwa zajęta → komunikat o konflikcie
   - Puste pole / za długie / złe znaki → walidacja UI bez requestu
