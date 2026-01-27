# Plan implementacji widoku Szczegóły palarni + lista kaw

## 1. Przegląd

Widok szczegółów palarni prezentuje informacje o wybranej palarni (nazwa, miasto) oraz listę jej kaw posortowaną malejąco po średniej ocenie (`avgMain`). Widok umożliwia paginację listy kaw oraz dodanie nowej kawy przez zalogowanych użytkowników posiadających ustawiony `display_name`. Jest to kluczowy widok w procesie odkrywania kaw, łączący katalog palarni z rankingiem jej produktów.

## 2. Routing widoku

- **Ścieżka**: `/roasteries/[id]`
- **Parametry URL**: 
  - `id` (UUID) - identyfikator palarni
- **Query params** (opcjonalne, dla paginacji):
  - `page` (domyślnie: 1)
  - `pageSize` (domyślnie: 30, max: 100)

## 3. Struktura komponentów

```
/roasteries/[id].astro (Astro Page)
└── RoasteryDetailView (React, client:load)
    ├── RoasteryHeader
    │   ├── Nagłówek z nazwą i miastem
    │   └── Button "Dodaj kawę" (warunkowo dla zalogowanych)
    ├── CoffeeList
    │   └── CoffeeCard[] (dla każdej kawy)
    │       ├── Nazwa kawy
    │       ├── RatingBadge (avgMain)
    │       ├── SmallSampleBadge (warunkowo)
    │       └── Licznik ocen
    ├── PaginationControls (gdy totalPages > 1)
    ├── LoadingState
    ├── EmptyState
    └── ErrorBanner
```

## 4. Szczegóły komponentów

### 4.1 RoasteryDetailView

- **Opis**: Główny komponent-kontener dla widoku szczegółów palarni. Zarządza stanem pobierania danych, obsługuje paginację oraz koordynuje wyświetlanie podkomponentów.
- **Główne elementy**:
  - `<div>` kontener z klasami `space-y-6`
  - Warunkowe renderowanie: `RoasteryHeader`, `CoffeeList`, `PaginationControls`, stanów ładowania/błędu/pustej listy
- **Obsługiwane interakcje**:
  - Zmiana strony (page) - aktualizacja URL i refetch
  - Zmiana rozmiaru strony (pageSize) - reset do page=1, aktualizacja URL i refetch
  - Obsługa nawigacji przeglądarki (back/forward) - popstate event
- **Obsługiwana walidacja**: 
  - Walidacja parametru `id` (musi być UUID)
  - Walidacja query params (page >= 1, pageSize 1-100)
- **Typy**: `RoasteryDetailVM`, `CoffeesListVM`, `RoasteryCoffeesQueryState`, `ApiErrorState`
- **Propsy**:
  ```typescript
  type RoasteryDetailViewProps = {
    roasteryId: string
    initialQuery: RoasteryCoffeesQueryState
  }
  ```

### 4.2 RoasteryHeader

- **Opis**: Sekcja nagłówkowa wyświetlająca informacje o palarni oraz przycisk dodawania kawy.
- **Główne elementy**:
  - `<div>` z flex layout dla wyrównania
  - `<h1>` z nazwą palarni
  - `<p>` z miastem (text-muted-foreground)
  - `<Button>` "Dodaj kawę" z ikoną Plus (warunkowo)
- **Obsługiwane interakcje**:
  - Kliknięcie "Dodaj kawę" - nawigacja do `/roasteries/{id}/coffees/new`
- **Obsługiwana walidacja**: Brak
- **Typy**: `RoasteryDetailVM`
- **Propsy**:
  ```typescript
  type RoasteryHeaderProps = {
    roastery: RoasteryDetailVM
    showAddCoffeeButton: boolean
  }
  ```

### 4.3 CoffeeList

- **Opis**: Siatka kart kaw należących do palarni.
- **Główne elementy**:
  - `<div>` z grid layout (gap-4, responsive columns)
  - Mapowanie tablicy `items` na komponenty `CoffeeCard`
- **Obsługiwane interakcje**: Brak (interakcje delegowane do CoffeeCard)
- **Obsługiwana walidacja**: Brak
- **Typy**: `CoffeeListItemVM[]`
- **Propsy**:
  ```typescript
  type CoffeeListProps = {
    items: CoffeeListItemVM[]
  }
  ```

