# Plan implementacji widoku Dodanie kawy (z widoku palarni)

## 1. Przegląd

Widok dodawania kawy umożliwia zalogowanym użytkownikom utworzenie nowej kawy w kontekście wybranej palarni. Formularz wymaga wyłącznie nazwy kawy - palarnia jest automatycznie określona na podstawie kontekstu (parametru URL). Widok implementuje "gate" `display_name`, który wymaga ustawienia publicznej nazwy użytkownika przed wykonaniem akcji. Po pomyślnym utworzeniu kawy następuje przekierowanie do szczegółów nowo utworzonej kawy.

## 2. Routing widoku

- **Ścieżka**: `/roasteries/[id]/coffees/new`
- **Parametry URL**:
  - `id` (UUID) - identyfikator palarni, do której dodawana jest kawa
- **Query params**: Brak

## 3. Struktura komponentów

```
/roasteries/[id]/coffees/new.astro (Astro Page)
└── CreateCoffeePage (React, client:load)
    ├── LoadingState (podczas sprawdzania display_name gate)
    ├── ErrorState (gdy gate zablokowany)
    └── ContentSection (gdy gate przepuszczony)
        └── Card
            ├── CardHeader
            │   ├── CardTitle "Dodaj kawę"
            │   └── CardDescription
            ├── CardContent
            │   ├── RoasteryContext (informacja o palarni)
            │   ├── Alert (informacja o MVP - brak edycji/usuwania)
            │   └── CreateCoffeeForm
            │       ├── Input (nazwa kawy)
            │       ├── Komunikaty walidacji
            │       ├── Alert błędu formularza
            │       └── Button "Dodaj kawę"
            └── CardFooter (opcjonalnie - link powrotu)
```

## 4. Szczegóły komponentów

### 4.1 CreateCoffeePage

- **Opis**: Główny komponent-kontener strony. Zarządza logiką `display_name gate`, pobiera dane palarni dla kontekstu i renderuje formularz lub odpowiednie stany.
- **Główne elementy**:
  - `<div>` kontener z klasami `container mx-auto max-w-2xl px-4 py-8`
  - Warunkowe renderowanie: LoadingState, ErrorState, lub Card z formularzem
- **Obsługiwane interakcje**:
  - Automatyczne przekierowanie do logowania (gdy niezalogowany)
  - Automatyczne przekierowanie do ustawienia display_name (gdy brak)
  - Obsługa sukcesu formularza (przekierowanie do kawy)
- **Obsługiwana walidacja**:
  - Sprawdzenie czy użytkownik jest zalogowany (via useDisplayNameGate)
  - Sprawdzenie czy display_name jest ustawiony
  - Walidacja parametru roasteryId (UUID)
- **Typy**: `RoasteryContextVM`, `GateDecision`
- **Propsy**:
  ```typescript
  type CreateCoffeePageProps = {
    roasteryId: string
  }
  ```

### 4.2 RoasteryContext

- **Opis**: Sekcja wyświetlająca informację o palarni, do której dodawana jest kawa. Służy jako kontekst wizualny dla użytkownika.
- **Główne elementy**:
  - `<div>` z tłem `bg-muted` i padding
  - `<p>` z etykietą "Palarnia:"
  - `<p>` z nazwą i miastem palarni (font-medium)
- **Obsługiwane interakcje**: Brak
- **Obsługiwana walidacja**: Brak
- **Typy**: `RoasteryContextVM`
- **Propsy**:
  ```typescript
  type RoasteryContextProps = {
    roastery: RoasteryContextVM
  }
  ```

### 4.3 CreateCoffeeForm

- **Opis**: Formularz tworzenia nowej kawy. Obsługuje walidację, wysyłkę do API i wyświetlanie błędów.
- **Główne elementy**:
  - `<form>` z `noValidate` i `onSubmit`
  - Alert błędu formularza (warunkowo)
  - Pole nazwy kawy:
    - `<Label>` z gwiazdką wymagalności
    - `<Input>` z atrybutami dostępności
    - `<p>` komunikat błędu walidacji (warunkowo)
  - `<Button>` submit z loading state
- **Obsługiwane interakcje**:
  - `onChange` na Input - aktualizacja wartości, walidacja przy touched
  - `onBlur` na Input - oznaczenie jako touched, walidacja
  - `onSubmit` na form - pełna walidacja, wysyłka do API
