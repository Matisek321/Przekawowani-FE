# Plan implementacji widoku Szczegóły kawy

## 1. Przegląd

Widok szczegółów kawy prezentuje pełne informacje o wybranej kawie wraz z agregatami ocen społeczności. Realizuje historyjkę użytkownika US-009 (Szczegóły kawy), wyświetlając średnią ocenę główną, liczbę ocen, etykietę "mała próba" oraz średnie dla metryk dodatkowych (moc, kwasowość, posmak).

Widok jest publicznie dostępny, ale przycisk "Oceń tę kawę" jest widoczny tylko dla zalogowanych użytkowników posiadających ustawiony `display_name`.

## 2. Routing widoku

**Ścieżka**: `/coffees/:id`

**Plik Astro**: `src/pages/coffees/[id]/index.astro`

**Parametry ścieżki**:
- `id` - UUID kawy

**Przykład URL**: `/coffees/550e8400-e29b-41d4-a716-446655440000`

## 3. Struktura komponentów

```
src/
├── pages/
│   └── coffees/
│       └── [id]/
│           └── index.astro                # Strona szczegółów kawy
└── components/
    └── coffees/
        ├── CoffeeDetailView.tsx           # Główny komponent szczegółów kawy
        └── shared/
            ├── RatingBadge.tsx            # Badge z oceną (kolor wg wartości)
            └── SmallSampleBadge.tsx       # Badge "Mała próba"
```

### Drzewo komponentów

```
CoffeeDetailView
├── BackLink ("← Powrót do listy")
├── ErrorBanner (warunkowo - przy błędzie)
├── LoadingState (warunkowo - podczas ładowania)
├── CoffeeHeader (gdy dane załadowane)
│   ├── Nazwa kawy (h1)
│   ├── RatingBadge (główna ocena)
│   ├── SmallSampleBadge (warunkowo - przy ratingsCount < 3)
│   └── Liczba ocen
├── RoasteryInfo (opcjonalne - dane palarni)
│   └── Link do palarni
├── MetricsSection
│   └── MetricDisplay[] (avgMain, avgStrength, avgAcidity, avgAftertaste)
└── RateCoffeeButton (tylko dla zalogowanych z display_name)
```

## 4. Szczegóły komponentów

### 4.1 CoffeeDetailView

- **Opis**: Główny komponent szczegółów kawy. Wyświetla dane agregacyjne i umożliwia przejście do oceniania.
- **Główne elementy**:
  - Link powrotu do listy kaw
  - Nagłówek z nazwą kawy
  - Sekcja głównej oceny z RatingBadge i SmallSampleBadge
  - Informacja o palarni (nazwa, miasto, link)
  - Sekcja metryk dodatkowych (moc, kwasowość, posmak)
  - Przycisk "Oceń tę kawę" (dla zalogowanych z display_name)
- **Obsługiwane interakcje**:
  - Kliknięcie "Oceń tę kawę" → nawigacja do `/coffees/{id}/rate`
  - Kliknięcie "Powrót do listy" → nawigacja do `/coffees`
  - Kliknięcie linku palarni → nawigacja do `/roasteries/{roasteryId}`
- **Obsługiwana walidacja**: Brak (widok tylko do odczytu)
- **Typy**:
  - `CoffeeDetailVM` - model widoku szczegółów
  - `CoffeeDetailDto` (DTO z API)
- **Propsy**:
  ```typescript
  type CoffeeDetailViewProps = {
    coffeeId: string
  }
  ```

### 4.2 CoffeeHeader

- **Opis**: Nagłówek ze wszystkimi kluczowymi informacjami o kawie.
- **Główne elementy**:
  - Nazwa kawy (h1)
  - RatingBadge z główną oceną (rozmiar lg)
  - SmallSampleBadge (warunkowo)
  - Tekst z liczbą ocen
- **Obsługiwane interakcje**: Brak (prezentacyjny)
- **Obsługiwana walidacja**: Brak
- **Typy**: `CoffeeDetailVM`
- **Propsy**:
  ```typescript
  type CoffeeHeaderProps = {
    coffee: CoffeeDetailVM
  }
  ```

### 4.3 MetricsSection

