# Plan implementacji widoku Ocenianie kawy (formularz)

## 1. Przegląd

Widok formularza oceniania kawy umożliwia zalogowanym użytkownikom wystawienie lub edycję oceny kawy. Realizuje historyjki użytkownika US-010 (Wystawienie oceny kawy) i US-011 (Edycja własnej oceny).

Formularz zawiera 4 wymagane metryki: główna ocena kawy, moc, kwasowość i posmak - wszystkie w skali 1-5 z krokiem 0.5. Widok wymaga zalogowania oraz posiadania ustawionego `display_name`.

## 2. Routing widoku

**Ścieżka**: `/coffees/:id/rate`

**Plik Astro**: `src/pages/coffees/[id]/rate.astro`

**Parametry ścieżki**:
- `id` - UUID kawy

**Przykład URL**: `/coffees/550e8400-e29b-41d4-a716-446655440000/rate`

**Wymagania dostępu**:
- Użytkownik musi być zalogowany
- Użytkownik musi mieć ustawiony `display_name`

## 3. Struktura komponentów

```
src/
├── pages/
│   └── coffees/
│       └── [id]/
│           └── rate.astro                 # Strona formularza oceny
└── components/
    └── coffees/
        ├── RateCoffeePage.tsx             # Strona-wrapper dla formularza
        ├── RateCoffeeForm.tsx             # Formularz oceniania kawy
        └── shared/
            └── RatingSlider.tsx           # Kontrolka oceny (1-5, krok 0.5)
```

### Drzewo komponentów

```
RateCoffeePage
├── BackLink ("← Powrót do szczegółów kawy")
├── CoffeeInfoHeader
│   └── Nazwa kawy (z linkiem do szczegółów)
├── ErrorBanner (warunkowo - przy błędzie ładowania)
├── LoadingState (warunkowo - podczas ładowania)
└── RateCoffeeForm
    ├── FormErrorBanner (warunkowo - błąd API)
    ├── RatingSlider (main - "Ocena kawy")
    ├── RatingSlider (strength - "Moc")
    ├── RatingSlider (acidity - "Kwasowość")
    ├── RatingSlider (aftertaste - "Posmak")
    └── SubmitButton ("Zapisz ocenę")
```

## 4. Szczegóły komponentów

### 4.1 RateCoffeePage

- **Opis**: Strona-wrapper dla formularza oceny kawy. Obsługuje autoryzację, pobieranie danych kawy i istniejącej oceny, oraz przekierowania.
- **Główne elementy**:
  - Link powrotu do szczegółów kawy
  - Nagłówek z nazwą kawy
  - Komponent formularza RateCoffeeForm
- **Obsługiwane interakcje**:
  - Sukces zapisu → przekierowanie do `/coffees/{id}`
  - Brak autoryzacji → przekierowanie do `/login`
  - Brak display_name → przekierowanie do `/account/display-name`
  - Kliknięcie "Powrót" → nawigacja do `/coffees/{id}`
- **Obsługiwana walidacja**: Sprawdzenie sesji i display_name przed renderowaniem formularza
- **Typy**:
  - `RateCoffeePageProps`
  - `CoffeeDetailDto` - dane kawy do nagłówka
  - `MyRatingDto` - istniejąca ocena (jeśli jest)
- **Propsy**:
  ```typescript
  type RateCoffeePageProps = {
    coffeeId: string
    accessToken: string
  }
  ```

### 4.2 RateCoffeeForm

- **Opis**: Formularz oceny kawy z 4 metrykami. Obsługuje zarówno tworzenie nowej oceny jak i edycję istniejącej (upsert).
- **Główne elementy**:
  - 4 kontrolki RatingSlider dla: main, strength, acidity, aftertaste
  - Etykiety opisowe dla każdej metryki
  - Przycisk "Zapisz ocenę"
  - Banner błędu formularza/API (warunkowo)
- **Obsługiwane interakcje**:
  - Zmiana wartości slidera dla każdej metryki
  - Submit formularza → PUT /api/coffees/{id}/my-rating