- **Obsługiwana walidacja**:
  - Pole `name`: wymagane, niepuste po trim, max 128 znaków
- **Typy**: `CreateCoffeeFormState`, `CreateCoffeeFormErrors`, `CoffeeDto`
- **Propsy**:
  ```typescript
  type CreateCoffeeFormProps = {
    roasteryId: string
    accessToken: string
    onSuccess: (created: CoffeeDto) => void
  }
  ```

### 4.4 LoadingState

- **Opis**: Stan ładowania wyświetlany podczas sprawdzania gate lub pobierania danych palarni.
- **Główne elementy**:
  - `<div>` wycentrowany z flex
  - `<Loader2>` ikona z animacją spin
  - `<p>` tekst "Sprawdzanie dostępu..." lub "Ładowanie..."
- **Obsługiwane interakcje**: Brak
- **Obsługiwana walidacja**: Brak
- **Typy**: Brak
- **Propsy**:
  ```typescript
  type LoadingStateProps = {
    message?: string
  }
  ```

### 4.5 ErrorState

- **Opis**: Stan błędu wyświetlany gdy gate jest zablokowany lub wystąpił błąd.
- **Główne elementy**:
  - `<Alert>` variant="destructive"
  - `<AlertDescription>` z komunikatem błędu
  - Opcjonalnie link powrotu do palarni
- **Obsługiwane interakcje**: Kliknięcie linku powrotu
- **Obsługiwana walidacja**: Brak
- **Typy**: `string` (reason)
- **Propsy**:
  ```typescript
  type ErrorStateProps = {
    message: string
    roasteryId?: string
  }
  ```

## 5. Typy

### 5.1 Typy DTO (z API)

```typescript
// Już zdefiniowane w src/types.ts
type RoasteryDto = {
  id: string
  name: string
  city: string
  createdAt: string
}

type CoffeeDto = {
  id: string
  roasteryId: string
  name: string
  avgMain: number | null
  ratingsCount: number
  smallSample: boolean
  createdAt: string
}

type CreateCoffeeCommand = {
  name: string
}
```

### 5.2 Typy ViewModel (dla komponentów)

```typescript
// ViewModel kontekstu palarni (uproszczony do wyświetlania)
type RoasteryContextVM = {
  id: string
  name: string
  city: string
}

// Stan formularza
type CreateCoffeeFormState = {
  name: string
}

// Błędy formularza
type CreateCoffeeFormErrors = {
  name?: string
  form?: string
}

// Stan touched dla pól
type CreateCoffeeFormTouched = {
  name: boolean
}
```

### 5.3 Funkcje mapujące

```typescript
function mapRoasteryDtoToContextVM(dto: RoasteryDto): RoasteryContextVM {
  return {
    id: dto.id,
    name: dto.name,
    city: dto.city,
  }
}
```

### 5.4 Stałe walidacji

```typescript
const COFFEE_NAME_MAX_LENGTH = 128

const VALIDATION_MESSAGES = {
  NAME_REQUIRED: 'Nazwa kawy jest wymagana',
  NAME_TOO_LONG: `Nazwa kawy może mieć maksymalnie ${COFFEE_NAME_MAX_LENGTH} znaków`,
}
```

## 6. Zarządzanie stanem

### 6.1 Hook useDisplayNameGate (istniejący)

Wykorzystanie istniejącego hooka z `src/components/auth/useDisplayNameGate.ts`.

```typescript
const { 
  accessToken, 
  isAllowed, 
  isChecking, 
  isRedirecting, 
  isBlocked, 
  gate 
} = useDisplayNameGate({
  returnTo: `/roasteries/${roasteryId}/coffees/new`,
})
```

### 6.2 Hook useRoasteryContext

Pobiera podstawowe dane palarni dla kontekstu wizualnego.

```typescript
type UseRoasteryContextResult = {
  roastery: RoasteryContextVM | null
  isLoading: boolean
  error: string | null
}

function useRoasteryContext(roasteryId: string): UseRoasteryContextResult
```

**Implementacja**:
- `useState` dla `roastery`, `isLoading`, `error`
- `useEffect` z fetch do `/api/roasteries/{roasteryId}`
- Mapowanie DTO na ViewModel

### 6.3 Stan formularza (w CreateCoffeeForm)