### 4.4 CoffeeCard

- **Opis**: Karta pojedynczej kawy z informacjami o ocenie i linkiem do szczegółów.
- **Główne elementy**:
  - `<a>` wrapper z href do `/coffees/{id}`
  - `<Card>` z shadcn/ui
  - `<CardHeader>` z nazwą kawy
  - `<CardContent>` z:
    - RatingBadge (średnia ocena lub "Brak ocen")
    - Licznik ocen (`ratingsCount ocen`)
    - SmallSampleBadge (warunkowo, gdy `smallSample === true`)
- **Obsługiwane interakcje**:
  - Kliknięcie karty - nawigacja do szczegółów kawy
  - Hover - efekt scale i shadow
- **Obsługiwana walidacja**: Brak
- **Typy**: `CoffeeListItemVM`
- **Propsy**:
  ```typescript
  type CoffeeCardProps = {
    item: CoffeeListItemVM
  }
  ```

### 4.5 RatingBadge

- **Opis**: Badge wyświetlający średnią ocenę kawy.
- **Główne elementy**:
  - `<span>` z odpowiednim kolorem tła zależnym od wartości
  - Wartość numeryczna z jednym miejscem po przecinku lub "Brak ocen"
- **Obsługiwane interakcje**: Brak
- **Obsługiwana walidacja**: Brak
- **Typy**: `number | null`
- **Propsy**:
  ```typescript
  type RatingBadgeProps = {
    value: number | null
  }
  ```

### 4.6 SmallSampleBadge

- **Opis**: Badge informujący o małej próbie (mniej niż 3 oceny).
- **Główne elementy**:
  - `<span>` z ikoną informacyjną i tekstem "Mała próba"
  - Tooltip z wyjaśnieniem (opcjonalnie)
- **Obsługiwane interakcje**: Brak (opcjonalnie hover dla tooltip)
- **Obsługiwana walidacja**: Brak
- **Typy**: Brak
- **Propsy**: Brak

### 4.7 PaginationControls

- **Opis**: Kontrolki paginacji (można wykorzystać istniejący komponent z `RoasteriesListView`).
- **Główne elementy**: Zgodnie z istniejącą implementacją
- **Obsługiwane interakcje**:
  - Zmiana strony
  - Zmiana rozmiaru strony
- **Obsługiwana walidacja**: page >= 1, pageSize w zakresie
- **Typy**: `PaginationState`
- **Propsy**:
  ```typescript
  type PaginationControlsProps = {
    pagination: PaginationState
    onPageChange: (page: number) => void
    onPageSizeChange: (pageSize: number) => void
  }
  ```

### 4.8 LoadingState, EmptyState, ErrorBanner

- **Opis**: Komponenty stanów pomocniczych (wzorowane na `RoasteriesListView`).
- **LoadingState**: Spinner z tekstem "Ładowanie..."
- **EmptyState**: Ikona kawy, komunikat "Brak kaw", zachęta do dodania pierwszej
- **ErrorBanner**: Alert destructive z komunikatem i przyciskiem "Spróbuj ponownie"

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

type RoasteryCoffeeDto = {
  id: string
  name: string
  avgMain: number | null
  ratingsCount: number
  smallSample: boolean
  createdAt: string
}

type RoasteryCoffeeListResponse = {
  page: number
  pageSize: number
  total: number
  items: RoasteryCoffeeDto[]
}
```

### 5.2 Typy ViewModel (dla komponentów)

```typescript
// Stan zapytania dla paginacji
type RoasteryCoffeesQueryState = {
  page: number
  pageSize: number
}

// ViewModel palarni
type RoasteryDetailVM = {
  id: string
  name: string
  city: string
}

// ViewModel pojedynczej kawy na liście
type CoffeeListItemVM = {
  id: string
  name: string
  avgMain: number | null
  ratingsCount: number
  smallSample: boolean
  href: string
}