- **Opis**: Sekcja wyświetlająca średnie dla wszystkich metryk oceny.
- **Główne elementy**:
  - Tytuł sekcji "Metryki"
  - MetricDisplay dla każdej metryki: Ocena główna, Moc, Kwasowość, Posmak
- **Obsługiwane interakcje**: Brak (prezentacyjny)
- **Obsługiwana walidacja**: Brak
- **Typy**: Średnie metryk (number | null)
- **Propsy**:
  ```typescript
  type MetricsSectionProps = {
    avgMain: number | null
    avgStrength?: number | null    // Wymaga rozszerzenia API
    avgAcidity?: number | null     // Wymaga rozszerzenia API
    avgAftertaste?: number | null  // Wymaga rozszerzenia API
  }
  ```

**Uwaga**: Obecne API nie zwraca średnich dla metryk dodatkowych. W MVP należy:
- Rozszerzyć endpoint `GET /api/coffees/{id}` o pola `avgStrength`, `avgAcidity`, `avgAftertaste`, LUB
- Wyświetlić tylko `avgMain` z informacją "Szczegółowe metryki wkrótce"

### 4.4 MetricDisplay

- **Opis**: Pojedynczy element wyświetlający metrykę z etykietą i wartością.
- **Główne elementy**:
  - Etykieta metryki (np. "Ocena kawy", "Moc")
  - Wartość (liczba lub "Brak danych")
  - Opcjonalnie: wizualizacja (pasek postępu 1-5)
- **Obsługiwane interakcje**: Brak (prezentacyjny)
- **Obsługiwana walidacja**: Brak
- **Typy**: `number | null`
- **Propsy**:
  ```typescript
  type MetricDisplayProps = {
    label: string
    value: number | null
    showBar?: boolean
  }
  ```

### 4.5 RateCoffeeButton

- **Opis**: Przycisk CTA do oceniania kawy z logiką dostępu.
- **Główne elementy**:
  - Button "Oceń tę kawę"
  - Opcjonalnie: tekst informacyjny dla niezalogowanych
- **Obsługiwane interakcje**:
  - Kliknięcie (zalogowany + display_name) → nawigacja do `/coffees/{id}/rate`
  - Kliknięcie (niezalogowany) → nawigacja do `/login?returnTo=/coffees/{id}/rate`
  - Kliknięcie (bez display_name) → nawigacja do `/account/display-name?returnTo=/coffees/{id}/rate`
- **Obsługiwana walidacja**: Sprawdzenie stanu sesji i display_name
- **Typy**: Stan sesji z `useAuthSession`
- **Propsy**:
  ```typescript
  type RateCoffeeButtonProps = {
    coffeeId: string
  }
  ```

### 4.6 RatingBadge (współdzielony)

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

### 4.7 SmallSampleBadge (współdzielony)

- **Opis**: Badge informujący o małej próbie statystycznej (< 3 oceny).
- **Główne elementy**: Badge z ikoną info i tekstem "Mała próba"
- **Obsługiwane interakcje**: Hover → tooltip z wyjaśnieniem
- **Obsługiwana walidacja**: Brak
- **Typy**: Brak specyficznych
- **Propsy**: Brak (lub opcjonalny `className`)

## 5. Typy

### 5.1 Typy DTO (z API)

```typescript
// Istniejące w src/types.ts
type CoffeeDetailDto = {
  id: string                    // UUID kawy
  roasteryId: string            // UUID palarni
  name: string                  // Nazwa kawy
  avgMain: number | null        // Średnia głównej oceny
  ratingsCount: number          // Liczba ocen
  smallSample: boolean          // true jeśli ratingsCount < 3
  createdAt: string             // ISO-8601
}

// Opcjonalne - dane palarni
type RoasteryDto = {
  id: string
  name: string
  city: string
  createdAt: string
}
```

### 5.2 Typy ViewModel (nowe)

```typescript
// Model widoku szczegółów kawy
type CoffeeDetailVM = {
  id: string
  name: string
  roasteryId: string
  roasteryName?: string         // Pobierane osobno z API palarni
  roasteryCity?: string         // Pobierane osobno z API palarni
  roasteryHref?: string         // /roasteries/{roasteryId}
  avgMain: number | null
  ratingsCount: number
  smallSample: boolean
  // Uwaga: W MVP brak średnich dla metryk dodatkowych w API
  // avgStrength?: number | null
  // avgAcidity?: number | null
  // avgAftertaste?: number | null
}

// Stan błędu API
type ApiErrorState = {
  code: string
  message: string
}
```