- **Obsługiwana walidacja**:
  - Wszystkie pola wymagane
  - Wartości w zakresie 1.0-5.0
  - Krok 0.5
  - Walidacja przed wysłaniem
- **Typy**:
  - `RateCoffeeFormState` - stan formularza
  - `RateCoffeeFormErrors` - błędy walidacji
  - `UpsertRatingCommand` - payload do API
  - `MyRatingDto` - odpowiedź API
- **Propsy**:
  ```typescript
  type RateCoffeeFormProps = {
    coffeeId: string
    coffeeName: string
    accessToken: string
    existingRating: MyRatingDto | null
    onSuccess: (rating: MyRatingDto) => void
  }
  ```

### 4.3 RatingSlider

- **Opis**: Kontrolka oceny wspierająca wartości 1-5 z krokiem 0.5. Wykorzystuje natywny input range z wizualną prezentacją wartości.
- **Główne elementy**:
  - Label z nazwą metryki i gwiazdką wymagalności
  - Input type="range" (min=1, max=5, step=0.5)
  - Wyświetlanie aktualnej wartości (np. "3.5")
  - Wizualne znaczniki wartości (1, 2, 3, 4, 5)
  - Opis pomocniczy (opcjonalnie)
- **Obsługiwane interakcje**:
  - Przesuwanie slidera myszką
  - Klawiatura (strzałki lewo/prawo, Home/End)
  - Kliknięcie na znacznik wartości
- **Obsługiwana walidacja**: Wbudowana w atrybuty input (min, max, step)
- **Typy**: `RatingScore`
- **Propsy**:
  ```typescript
  type RatingSliderProps = {
    label: string
    name: string
    value: RatingScore
    onChange: (value: RatingScore) => void
    disabled?: boolean
    error?: string
    description?: string
  }
  ```

### 4.4 CoffeeInfoHeader

- **Opis**: Nagłówek z informacjami o ocenianej kawie.
- **Główne elementy**:
  - Tytuł "Oceń kawę"
  - Nazwa kawy (link do szczegółów)
- **Obsługiwane interakcje**:
  - Kliknięcie nazwy kawy → nawigacja do `/coffees/{id}`
- **Obsługiwana walidacja**: Brak
- **Typy**: `{ coffeeName: string, coffeeId: string }`
- **Propsy**:
  ```typescript
  type CoffeeInfoHeaderProps = {
    coffeeName: string
    coffeeId: string
  }
  ```

## 5. Typy

### 5.1 Typy DTO (z API)

```typescript
// Istniejące w src/types.ts
type RatingScore = 1 | 1.5 | 2 | 2.5 | 3 | 3.5 | 4 | 4.5 | 5

type UpsertRatingCommand = {
  main: RatingScore
  strength: RatingScore
  acidity: RatingScore
  aftertaste: RatingScore
}

type MyRatingDto = {
  id: string                    // UUID oceny
  coffeeId: string              // UUID kawy
  userId: string                // UUID użytkownika
  main: RatingScore
  strength: RatingScore
  acidity: RatingScore
  aftertaste: RatingScore
  createdAt: string             // ISO-8601
  updatedAt: string             // ISO-8601
}

type CoffeeDetailDto = {
  id: string
  roasteryId: string
  name: string
  avgMain: number | null
  ratingsCount: number
  smallSample: boolean
  createdAt: string
}
```

### 5.2 Typy ViewModel (nowe)

```typescript
// Stan formularza
type RateCoffeeFormState = {
  main: RatingScore
  strength: RatingScore
  acidity: RatingScore
  aftertaste: RatingScore
}

// Błędy walidacji formularza
type RateCoffeeFormErrors = {
  main?: string
  strength?: string
  acidity?: string
  aftertaste?: string
  form?: string                 // Błąd ogólny formularza/API
}

// Stan touched dla pól formularza
type RateCoffeeFormTouched = {
  main: boolean
  strength: boolean
  acidity: boolean
  aftertaste: boolean
}

// Stan błędu API
type ApiErrorState = {
  code: string
  message: string
}

// Domyślne wartości formularza
const DEFAULT_RATING: RatingScore = 3
const DEFAULT_FORM_STATE: RateCoffeeFormState = {
  main: DEFAULT_RATING,
  strength: DEFAULT_RATING,
  acidity: DEFAULT_RATING,
  aftertaste: DEFAULT_RATING,
}
```

