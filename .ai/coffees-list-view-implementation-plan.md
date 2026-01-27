# Plan implementacji widoku Globalna lista kaw (ranking)

## 1. Przegląd

Widok globalnej listy kaw przedstawia ranking wszystkich kaw w aplikacji posortowanych według średniej oceny głównej (malejąco). Realizuje historyjkę użytkownika US-008 (Posortowana lista wszystkich kaw) oraz US-012 (Ograniczenia sortowania i filtrowania - tylko po głównej ocenie).

Widok jest publicznie dostępny (bez wymagania logowania) i umożliwia przeglądanie kaw z paginacją oraz synchronizacją stanu z URL.

## 2. Routing widoku

**Ścieżka**: `/coffees`

**Plik Astro**: `src/pages/coffees/index.astro`

**Parametry URL**:
- `page` (domyślnie: 1, min: 1)
- `pageSize` (domyślnie: 100, max: 100)
- `sort` (domyślnie: `rating_desc`, jedyna obsługiwana wartość)

**Przykład URL**: `/coffees?page=1&pageSize=100&sort=rating_desc`

## 3. Struktura komponentów

```
src/
├── pages/
│   └── coffees/
│       └── index.astro                    # Strona listy kaw
└── components/
    └── coffees/
        ├── CoffeesListView.tsx            # Główny komponent listy kaw
        └── shared/
            ├── RatingBadge.tsx            # Badge z oceną (kolor wg wartości)
            ├── SmallSampleBadge.tsx       # Badge "Mała próba"
            ├── CoffeeCard.tsx             # Karta kawy do listy
            └── PaginationControls.tsx     # Kontrolki paginacji
```

### Drzewo komponentów

```
CoffeesListView
├── PageHeader
│   └── Tytuł "Ranking kaw"
├── ErrorBanner (warunkowo)
├── LoadingState (warunkowo)
├── EmptyState (warunkowo)
├── CoffeesList
│   └── CoffeeCard[]
│       ├── RatingBadge
│       └── SmallSampleBadge (warunkowo)
└── PaginationControls
```

## 4. Szczegóły komponentów

### 4.1 CoffeesListView

- **Opis**: Główny komponent widoku globalnej listy kaw. Odpowiada za pobieranie danych, zarządzanie paginacją i synchronizację z URL.
- **Główne elementy**:
  - Nagłówek strony z tytułem "Ranking kaw"
  - Siatka kart kaw (grid 1-3 kolumny responsywnie)
  - Kontrolki paginacji
  - Stany ładowania, błędu i pustej listy
- **Obsługiwane interakcje**:
  - Zmiana strony (page)
  - Zmiana rozmiaru strony (pageSize)
  - Kliknięcie karty kawy → nawigacja do szczegółów
  - Nawigacja przeglądarki (back/forward)
- **Obsługiwana walidacja**: Brak walidacji użytkownika (widok tylko do odczytu)
- **Typy**:
  - `CoffeesQueryState` - stan parametrów zapytania
  - `CoffeeListItemVM` - model widoku elementu listy
  - `CoffeesListVM` - model widoku całej listy
  - `CoffeeListResponse` (DTO z API)
- **Propsy**:
  ```typescript
  type CoffeesListViewProps = {
    initialQuery: CoffeesQueryState
  }
  ```

### 4.2 CoffeeCard

- **Opis**: Karta pojedynczej kawy wyświetlana w liście. Prezentuje podstawowe informacje i prowadzi do szczegółów.
- **Główne elementy**:
  - Nazwa kawy (CardTitle)
  - Badge z oceną (RatingBadge)
  - Badge "Mała próba" (SmallSampleBadge) - warunkowo przy `ratingsCount < 3`
  - Liczba ocen
- **Obsługiwane interakcje**:
  - Kliknięcie → nawigacja do `/coffees/{id}`
  - Hover → wizualne podświetlenie
- **Obsługiwana walidacja**: Brak
- **Typy**: `CoffeeListItemVM`
- **Propsy**:
  ```typescript
  type CoffeeCardProps = {
    item: CoffeeListItemVM
  }
  ```

### 4.3 RatingBadge

- **Opis**: Wizualna prezentacja oceny z kolorystyką zależną od wartości.
- **Główne elementy**: Badge/span z wartością i odpowiednim kolorem tła
- **Obsługiwane interakcje**: Brak (prezentacyjny)
- **Obsługiwana walidacja**: Brak
- **Typy**: `number | null`
- **Propsy**:
  ```typescript
  type RatingBadgeProps = {
    value: number | null
    size?: 'sm' | 'md' | 'lg'
  }
  ```
- **Logika kolorów**:
  - `null` → szary, "Brak ocen"
  - `>= 4.5` → zielony
  - `>= 3.5` → limonkowy
  - `>= 2.5` → żółty
  - `< 2.5` → czerwony

### 4.4 SmallSampleBadge