## 6. Zarządzanie stanem

### 6.1 Custom Hook: useCoffeeDetail

```typescript
type UseCoffeeDetailResult = {
  data: CoffeeDetailVM | null
  isLoading: boolean
  error: ApiErrorState | null
  refetch: () => void
}

function useCoffeeDetail(coffeeId: string): UseCoffeeDetailResult
```

**Odpowiedzialności**:
- Pobieranie danych z `GET /api/coffees/{id}`
- Opcjonalne pobieranie danych palarni z `GET /api/roasteries/{roasteryId}`
- Mapowanie do CoffeeDetailVM
- Obsługa 404 i innych błędów

### 6.2 Wykorzystanie useAuthSession

Hook `useAuthSession` (istniejący) do sprawdzenia stanu sesji użytkownika:

```typescript
const { isAuthenticated, isLoading: isAuthLoading, user } = useAuthSession()
```

### 6.3 Sprawdzenie display_name

Wykorzystanie logiki z `useDisplayNameGate` lub bezpośrednie sprawdzenie profilu:

```typescript
// Sprawdzenie czy użytkownik ma ustawiony display_name
const hasDisplayName = user?.displayName != null
```

## 7. Integracja API

### 7.1 GET /api/coffees/{id}

**Żądanie**:
```
GET /api/coffees/{id}
```

**Odpowiedź 200**:
```typescript
CoffeeDetailDto
```

**Błędy**:
- 400: `validation_failed` - nieprawidłowy UUID
- 404: `coffee_not_found` - kawa nie istnieje

### 7.2 GET /api/roasteries/{id} (opcjonalne)

**Żądanie**:
```
GET /api/roasteries/{roasteryId}
```

**Odpowiedź 200**:
```typescript
RoasteryDto
```

**Wykorzystanie**: Pobieranie nazwy i miasta palarni do wyświetlenia w szczegółach kawy.

### 7.3 Mapowanie DTO → ViewModel

```typescript
function mapCoffeeDetailToVM(
  coffee: CoffeeDetailDto,
  roastery?: RoasteryDto
): CoffeeDetailVM {
  return {
    id: coffee.id,
    name: coffee.name,
    roasteryId: coffee.roasteryId,
    roasteryName: roastery?.name,
    roasteryCity: roastery?.city,
    roasteryHref: `/roasteries/${coffee.roasteryId}`,
    avgMain: coffee.avgMain,
    ratingsCount: coffee.ratingsCount,
    smallSample: coffee.smallSample,
  }
}
```

## 8. Interakcje użytkownika

| Akcja | Oczekiwany rezultat |
|-------|---------------------|
| Wejście na `/coffees/{id}` | Załadowanie szczegółów kawy |
| Kliknięcie "Oceń tę kawę" (zalogowany z display_name) | Nawigacja do `/coffees/{id}/rate` |
| Kliknięcie "Oceń tę kawę" (niezalogowany) | Przekierowanie do `/login?returnTo=/coffees/{id}/rate` |
| Kliknięcie "Oceń tę kawę" (bez display_name) | Przekierowanie do `/account/display-name?returnTo=/coffees/{id}/rate` |
| Kliknięcie "Powrót do listy" | Nawigacja do `/coffees` |
| Kliknięcie linku palarni | Nawigacja do `/roasteries/{roasteryId}` |

## 9. Warunki i walidacja

### 9.1 Warunki dostępu

| Element | Warunek | Akcja przy niespełnieniu |
|---------|---------|--------------------------|
| Widok szczegółów | Brak | Widok publiczny, dostępny dla wszystkich |
| Przycisk "Oceń" | Zalogowany | Przekierowanie do `/login` |
| Przycisk "Oceń" | Posiada display_name | Przekierowanie do `/account/display-name` |

### 9.2 Warunki wyświetlania UI