## 6. Zarządzanie stanem

### 6.1 Custom Hook: useMyRating

```typescript
type UseMyRatingResult = {
  data: MyRatingDto | null
  isLoading: boolean
  error: ApiErrorState | null
  notFound: boolean             // true gdy 204 No Content
}

function useMyRating(coffeeId: string, accessToken: string): UseMyRatingResult
```

**Odpowiedzialności**:
- Pobieranie danych z `GET /api/coffees/{id}/my-rating`
- Rozróżnienie 204 (brak oceny) od 200 (ocena istnieje)
- Zwracanie danych do prefill formularza przy edycji

### 6.2 Custom Hook: useCoffeeBasicInfo

```typescript
type UseCoffeeBasicInfoResult = {
  data: { id: string; name: string } | null
  isLoading: boolean
  error: ApiErrorState | null
}

function useCoffeeBasicInfo(coffeeId: string): UseCoffeeBasicInfoResult
```

**Odpowiedzialności**:
- Pobieranie podstawowych danych kawy z `GET /api/coffees/{id}`
- Dostarczenie nazwy kawy do nagłówka

### 6.3 Stan formularza (RateCoffeeForm)

Zarządzany lokalnie w komponencie za pomocą `useState`:

```typescript
const [values, setValues] = useState<RateCoffeeFormState>(
  existingRating 
    ? {
        main: existingRating.main,
        strength: existingRating.strength,
        acidity: existingRating.acidity,
        aftertaste: existingRating.aftertaste,
      }
    : DEFAULT_FORM_STATE
)
const [errors, setErrors] = useState<RateCoffeeFormErrors>({})
const [isSubmitting, setIsSubmitting] = useState(false)
```

## 7. Integracja API

### 7.1 GET /api/coffees/{id}/my-rating

**Żądanie**:
```
GET /api/coffees/{id}/my-rating
Authorization: Bearer {accessToken}
```

**Odpowiedź**:
- 200: `MyRatingDto` - ocena istnieje, użyj do prefill
- 204: No Content - brak oceny użytkownika, formularz pusty

**Błędy**:
- 400: `validation_failed` - nieprawidłowy UUID
- 401: `unauthorized` - brak lub nieprawidłowy token
- 404: `coffee_not_found` - kawa nie istnieje

### 7.2 PUT /api/coffees/{id}/my-rating

**Żądanie**:
```
PUT /api/coffees/{id}/my-rating
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "main": 4.5,
  "strength": 3.0,
  "acidity": 2.5,
  "aftertaste": 4.0
}
```

**Odpowiedź**:
- 200: `MyRatingDto` - ocena zaktualizowana (edycja)
- 201: `MyRatingDto` - ocena utworzona (nowa)

**Błędy**:
- 400: `validation_failed` - nieprawidłowy payload (wartości poza zakresem, nieprawidłowy krok)
- 401: `unauthorized` - brak lub nieprawidłowy token
- 404: `coffee_not_found` - kawa nie istnieje

### 7.3 Budowanie payloadu

```typescript
function buildUpsertCommand(values: RateCoffeeFormState): UpsertRatingCommand {
  return {
    main: values.main,
    strength: values.strength,
    acidity: values.acidity,
    aftertaste: values.aftertaste,
  }
}
```

## 8. Interakcje użytkownika