- **Opis**: Badge informujący o małej próbie statystycznej (< 3 oceny).
- **Główne elementy**: Badge z ikoną info i tekstem "Mała próba"
- **Obsługiwane interakcje**: Hover → tooltip z wyjaśnieniem
- **Obsługiwana walidacja**: Brak
- **Typy**: Brak specyficznych
- **Propsy**: Brak (lub opcjonalny `className`)

### 4.5 PaginationControls

- **Opis**: Kontrolki paginacji z wyborem strony i rozmiaru strony. Komponent współdzielony z innymi widokami list.
- **Główne elementy**:
  - Select z wyborem pageSize (opcje: 10, 30, 50, 100)
  - Przyciski nawigacji (poprzednia/następna)
  - Numery stron z elipsami
- **Obsługiwane interakcje**:
  - Zmiana strony
  - Zmiana rozmiaru strony
- **Obsługiwana walidacja**: Brak
- **Typy**: `PaginationState`
- **Propsy**:
  ```typescript
  type PaginationControlsProps = {
    pagination: PaginationState
    onPageChange: (page: number) => void
    onPageSizeChange: (pageSize: number) => void
  }
  ```

## 5. Typy

### 5.1 Typy DTO (z API)

```typescript
// Istniejące w src/types.ts
type CoffeeDto = {
  id: string                    // UUID kawy
  roasteryId: string            // UUID palarni
  name: string                  // Nazwa kawy
  avgMain: number | null        // Średnia głównej oceny
  ratingsCount: number          // Liczba ocen
  smallSample: boolean          // true jeśli ratingsCount < 3
  createdAt: string             // ISO-8601
}

type CoffeeListResponse = PaginatedResponse<CoffeeDto>
```

### 5.2 Typy ViewModel (nowe)

```typescript
// Stan parametrów zapytania
type CoffeesQueryState = {
  page: number
  pageSize: number
}

// Model widoku pojedynczego elementu listy
type CoffeeListItemVM = {
  id: string
  name: string
  roasteryId: string
  avgMain: number | null
  ratingsCount: number
  smallSample: boolean
  href: string                  // /coffees/{id}
}

// Model widoku całej listy
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

## 6. Zarządzanie stanem

### 6.1 Custom Hook: useCoffeesList

```typescript
type UseCoffeesListResult = {
  data: CoffeesListVM | null
  isLoading: boolean
  error: ApiErrorState | null
  refetch: () => void
}

function useCoffeesList(query: CoffeesQueryState): UseCoffeesListResult
```

**Odpowiedzialności**:
- Pobieranie danych z `GET /api/coffees`
- Mapowanie CoffeeListResponse → CoffeesListVM
- Obsługa stanów ładowania i błędów
- Cache bypass (`cache: 'no-store'`)

### 6.2 Stan URL

Komponent `CoffeesListView` synchronizuje stan paginacji z URL:
- Odczyt parametrów przy mount (funkcja `parseQueryFromUrl`)
- Aktualizacja URL przy zmianie strony/rozmiaru (`history.pushState`)
- Obsługa nawigacji przeglądarki (`popstate` event)

**Funkcja parsowania URL**:
```typescript
function parseQueryFromUrl(): CoffeesQueryState {
  const params = new URLSearchParams(window.location.search)
  const rawPage = params.get('page')
  const rawPageSize = params.get('pageSize')

  const parsedPage = rawPage ? parseInt(rawPage, 10) : 1
  const page = Number.isInteger(parsedPage) && parsedPage >= 1 ? parsedPage : 1

  const parsedPageSize = rawPageSize ? parseInt(rawPageSize, 10) : 100
  const pageSize = Number.isInteger(parsedPageSize) && parsedPageSize >= 1 && parsedPageSize <= 100
    ? parsedPageSize
    : 100

  return { page, pageSize }
}
```

## 7. Integracja API

### 7.1 GET /api/coffees

**Żądanie**:
```
GET /api/coffees?page=1&pageSize=100&sort=rating_desc
```

**Query params**:
- `page`: number (default: 1, min: 1)
- `pageSize`: number (default: 100, max: 100)
- `roasteryId`: string (optional, UUID) - filtr po palarni
- `q`: string (optional, 1-64 chars) - wyszukiwanie po nazwie
- `sort`: string (default: `rating_desc`, jedyna obsługiwana)

**Odpowiedź 200**:
```typescript
{
  page: number
  pageSize: number
  total: number
  items: CoffeeDto[]
}
```

**Błędy**:
- 400: `validation_failed` - nieprawidłowe parametry

### 7.2 Mapowanie DTO → ViewModel

```typescript
function mapDtoToVM(dto: CoffeeDto): CoffeeListItemVM {
  return {
    id: dto.id,
    name: dto.name,
    roasteryId: dto.roasteryId,
    avgMain: dto.avgMain,
    ratingsCount: dto.ratingsCount,
    smallSample: dto.smallSample,
    href: `/coffees/${dto.id}`,
  }
}