// ViewModel listy kaw z paginacją
type CoffeesListVM = {
  items: CoffeeListItemVM[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

// Stan paginacji
type PaginationState = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

// Stan błędu API
type ApiErrorState = {
  code: string
  message: string
}
```

### 5.3 Funkcje mapujące

```typescript
function mapRoasteryDtoToVM(dto: RoasteryDto): RoasteryDetailVM {
  return {
    id: dto.id,
    name: dto.name,
    city: dto.city,
  }
}

function mapCoffeeDtoToVM(dto: RoasteryCoffeeDto): CoffeeListItemVM {
  return {
    id: dto.id,
    name: dto.name,
    avgMain: dto.avgMain,
    ratingsCount: dto.ratingsCount,
    smallSample: dto.smallSample,
    href: `/coffees/${dto.id}`,
  }
}

function mapCoffeeListResponseToVM(response: RoasteryCoffeeListResponse): CoffeesListVM {
  const totalPages = Math.ceil(response.total / response.pageSize)
  return {
    items: response.items.map(mapCoffeeDtoToVM),
    page: response.page,
    pageSize: response.pageSize,
    total: response.total,
    totalPages,
  }
}
```

## 6. Zarządzanie stanem

### 6.1 Hook useRoasteryDetail

Pobiera dane szczegółowe palarni.

```typescript
type UseRoasteryDetailResult = {
  data: RoasteryDetailVM | null
  isLoading: boolean
  error: ApiErrorState | null
}

function useRoasteryDetail(roasteryId: string): UseRoasteryDetailResult
```

**Implementacja**:
- `useState` dla `data`, `isLoading`, `error`
- `useEffect` z fetch do `/api/roasteries/{id}`
- Obsługa 404 (roastery_not_found)

### 6.2 Hook useRoasteryCoffees

Pobiera listę kaw palarni z paginacją.

```typescript
type UseRoasteryCoffeesResult = {
  data: CoffeesListVM | null
  isLoading: boolean
  error: ApiErrorState | null
  refetch: () => void
}

function useRoasteryCoffees(
  roasteryId: string, 
  query: RoasteryCoffeesQueryState
): UseRoasteryCoffeesResult
```

**Implementacja**:
- `useState` dla `data`, `isLoading`, `error`
- `useCallback` dla funkcji `fetchData`
- `useEffect` zależny od `query.page`, `query.pageSize`
- Fetch do `/api/roasteries/{id}/coffees?page={page}&pageSize={pageSize}`
- Opcja `cache: 'no-store'` dla świeżości danych

### 6.3 Stan głównego komponentu

```typescript
// W RoasteryDetailView
const [query, setQuery] = useState<RoasteryCoffeesQueryState>(initialQuery)
const { isAuthenticated, isLoading: isAuthLoading } = useAuthSession()
const roasteryDetail = useRoasteryDetail(roasteryId)
const coffeesList = useRoasteryCoffees(roasteryId, query)
```

## 7. Integracja API

### 7.1 GET /api/roasteries/{id}

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
- 400: Invalid path params (nieprawidłowy UUID)
- 404: roastery_not_found

### 7.2 GET /api/roasteries/{id}/coffees

**Żądanie**:
- Metoda: GET
- Path params: `id` (UUID)
- Query params: `page`, `pageSize`

**Odpowiedź 200**:
```typescript
type RoasteryCoffeeListResponse = {
  page: number
  pageSize: number
  total: number
  items: RoasteryCoffeeDto[]
}
```

**Błędy**:
- 400: Invalid query params
- 404: roastery_not_found

## 8. Interakcje użytkownika

| Interakcja | Komponent | Rezultat |
|------------|-----------|----------|
| Wejście na stronę | RoasteryDetailView | Fetch danych palarni i kaw |
| Kliknięcie karty kawy | CoffeeCard | Nawigacja do `/coffees/{id}` |
| Kliknięcie "Dodaj kawę" | RoasteryHeader | Nawigacja do `/roasteries/{id}/coffees/new` |
| Zmiana strony | PaginationControls | Aktualizacja URL, refetch kaw |
| Zmiana pageSize | PaginationControls | Reset do page=1, aktualizacja URL, refetch |
| Przycisk "Spróbuj ponownie" | ErrorBanner | Ponowny fetch danych |
| Nawigacja wstecz/dalej | RoasteryDetailView | Parsowanie URL, aktualizacja stanu |

## 9. Warunki i walidacja

### 9.1 Walidacja parametru roasteryId

- **Warunek**: `id` musi być poprawnym UUID
- **Komponent**: Strona Astro / RoasteryDetailView
- **Wpływ**: Nieprawidłowy UUID → przekierowanie do 404 lub komunikat błędu

### 9.2 Walidacja query params

- **Warunki**: 
  - `page` >= 1 (integer)
  - `pageSize` w zakresie 1-100 (integer)
- **Komponent**: Strona Astro (server-side), RoasteryDetailView (client-side)
- **Wpływ**: Nieprawidłowe wartości → użycie domyślnych (page=1, pageSize=30)

### 9.3 Warunek wyświetlania przycisku "Dodaj kawę"

- **Warunek**: Użytkownik jest zalogowany (`isAuthenticated === true`)
- **Komponent**: RoasteryHeader
- **Wpływ**: Niezalogowany → przycisk niewidoczny

### 9.4 Warunek wyświetlania SmallSampleBadge

- **Warunek**: `smallSample === true` (ratingsCount < 3)
- **Komponent**: CoffeeCard
- **Wpływ**: Spełniony → wyświetlenie badge "Mała próba"

## 10. Obsługa błędów

| Scenariusz | Kod HTTP | Komunikat użytkownika | Akcja |
|------------|----------|----------------------|-------|
| Palarnia nie istnieje | 404 | "Palarnia nie została znaleziona" | Wyświetl ErrorBanner z linkiem do listy palarni |
| Błędne parametry | 400 | "Nieprawidłowe parametry zapytania" | Reset do domyślnych wartości, refetch |
| Błąd serwera | 500 | "Wystąpił błąd serwera. Spróbuj ponownie później." | ErrorBanner z przyciskiem retry |
| Błąd sieci | - | "Problem z połączeniem. Sprawdź połączenie internetowe." | ErrorBanner z przyciskiem retry |
| Pusta lista kaw | - | "Brak kaw. Dodaj pierwszą!" | EmptyState z zachętą |

## 11. Kroki implementacji

1. **Utworzenie strony Astro** (`src/pages/roasteries/[id].astro`)
   - Konfiguracja `export const prerender = false`
   - Parsowanie i walidacja parametru `id`
   - Parsowanie query params (page, pageSize)
   - Import Layout i RoasteryDetailView
   - Przekazanie props do komponentu React

2. **Utworzenie typów ViewModel** (w pliku `src/components/roasteries/RoasteryDetailView.tsx`)
   - Definicja `RoasteryCoffeesQueryState`
   - Definicja `RoasteryDetailVM`, `CoffeeListItemVM`, `CoffeesListVM`
   - Implementacja funkcji mapujących

3. **Implementacja hooka useRoasteryDetail**
   - Fetch danych palarni
   - Obsługa stanów loading/error/success
   - Mapowanie DTO na ViewModel

4. **Implementacja hooka useRoasteryCoffees**
   - Fetch listy kaw z paginacją
   - Obsługa stanów loading/error/success
   - Funkcja refetch
   - Mapowanie response na ViewModel

5. **Implementacja komponentów pomocniczych**
   - RatingBadge (wyświetlanie oceny)
   - SmallSampleBadge (informacja o małej próbie)
   - LoadingState, EmptyState, ErrorBanner (wzorowane na RoasteriesListView)

6. **Implementacja CoffeeCard**
   - Karta z informacjami o kawie
   - Styling hover effects
   - Link do szczegółów kawy

7. **Implementacja CoffeeList**
   - Grid layout
   - Mapowanie items na CoffeeCard

8. **Implementacja RoasteryHeader**
   - Nagłówek z nazwą i miastem
   - Warunkowy przycisk "Dodaj kawę"

9. **Implementacja RoasteryDetailView**
   - Integracja hooków
   - Zarządzanie paginacją i URL
   - Obsługa popstate dla nawigacji przeglądarki
   - Warunkowe renderowanie stanów

10. **Ponowne wykorzystanie PaginationControls**
    - Import z RoasteriesListView lub wyodrębnienie do współdzielonego komponentu

11. **Testowanie i walidacja**
    - Sprawdzenie poprawności routingu
    - Weryfikacja integracji z API
    - Test paginacji
    - Test obsługi błędów
    - Weryfikacja warunków wyświetlania (przycisk, badge)

12. **Sprawdzenie linterów i poprawa błędów**
    - Uruchomienie `ReadLints` po zakończeniu implementacji
    - Naprawa ewentualnych błędów TypeScript/ESLint