| Akcja | Oczekiwany rezultat |
|-------|---------------------|
| Wejście na `/coffees/{id}/rate` (niezalogowany) | Przekierowanie do `/login?returnTo=/coffees/{id}/rate` |
| Wejście na `/coffees/{id}/rate` (bez display_name) | Przekierowanie do `/account/display-name?returnTo=/coffees/{id}/rate` |
| Wejście na `/coffees/{id}/rate` (bez oceny) | Formularz z wartościami domyślnymi (3.0) |
| Wejście na `/coffees/{id}/rate` (z istniejącą oceną) | Prefill formularza danymi z API |
| Przesuwanie slidera | Aktualizacja wartości i wizualna zmiana |
| Użycie klawiatury (strzałki) na sliderze | Zmiana wartości o 0.5 |
| Submit z poprawnymi danymi | Zapis, przekierowanie do `/coffees/{id}` |
| Submit z błędem API | Wyświetlenie bannera z błędem |
| Kliknięcie "Powrót" | Nawigacja do `/coffees/{id}` |

## 9. Warunki i walidacja

### 9.1 Walidacja formularza

| Pole | Warunek | Komunikat błędu |
|------|---------|-----------------|
| main | Wymagane, 1.0-5.0, krok 0.5 | "Ocena kawy jest wymagana" |
| strength | Wymagane, 1.0-5.0, krok 0.5 | "Moc jest wymagana" |
| acidity | Wymagane, 1.0-5.0, krok 0.5 | "Kwasowość jest wymagana" |
| aftertaste | Wymagane, 1.0-5.0, krok 0.5 | "Posmak jest wymagany" |

**Dozwolone wartości RatingScore**:
```typescript
type RatingScore = 1 | 1.5 | 2 | 2.5 | 3 | 3.5 | 4 | 4.5 | 5
```

**Walidacja na poziomie RatingSlider**:
- Input type="range" z `min=1`, `max=5`, `step=0.5`
- Wartość domyślna: 3.0 (środek skali)
- Brak możliwości wpisania nieprawidłowej wartości (kontrolka slider)

**Funkcja walidacji**:
```typescript
function validateRatingValue(value: number): boolean {
  const validValues = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]
  return validValues.includes(value)
}

function validateForm(values: RateCoffeeFormState): RateCoffeeFormErrors {
  const errors: RateCoffeeFormErrors = {}
  
  if (!validateRatingValue(values.main)) {
    errors.main = 'Nieprawidłowa wartość oceny'
  }
  if (!validateRatingValue(values.strength)) {
    errors.strength = 'Nieprawidłowa wartość mocy'
  }
  if (!validateRatingValue(values.acidity)) {
    errors.acidity = 'Nieprawidłowa wartość kwasowości'
  }
  if (!validateRatingValue(values.aftertaste)) {
    errors.aftertaste = 'Nieprawidłowa wartość posmaku'
  }
  
  return errors
}
```

### 9.2 Warunki dostępu

| Warunek | Akcja przy niespełnieniu |
|---------|--------------------------|
| Zalogowany | Przekierowanie do `/login?returnTo=/coffees/{id}/rate` |
| Posiada display_name | Przekierowanie do `/account/display-name?returnTo=/coffees/{id}/rate` |
| Kawa istnieje | Wyświetlenie błędu 404 z linkiem do listy |

### 9.3 Etykiety metryk

| Pole | Etykieta polska | Opis pomocniczy |
|------|-----------------|-----------------|
| main | Ocena kawy | Główna ocena smaku i jakości kawy |
| strength | Moc | Intensywność i siła kawy |
| acidity | Kwasowość | Poziom kwasowości kawy |
| aftertaste | Posmak | Smak pozostający po wypiciu |

## 10. Obsługa błędów

### 10.1 Błędy sieciowe

| Scenariusz | Obsługa |
|------------|---------|
| Brak połączenia | Banner: "Problem z połączeniem. Sprawdź połączenie internetowe." |
| Timeout | Banner: "Serwer nie odpowiada. Spróbuj ponownie później." |

### 10.2 Błędy API

| Kod | Kontekst | Obsługa |
|-----|----------|---------|
| 400 | Pobieranie oceny | Banner: "Nieprawidłowy identyfikator kawy." |
| 400 | Zapis oceny | Banner: "Nieprawidłowe dane oceny. Sprawdź wprowadzone wartości." |
| 401 | Pobieranie/zapis | Banner: "Sesja wygasła. Zaloguj się ponownie." + przekierowanie do login po 2s |
| 404 | Pobieranie/zapis | Banner: "Kawa nie została znaleziona." + link do listy kaw |
| 500 | Wszystkie | Banner: "Wystąpił błąd serwera. Spróbuj ponownie później." |