| Element | Warunek | Zachowanie |
|---------|---------|------------|
| SmallSampleBadge | `ratingsCount < 3` | Wyświetl badge "Mała próba" |
| RatingBadge | `avgMain !== null` | Wyświetl wartość z kolorem |
| RatingBadge | `avgMain === null` | Wyświetl "Brak ocen" (szary) |
| RoasteryInfo | Dane palarni załadowane | Wyświetl nazwę i miasto z linkiem |
| Przycisk "Oceń" | Zalogowany + display_name | Wyświetl aktywny przycisk |
| Przycisk "Oceń" | Niezalogowany | Wyświetl przycisk z przekierowaniem do login |

## 10. Obsługa błędów

### 10.1 Błędy sieciowe

| Scenariusz | Obsługa |
|------------|---------|
| Brak połączenia | Banner: "Problem z połączeniem. Sprawdź połączenie internetowe." + przycisk "Spróbuj ponownie" |
| Timeout | Banner: "Serwer nie odpowiada. Spróbuj ponownie później." |

### 10.2 Błędy API

| Kod | Obsługa |
|-----|---------|
| 400 | Banner: "Nieprawidłowy identyfikator kawy." |
| 404 | Banner: "Kawa nie została znaleziona." + link "Powrót do listy kaw" |
| 500 | Banner: "Wystąpił błąd serwera. Spróbuj ponownie później." |

### 10.3 Stany UI

| Stan | Prezentacja |
|------|-------------|
| Ładowanie | Spinner + tekst "Ładowanie szczegółów kawy..." |
| Błąd 404 | Alert z komunikatem + prominentny link do listy |
| Błąd inny | Alert destructive z komunikatem + przycisk "Spróbuj ponownie" |

## 11. Kroki implementacji

1. **Utworzenie struktury katalogów**
   - Utworzenie `src/pages/coffees/[id]/index.astro`
   - Utworzenie `src/components/coffees/CoffeeDetailView.tsx`

2. **Implementacja custom hooka `useCoffeeDetail`**
   - Fetch z `/api/coffees/{id}`
   - Opcjonalne fetch danych palarni z `/api/roasteries/{roasteryId}`
   - Mapowanie do CoffeeDetailVM
   - Obsługa błędów (szczególnie 404)

3. **Implementacja sub-komponentów**
   - `CoffeeHeader` - nagłówek z oceną i badge'ami
   - `MetricsSection` i `MetricDisplay` - sekcja metryk
   - `RateCoffeeButton` - przycisk z logiką dostępu

4. **Implementacja `CoffeeDetailView`**
   - Wykorzystanie `useCoffeeDetail`
   - Wykorzystanie `useAuthSession` do sprawdzenia sesji
   - Kompozycja sub-komponentów
   - Obsługa stanów ładowania i błędów

5. **Implementacja strony Astro `/coffees/[id]`**
   - Import Layout
   - Ekstrakcja `id` z `Astro.params`
   - Hydration komponentu React z `client:load`

6. **Integracja nawigacji**
   - Link powrotu do `/coffees`
   - Link do palarni `/roasteries/{roasteryId}`
   - Przekierowania przy kliknięciu "Oceń tę kawę"

7. **Testowanie**
   - Sprawdzenie wyświetlania danych kawy
   - Sprawdzenie logiki przycisku "Oceń" dla różnych stanów sesji
   - Sprawdzenie obsługi błędu 404
   - Sprawdzenie dostępności (ARIA)

### Uwagi implementacyjne

1. **Brak średnich metryk dodatkowych w API**: Obecne API (`GET /api/coffees/{id}`) zwraca tylko `avgMain`. PRD wymaga wyświetlenia średnich dla moc/kwasowość/posmak. Należy:
   - Rozszerzyć endpoint o pola `avgStrength`, `avgAcidity`, `avgAftertaste`, LUB
   - W MVP wyświetlić tylko avgMain z informacją "Szczegółowe metryki wkrótce"

2. **Pobieranie danych palarni**: Dane palarni (nazwa, miasto) nie są w API szczegółów kawy. Należy wykonać dodatkowe zapytanie do `/api/roasteries/{roasteryId}` lub rozszerzyć endpoint kawy.

3. **Sesja i display_name**: Wykorzystać istniejące hooki `useAuthSession` i logikę z `useDisplayNameGate` do zarządzania dostępem do oceniania.