function mapResponseToVM(response: CoffeeListResponse): CoffeesListVM {
  const totalPages = Math.ceil(response.total / response.pageSize)
  return {
    items: response.items.map(mapDtoToVM),
    page: response.page,
    pageSize: response.pageSize,
    total: response.total,
    totalPages,
  }
}
```

## 8. Interakcje użytkownika

| Akcja | Oczekiwany rezultat |
|-------|---------------------|
| Wejście na `/coffees` | Załadowanie listy kaw posortowanych po ocenie |
| Kliknięcie karty kawy | Nawigacja do `/coffees/{id}` |
| Zmiana strony (pagination) | Aktualizacja URL i pobranie nowych danych |
| Zmiana rozmiaru strony | Reset do strony 1, aktualizacja URL i danych |
| Back/Forward w przeglądarce | Synchronizacja stanu z URL |

## 9. Warunki i walidacja

### 9.1 Warunki dostępu

| Widok | Warunek | Akcja przy niespełnieniu |
|-------|---------|--------------------------|
| Lista kaw | Brak | Widok publiczny, dostępny dla wszystkich |

### 9.2 Warunki wyświetlania UI

| Element | Warunek | Zachowanie |
|---------|---------|------------|
| SmallSampleBadge | `ratingsCount < 3` | Wyświetl badge "Mała próba" |
| RatingBadge | `avgMain !== null` | Wyświetl wartość z kolorem |
| RatingBadge | `avgMain === null` | Wyświetl "Brak ocen" (szary) |
| PaginationControls | `totalPages > 1` lub `pageSize !== 100` | Wyświetl kontrolki |

## 10. Obsługa błędów

### 10.1 Błędy sieciowe

| Scenariusz | Obsługa |
|------------|---------|
| Brak połączenia | Banner: "Problem z połączeniem. Sprawdź połączenie internetowe." + przycisk "Spróbuj ponownie" |
| Timeout | Banner: "Serwer nie odpowiada. Spróbuj ponownie później." |
| Błąd parsowania JSON | Banner: "Nieoczekiwany format odpowiedzi serwera." |

### 10.2 Błędy API

| Kod | Obsługa |
|-----|---------|
| 400 | Banner: "Nieprawidłowe parametry zapytania." + reset do domyślnych parametrów |
| 500 | Banner: "Wystąpił błąd serwera. Spróbuj ponownie później." |

### 10.3 Stany UI

| Stan | Prezentacja |
|------|-------------|
| Ładowanie | Spinner + tekst "Ładowanie kaw..." |
| Pusta lista | Ikona kawy + "Brak kaw do wyświetlenia" |
| Błąd | Alert destructive z komunikatem + przycisk "Spróbuj ponownie" |

## 11. Kroki implementacji

1. **Utworzenie struktury katalogów**
   - Utworzenie `src/pages/coffees/index.astro`
   - Utworzenie `src/components/coffees/CoffeesListView.tsx`
   - Utworzenie `src/components/coffees/shared/` z plikami komponentów

2. **Implementacja współdzielonych komponentów**
   - Wyodrębnienie `RatingBadge` z `RoasteryDetailView` do `src/components/coffees/shared/RatingBadge.tsx`
   - Wyodrębnienie `SmallSampleBadge` do `src/components/coffees/shared/SmallSampleBadge.tsx`
   - Wyodrębnienie/adaptacja `PaginationControls` do `src/components/coffees/shared/PaginationControls.tsx`
   - Implementacja `CoffeeCard` w `src/components/coffees/shared/CoffeeCard.tsx`

3. **Implementacja custom hooka `useCoffeesList`**
   - Fetch z `/api/coffees` z parametrami query
   - Mapowanie DTO → ViewModel
   - Obsługa stanów ładowania i błędów

4. **Implementacja `CoffeesListView`**
   - Wykorzystanie `useCoffeesList`
   - Stan paginacji zsynchronizowany z URL
   - Rendering siatki kart kaw
   - Komponenty stanów: LoadingState, EmptyState, ErrorBanner

5. **Implementacja strony Astro `/coffees`**
   - Import Layout
   - Parsowanie początkowych parametrów z URL (server-side)
   - Hydration komponentu React z `client:load`

6. **Testowanie**
   - Sprawdzenie paginacji i synchronizacji z URL
   - Sprawdzenie responsywności (grid 1-3 kolumny)
   - Sprawdzenie dostępności (ARIA, klawiatura)
   - Sprawdzenie wydajności (p95 < 300ms)

### Uwagi implementacyjne

1. **Współdzielenie komponentów**: `RatingBadge`, `SmallSampleBadge` i `PaginationControls` są już zaimplementowane w `RoasteryDetailView`. Należy wyodrębnić je do wspólnej lokalizacji.

2. **Brak filtrów/sortowań**: Zgodnie z PRD (US-012) UI nie pokazuje nieobsługiwanych opcji sortowania i filtrowania.

3. **Wydajność**: Lista może zawierać wiele elementów - rozważyć wirtualizację dla dużych zbiorów danych.