### 10.3 Stany UI

| Stan | Prezentacja |
|------|-------------|
| Ładowanie danych | Spinner + tekst "Ładowanie..." |
| Zapisywanie | Przycisk disabled + spinner + tekst "Zapisywanie..." |
| Błąd ładowania | Alert destructive z komunikatem |
| Błąd zapisu | Alert destructive nad formularzem |
| Sukces zapisu | Przekierowanie do szczegółów kawy |

## 11. Kroki implementacji

1. **Utworzenie struktury katalogów**
   - Utworzenie `src/pages/coffees/[id]/rate.astro`
   - Utworzenie `src/components/coffees/RateCoffeePage.tsx`
   - Utworzenie `src/components/coffees/RateCoffeeForm.tsx`
   - Utworzenie `src/components/coffees/shared/RatingSlider.tsx`

2. **Implementacja RatingSlider**
   - Input type="range" z min=1, max=5, step=0.5
   - Wyświetlanie aktualnej wartości
   - Wizualne znaczniki (1-5)
   - Obsługa klawiatury (strzałki)
   - Stylowanie z Tailwind
   - Dostępność (ARIA labels)

3. **Implementacja custom hooka `useMyRating`**
   - Fetch z `/api/coffees/{id}/my-rating` z tokenem
   - Obsługa 204 (brak oceny) vs 200 (ocena istnieje)
   - Zwracanie danych do prefill

4. **Implementacja `RateCoffeeForm`**
   - 4 instancje `RatingSlider` z odpowiednimi etykietami
   - Stan formularza z useState
   - Walidacja przed submit
   - Obsługa PUT do API z tokenem
   - Komunikaty błędów

5. **Implementacja `RateCoffeePage`**
   - Pobieranie danych kawy (nazwa)
   - Pobieranie istniejącej oceny
   - Obsługa stanów ładowania
   - Przekazanie props do `RateCoffeeForm`
   - Obsługa sukcesu (redirect)

6. **Implementacja strony Astro `/coffees/[id]/rate`**
   - Server-side sprawdzenie sesji (middleware lub locals)
   - Przekierowanie przy braku sesji
   - Sprawdzenie display_name
   - Ekstrakcja `id` z params
   - Przekazanie accessToken do komponentu
   - Obsługa returnTo w URL

7. **Integracja**
   - Link powrotu do szczegółów kawy
   - Redirect po sukcesie zapisu
   - Obsługa returnTo po zalogowaniu

8. **Testowanie**
   - Sprawdzenie wszystkich wartości slidera (1, 1.5, 2, ... 5)
   - Sprawdzenie prefill przy edycji
   - Sprawdzenie walidacji
   - Sprawdzenie obsługi błędów API
   - Sprawdzenie przekierowań (login, display-name)
   - Sprawdzenie dostępności (klawiatura, ARIA)

### Uwagi implementacyjne

1. **Prefill formularza**: Jeśli użytkownik ma już ocenę (GET zwraca 200), formularz powinien być wypełniony istniejącymi wartościami. Jeśli nie ma oceny (204), użyj wartości domyślnych (3.0).

2. **Upsert**: API obsługuje upsert - zawsze używamy PUT, który tworzy nową ocenę (201) lub aktualizuje istniejącą (200).

3. **Token autoryzacji**: Token należy przekazać z Astro do komponentu React. Można użyć cookies (`sb-access-token`) lub przekazać przez props.

4. **Sesja i display_name**: Wykorzystać istniejące hooki `useAuthSession` oraz sprawdzenie w middleware Astro. Logika z `useDisplayNameGate` może być wykorzystana.

5. **RatingSlider UX**: 
   - Slider powinien mieć wyraźne znaczniki wartości
   - Aktualna wartość powinna być widoczna obok slidera
   - Rozważyć wariant z gwiazdkami zamiast slidera dla lepszego UX