```typescript
// Wartości formularza
const [values, setValues] = useState<CreateCoffeeFormState>({ name: '' })

// Błędy walidacji
const [errors, setErrors] = useState<CreateCoffeeFormErrors>({})

// Stan touched
const [touched, setTouched] = useState<CreateCoffeeFormTouched>({ name: false })

// Stan wysyłania
const [isSubmitting, setIsSubmitting] = useState(false)
```

## 7. Integracja API

### 7.1 GET /api/roasteries/{id} (dla kontekstu)

**Żądanie**:
- Metoda: GET
- Path params: `id` (UUID)
- Headers: Brak (endpoint publiczny)

**Odpowiedź 200**:
```typescript
type RoasteryDto = {
  id: string
  name: string
  city: string
  createdAt: string
}
```

**Błędy**:
- 404: roastery_not_found

### 7.2 POST /api/roasteries/{id}/coffees

**Żądanie**:
- Metoda: POST
- Path params: `id` (UUID)
- Headers:
  - `Content-Type: application/json`
  - `Authorization: Bearer {accessToken}`
- Body:
  ```typescript
  type CreateCoffeeCommand = {
    name: string
  }
  ```

**Odpowiedź 201**:
```typescript
type CoffeeDto = {
  id: string
  roasteryId: string
  name: string
  avgMain: null
  ratingsCount: 0
  smallSample: boolean
  createdAt: string
}
```

**Błędy**:
- 400: validation_failed (wymagane pole `name`)
- 401: unauthorized (brak lub nieprawidłowy token)
- 404: roastery_not_found
- 409: coffee_duplicate (kawa o takiej nazwie już istnieje w palarni)

## 8. Interakcje użytkownika

| Interakcja | Komponent | Rezultat |
|------------|-----------|----------|
| Wejście na stronę (niezalogowany) | CreateCoffeePage | Przekierowanie do `/login?returnTo=...` |
| Wejście na stronę (bez display_name) | CreateCoffeePage | Przekierowanie do `/account/display-name?returnTo=...` |
| Wejście na stronę (z display_name) | CreateCoffeePage | Wyświetlenie formularza |
| Wpisanie tekstu w pole nazwy | CreateCoffeeForm | Aktualizacja wartości, walidacja jeśli touched |
| Opuszczenie pola nazwy (blur) | CreateCoffeeForm | Oznaczenie jako touched, wyświetlenie błędu jeśli nieprawidłowe |
| Kliknięcie "Dodaj kawę" | CreateCoffeeForm | Walidacja wszystkich pól, wysłanie do API |
| Sukces utworzenia | CreateCoffeePage | Przekierowanie do `/coffees/{coffeeId}` |
| Błąd duplikatu (409) | CreateCoffeeForm | Wyświetlenie komunikatu o istniejącej kawie |
| Błąd walidacji API (400) | CreateCoffeeForm | Wyświetlenie komunikatu o nieprawidłowych danych |

## 9. Warunki i walidacja

### 9.1 Gate display_name

- **Warunek**: Użytkownik musi być zalogowany i mieć ustawiony `display_name`
- **Komponent**: CreateCoffeePage (via useDisplayNameGate)
- **Wpływ**:
  - Niezalogowany → przekierowanie do `/login?returnTo=...`
  - Brak display_name → przekierowanie do `/account/display-name?returnTo=...`
  - Błąd sprawdzania → wyświetlenie ErrorState

### 9.2 Walidacja parametru roasteryId

- **Warunek**: `roasteryId` musi być poprawnym UUID
- **Komponent**: Strona Astro
- **Wpływ**: Nieprawidłowy UUID → strona 404

### 9.3 Walidacja pola nazwy kawy

- **Warunki**:
  - Wymagane (niepuste po trim)
  - Maksymalna długość: 128 znaków
- **Komponent**: CreateCoffeeForm
- **Wpływ**:
  - Puste → komunikat "Nazwa kawy jest wymagana"
  - Za długie → komunikat "Nazwa kawy może mieć maksymalnie 128 znaków"
  - Błąd blokuje wysłanie formularza

### 9.4 Walidacja istnienia palarni

- **Warunek**: Palarnia o podanym ID musi istnieć
- **Komponent**: CreateCoffeePage (via useRoasteryContext)
- **Wpływ**: Brak palarni → wyświetlenie ErrorState z komunikatem

## 10. Obsługa błędów

| Scenariusz | Kod HTTP | Komunikat użytkownika | Akcja |
|------------|----------|----------------------|-------|
| Niezalogowany | - | - | Przekierowanie do logowania |
| Brak display_name | - | - | Przekierowanie do ustawienia nazwy |
| Błąd sprawdzania gate | - | "Wystąpił błąd podczas sprawdzania dostępu. Odśwież stronę i spróbuj ponownie." | ErrorState |
| Palarnia nie istnieje | 404 | "Palarnia nie została znaleziona" | ErrorState z linkiem do listy palarni |
| Puste pole nazwy | - | "Nazwa kawy jest wymagana" | Komunikat pod polem, focus na pole |
| Za długa nazwa | - | "Nazwa kawy może mieć maksymalnie 128 znaków" | Komunikat pod polem |
| Kawa już istnieje | 409 | "Kawa o takiej nazwie już istnieje w tej palarni" | Alert w formularzu |
| Błąd walidacji API | 400 | "Nieprawidłowe dane. Sprawdź wprowadzone wartości." | Alert w formularzu |
| Sesja wygasła | 401 | "Sesja wygasła. Zaloguj się ponownie." | Alert + przekierowanie do logowania |
| Błąd serwera | 500 | "Wystąpił błąd serwera. Spróbuj ponownie później." | Alert w formularzu |
| Błąd sieci | - | "Nie udało się połączyć z serwerem. Sprawdź połączenie i spróbuj ponownie." | Alert w formularzu |

## 11. Kroki implementacji

1. **Utworzenie strony Astro** (`src/pages/roasteries/[id]/coffees/new.astro`)
   - Utworzenie struktury katalogów jeśli nie istnieje
   - Konfiguracja `export const prerender = false`
   - Walidacja parametru `id` (UUID)
   - Import Layout i CreateCoffeePage
   - Przekazanie `roasteryId` do komponentu React

2. **Utworzenie katalogu i plików komponentów** (`src/components/roasteries/coffee/`)
   - Utworzenie katalogu `src/components/roasteries/coffee/`
   - Utworzenie pliku `CreateCoffeePage.tsx`
   - Utworzenie pliku `CreateCoffeeForm.tsx`

3. **Implementacja hooka useRoasteryContext**
   - Możliwość umieszczenia w `CreateCoffeePage.tsx` lub osobnym pliku
   - Fetch danych palarni
   - Obsługa stanów loading/error/success
   - Mapowanie na ViewModel

4. **Implementacja CreateCoffeeForm**
   - Stan formularza (values, errors, touched, isSubmitting)
   - Funkcja walidacji pola nazwy
   - Handlery onChange, onBlur, onSubmit
   - Wywołanie API POST
   - Obsługa odpowiedzi sukcesu i błędów
   - Renderowanie formularza z shadcn/ui

5. **Implementacja RoasteryContext**
   - Prosty komponent wyświetlający kontekst palarni
   - Styling z bg-muted

6. **Implementacja CreateCoffeePage**
   - Integracja useDisplayNameGate
   - Integracja useRoasteryContext
   - Callback handleSuccess z przekierowaniem
   - Warunkowe renderowanie stanów
   - Alert informacyjny o MVP

7. **Obsługa błędów i edge cases**
   - Walidacja UUID w Astro page
   - Obsługa wszystkich kodów błędów API
   - Komunikaty błędów w języku polskim

8. **Styling i UX**
   - Spójność z istniejącymi formularzami (CreateRoasteryForm)
   - Loading states z Loader2
   - Proper focus management
   - Atrybuty dostępności (aria-*)

9. **Testowanie**
   - Test ścieżki szczęśliwej (utworzenie kawy)
   - Test walidacji formularza
   - Test obsługi duplikatu (409)
   - Test przekierowań gate
   - Test obsługi błędów sieciowych

10. **Sprawdzenie linterów i poprawa błędów**
    - Uruchomienie `ReadLints` po zakończeniu implementacji
    - Naprawa ewentualnych błędów TypeScript/ESLint

11. **Integracja z widokiem palarni**
    - Upewnienie się, że przycisk "Dodaj kawę" w RoasteryDetailView kieruje do tego widoku
    - Weryfikacja że po utworzeniu kawy użytkownik może wrócić do palarni
