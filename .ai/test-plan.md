# Plan Testów - Przekawowani

## 1. Wprowadzenie i cele testowania

### 1.1 Cel dokumentu

Niniejszy dokument przedstawia kompleksowy plan testów dla aplikacji **Przekawowani** - platformy do oceniania i katalogowania kaw od różnych palarni. Plan obejmuje wszystkie warstwy aplikacji od jednostkowych testów logiki biznesowej po testy end-to-end interfejsu użytkownika.

### 1.2 Cele testowania

| Cel | Opis | Metryka sukcesu |
|-----|------|-----------------|
| **Jakość funkcjonalna** | Weryfikacja poprawności działania wszystkich funkcjonalności | 100% testów funkcjonalnych przechodzi |
| **Stabilność API** | Zapewnienie niezawodności endpointów backendowych | Pokrycie testami wszystkich endpointów API |
| **Bezpieczeństwo** | Weryfikacja mechanizmów autentykacji i autoryzacji | Brak podatności w testach bezpieczeństwa |
| **Użyteczność** | Walidacja doświadczenia użytkownika (UX) | Pozytywna ocena testów UAT |
| **Integralność danych** | Zapewnienie spójności danych między warstwami | Wszystkie testy integracyjne przechodzą |

### 1.3 Zakres projektu

Aplikacja Przekawowani składa się z następujących modułów:

- **Moduł autentykacji** - rejestracja, logowanie, resetowanie hasła, zarządzanie sesją
- **Moduł profili użytkowników** - wyświetlanie i edycja nazwy wyświetlanej, usuwanie konta
- **Moduł palarni** - przeglądanie, wyszukiwanie i dodawanie palarni
- **Moduł kaw** - przeglądanie, wyszukiwanie i dodawanie kaw
- **Moduł ocen** - dodawanie i edycja ocen kaw (główna ocena, moc, kwasowość, posmak)

---

## 2. Zakres testów

### 2.1 Elementy objęte testami

#### Backend (API Endpoints)

| Endpoint | Metody | Priorytet |
|----------|--------|-----------|
| `/api/auth/login` | POST | Krytyczny |
| `/api/auth/register` | POST | Krytyczny |
| `/api/auth/logout` | POST | Krytyczny |
| `/api/auth/forgot-password` | POST | Wysoki |
| `/api/auth/reset-password` | POST | Wysoki |
| `/api/auth/me` | GET | Wysoki |
| `/api/profiles/[userId]` | GET | Średni |
| `/api/profiles/me/display-name` | PUT | Wysoki |
| `/api/roasteries` | GET, POST | Wysoki |
| `/api/roasteries/[id]` | GET | Średni |
| `/api/roasteries/[id]/coffees` | GET, POST | Wysoki |
| `/api/coffees` | GET | Wysoki |
| `/api/coffees/[id]` | GET | Średni |
| `/api/coffees/[id]/my-rating` | GET, PUT | Krytyczny |
| `/api/account` | DELETE | Wysoki |

#### Frontend (Komponenty React)

| Kategoria | Komponenty | Priorytet |
|-----------|------------|-----------|
| Autentykacja | `LoginForm`, `RegisterForm`, `ForgotPasswordForm`, `ResetPasswordForm` | Krytyczny |
| Konto | `AccountPage`, `ProfileSection`, `SessionSection`, `DangerZone`, `DeleteAccountDialog` | Wysoki |
| Kawy | `CoffeesListView`, `CoffeeDetailView`, `RateCoffeeForm`, `RateCoffeePage` | Krytyczny |
| Palarnie | `RoasteriesListView`, `RoasteryDetailView`, `CreateRoasteryForm` | Wysoki |
| Współdzielone | `CoffeeCard`, `PaginationControls`, `RatingBadge`, `RatingSlider` | Średni |
| UI | `Button`, `Input`, `Card`, `Alert`, `AlertDialog`, `DropdownMenu` | Niski |

#### Warstwa danych (Serwisy)

| Serwis | Funkcje | Priorytet |
|--------|---------|-----------|
| `auth.service` | `loginUser`, `registerUser`, `logoutUser`, `sendPasswordResetEmail`, `updatePassword` | Krytyczny |
| `ratings.service` | `findCoffeeById`, `getMyRatingForCoffee`, `upsertMyRating`, `toMyRatingDto` | Krytyczny |
| `coffee.service` | `getCoffeeById`, `createCoffee` | Wysoki |
| `coffees.service` | `listCoffees` | Wysoki |
| `roasteries.service` | `listRoasteries`, `getRoasteryById`, `createRoastery` | Wysoki |
| `roasteryCoffees.service` | funkcje listowania kaw palarni | Średni |
| `profile.service` | funkcje zarządzania profilami | Średni |
| `account.service` | funkcje usuwania konta | Wysoki |

#### Walidacja (Schematy Zod)

| Moduł | Schematy | Priorytet |
|-------|----------|-----------|
| `auth.ts` | `LoginBodySchema`, `RegisterBodySchema`, `ForgotPasswordBodySchema`, `ResetPasswordBodySchema` | Krytyczny |
| `rating.ts` | `ratingScoreEnum`, `UpsertRatingCommandSchema`, `UuidSchema` | Krytyczny |
| `coffees.ts` | schematy walidacji kaw | Wysoki |
| `roasteries.ts` | schematy walidacji palarni | Wysoki |
| `pagination.ts` | schematy paginacji | Średni |

### 2.2 Elementy wyłączone z testów

- Wewnętrzne mechanizmy Supabase Auth (testowane przez dostawcę)
- Komponenty UI biblioteki Shadcn/ui (testowane przez społeczność)
- Infrastruktura DigitalOcean i CI/CD GitHub Actions
- Wydajność bazy danych PostgreSQL (wykracza poza zakres MVP)

---

## 3. Typy testów

### 3.1 Testy jednostkowe

**Cel:** Weryfikacja poprawności izolowanych jednostek kodu (funkcje, komponenty, serwisy).

**Zakres:**
- Funkcje pomocnicze (`lib/utils.ts`, `lib/normalization.ts`, `lib/ratingScale.ts`)
- Schematy walidacji Zod
- Logika transformacji danych (DTO <-> DB)
- Hooki React (`useAccountPage`, `useCoffeeDetail`, `useCoffeesList`, `useMyRating`)
- Pure functions w komponentach

**Przykładowe scenariusze:**

```typescript
// lib/ratingScale.ts
describe('ratingScale', () => {
  describe('toDbSmallint', () => {
    it('converts 1.0 to 2', () => { expect(toDbSmallint(1)).toBe(2) })
    it('converts 5.0 to 10', () => { expect(toDbSmallint(5)).toBe(10) })
    it('converts 3.5 to 7', () => { expect(toDbSmallint(3.5)).toBe(7) })
  })

  describe('fromDbSmallint', () => {
    it('converts 2 to 1.0', () => { expect(fromDbSmallint(2)).toBe(1) })
    it('converts 10 to 5.0', () => { expect(fromDbSmallint(10)).toBe(5) })
  })
})

// lib/validation/rating.ts
describe('UpsertRatingCommandSchema', () => {
  it('accepts valid rating payload', () => {
    const result = UpsertRatingCommandSchema.safeParse({
      main: 3.5, strength: 4, acidity: 2.5, aftertaste: 3
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid rating value (1.3)', () => {
    const result = UpsertRatingCommandSchema.safeParse({
      main: 1.3, strength: 4, acidity: 2.5, aftertaste: 3
    })
    expect(result.success).toBe(false)
  })

  it('rejects rating below 1', () => {
    const result = UpsertRatingCommandSchema.safeParse({
      main: 0.5, strength: 4, acidity: 2.5, aftertaste: 3
    })
    expect(result.success).toBe(false)
  })

  it('rejects extra fields (strict mode)', () => {
    const result = UpsertRatingCommandSchema.safeParse({
      main: 3, strength: 3, acidity: 3, aftertaste: 3, extra: 'field'
    })
    expect(result.success).toBe(false)
  })
})
```

### 3.2 Testy integracyjne API

**Cel:** Weryfikacja poprawności współdziałania endpointów API z warstwą serwisów i bazą danych.

**Zakres:**
- Wszystkie endpointy REST API
- Middleware autentykacji
- Obsługa błędów i kodów HTTP
- Walidacja request/response

**Scenariusze dla `/api/coffees/[id]/my-rating`:**

| ID | Scenariusz | Metoda | Oczekiwany status | Oczekiwana odpowiedź |
|----|------------|--------|-------------------|----------------------|
| R-001 | Brak tokena autoryzacji | GET | 401 | `{ code: 'unauthorized', message: 'Missing access token' }` |
| R-002 | Nieprawidłowy token | GET | 401 | `{ code: 'unauthorized', message: 'Invalid access token' }` |
| R-003 | Nieprawidłowe UUID kawy | GET | 400 | `{ code: 'validation_failed', message: 'Invalid id' }` |
| R-004 | Kawa nie istnieje | GET | 404 | `{ code: 'coffee_not_found', message: 'Coffee not found' }` |
| R-005 | Brak oceny użytkownika | GET | 204 | Pusta odpowiedź |
| R-006 | Istniejąca ocena | GET | 200 | `MyRatingDto` |
| R-007 | Nieprawidłowy JSON body | PUT | 400 | `{ code: 'validation_failed', message: 'Invalid JSON body' }` |
| R-008 | Nieprawidłowa wartość oceny | PUT | 400 | `{ code: 'validation_failed', message: 'Invalid rating payload' }` |
| R-009 | Pierwsza ocena (create) | PUT | 201 | `MyRatingDto` z `createdAt === updatedAt` |
| R-010 | Aktualizacja oceny | PUT | 200 | `MyRatingDto` z `createdAt !== updatedAt` |

**Scenariusze dla `/api/auth/login`:**

| ID | Scenariusz | Oczekiwany status | Oczekiwany kod błędu |
|----|------------|-------------------|----------------------|
| A-001 | Prawidłowe dane logowania | 200 | - |
| A-002 | Nieprawidłowy email | 401 | `invalid_credentials` |
| A-003 | Nieprawidłowe hasło | 401 | `invalid_credentials` |
| A-004 | Email niepotwierdzony | 403 | `email_not_confirmed` |
| A-005 | Zbyt wiele prób | 429 | `too_many_requests` |
| A-006 | Brakujące pole email | 400 | `validation_failed` |
| A-007 | Nieprawidłowy format email | 400 | `validation_failed` |

**Scenariusze dla `/api/roasteries`:**

| ID | Scenariusz | Metoda | Oczekiwany status |
|----|------------|--------|-------------------|
| RO-001 | Lista palarni bez filtrów | GET | 200 |
| RO-002 | Lista palarni z filtrem nazwy | GET | 200 |
| RO-003 | Lista palarni z filtrem miasta | GET | 200 |
| RO-004 | Paginacja listy palarni | GET | 200 |
| RO-005 | Tworzenie palarni (zalogowany) | POST | 201 |
| RO-006 | Tworzenie palarni (niezalogowany) | POST | 401 |
| RO-007 | Duplikat palarni (nazwa+miasto) | POST | 409 |

### 3.3 Testy komponentów (Component Tests)

**Cel:** Weryfikacja renderowania i interakcji komponentów React w izolacji.

**Narzędzie:** Vitest + React Testing Library

**Scenariusze dla `LoginForm`:**

| ID | Scenariusz | Oczekiwany rezultat |
|----|------------|---------------------|
| LF-001 | Renderowanie formularza | Widoczne pola email, hasło, przycisk submit |
| LF-002 | Walidacja pustego email | Wyświetlenie błędu "Adres email jest wymagany" |
| LF-003 | Walidacja nieprawidłowego email | Wyświetlenie błędu "Podaj prawidłowy adres email" |
| LF-004 | Walidacja krótkiego hasła | Wyświetlenie błędu "Hasło musi mieć minimum 8 znaków" |
| LF-005 | Submit z prawidłowymi danymi | Wywołanie API, wyświetlenie loadera |
| LF-006 | Błąd logowania 401 | Wyświetlenie alertu "Nieprawidłowy adres email lub hasło" |
| LF-007 | Błąd sieci | Wyświetlenie alertu o błędzie połączenia |
| LF-008 | Link do rejestracji | Nawigacja do `/auth/register` |
| LF-009 | Link do odzyskiwania hasła | Nawigacja do `/auth/forgot-password` |

**Scenariusze dla `RateCoffeeForm`:**

| ID | Scenariusz | Oczekiwany rezultat |
|----|------------|---------------------|
| RC-001 | Renderowanie z pustą oceną | Slidery ustawione na domyślną wartość 3 |
| RC-002 | Renderowanie z istniejącą oceną | Slidery ustawione na wartości z `existingRating` |
| RC-003 | Zmiana wartości slidera | Aktualizacja stanu formularza |
| RC-004 | Submit nowej oceny | Wywołanie PUT, status 201, callback `onSuccess` |
| RC-005 | Submit aktualizacji oceny | Wywołanie PUT, status 200, callback `onSuccess` |
| RC-006 | Błąd 401 - sesja wygasła | Alert + przekierowanie do logowania |
| RC-007 | Błąd 404 - kawa nie istnieje | Alert "Kawa nie została znaleziona" |
| RC-008 | Wyświetlanie loadera podczas submit | Przycisk nieaktywny, animacja |

**Scenariusze dla `AccountPage`:**

| ID | Scenariusz | Oczekiwany rezultat |
|----|------------|---------------------|
| AP-001 | Stan ładowania | Wyświetlenie loadera i tekstu "Ładowanie profilu..." |
| AP-002 | Stan niezalogowany | Przekierowanie do `/login?returnTo=/account` |
| AP-003 | Stan błędu | Wyświetlenie alertu z komunikatem błędu |
| AP-004 | Stan zalogowany | Wyświetlenie sekcji profilu, sesji i danger zone |
| AP-005 | Kliknięcie wyloguj | Wywołanie `handleLogout`, wyświetlenie loadera |
| AP-006 | Otwarcie dialogu usunięcia konta | Wyświetlenie `DeleteAccountDialog` |
| AP-007 | Potwierdzenie usunięcia konta | Wywołanie `handleDeleteAccount` |

### 3.4 Testy End-to-End (E2E)

**Cel:** Weryfikacja kompletnych przepływów użytkownika w rzeczywistym środowisku przeglądarki.

**Narzędzie:** Playwright

**Przepływ 1: Rejestracja i pierwsze logowanie**

```gherkin
Feature: Rejestracja użytkownika

  Scenario: Pomyślna rejestracja nowego użytkownika
    Given jestem na stronie rejestracji "/auth/register"
    When wprowadzam email "test@example.com"
    And wprowadzam hasło "SecurePass123"
    And klikam przycisk "Zarejestruj się"
    Then widzę komunikat o wysłaniu emaila weryfikacyjnego
    
  Scenario: Rejestracja z istniejącym emailem
    Given istnieje użytkownik z emailem "existing@example.com"
    And jestem na stronie rejestracji
    When wprowadzam email "existing@example.com"
    And wprowadzam hasło "SecurePass123"
    And klikam przycisk "Zarejestruj się"
    Then widzę błąd "Ten adres email jest już zarejestrowany"
```

**Przepływ 2: Logowanie i ustawienie nazwy wyświetlanej**

```gherkin
Feature: Logowanie i onboarding

  Scenario: Logowanie użytkownika bez nazwy wyświetlanej
    Given jestem zarejestrowanym użytkownikiem bez display_name
    And jestem na stronie logowania "/auth/login"
    When wprowadzam prawidłowe dane logowania
    And klikam przycisk "Zaloguj się"
    Then zostaję przekierowany do "/account/display-name"
    
  Scenario: Ustawienie nazwy wyświetlanej
    Given jestem zalogowany i jestem na stronie ustawienia nazwy
    When wprowadzam nazwę "JanKawiarz"
    And klikam przycisk "Zapisz"
    Then zostaję przekierowany do strony głównej
    And moja nazwa wyświetlana to "JanKawiarz"
```

**Przepływ 3: Przeglądanie i ocenianie kaw**

```gherkin
Feature: Ocenianie kawy

  Scenario: Przeglądanie listy kaw i dodanie oceny
    Given jestem zalogowany jako użytkownik z display_name
    When przechodzę do "/coffees"
    Then widzę listę kaw posortowaną według oceny
    When klikam na pierwszą kawę
    Then widzę szczegóły kawy
    When klikam przycisk "Oceń"
    Then widzę formularz oceny z 4 sliderami
    When ustawiam ocenę główną na 4.5
    And ustawiam moc na 3
    And ustawiam kwasowość na 2.5
    And ustawiam posmak na 4
    And klikam przycisk "Zapisz ocenę"
    Then widzę komunikat o zapisaniu oceny
    And jestem przekierowany do szczegółów kawy
    
  Scenario: Edycja istniejącej oceny
    Given już oceniłem kawę "Ethiopia Yirgacheffe"
    When przechodzę do strony oceny tej kawy
    Then widzę formularz z moimi poprzednimi wartościami
    When zmieniam ocenę główną na 5
    And klikam przycisk "Zaktualizuj ocenę"
    Then widzę komunikat o zaktualizowaniu oceny
```

**Przepływ 4: Zarządzanie palarniami i kawami**

```gherkin
Feature: Dodawanie palarni i kaw

  Scenario: Dodanie nowej palarni
    Given jestem zalogowany
    When przechodzę do "/roasteries/new"
    And wprowadzam nazwę "Kawa Rzeszów"
    And wprowadzam miasto "Rzeszów"
    And klikam przycisk "Dodaj palarnię"
    Then widzę szczegóły nowej palarni
    
  Scenario: Dodanie kawy do palarni
    Given istnieje palarnia "Kawa Rzeszów"
    And jestem zalogowany
    When przechodzę do strony palarni
    And klikam przycisk "Dodaj kawę"
    And wprowadzam nazwę "Burundi Natural"
    And klikam przycisk "Dodaj kawę"
    Then widzę kawę "Burundi Natural" na liście kaw palarni
```

**Przepływ 5: Usunięcie konta**

```gherkin
Feature: Usunięcie konta

  Scenario: Pomyślne usunięcie konta
    Given jestem zalogowany
    When przechodzę do "/account"
    And klikam przycisk "Usuń konto"
    Then widzę dialog potwierdzenia
    When klikam przycisk "Tak, usuń konto"
    Then zostaję wylogowany
    And zostaję przekierowany do strony logowania
    And nie mogę się zalogować starymi danymi
```

### 3.5 Testy bezpieczeństwa

**Cel:** Weryfikacja mechanizmów bezpieczeństwa aplikacji.

**Obszary testowania:**

| Kategoria | Scenariusze testowe |
|-----------|---------------------|
| **Autentykacja** | Próba dostępu do chronionych endpointów bez tokena |
| | Próba użycia wygasłego tokena |
| | Próba użycia sfałszowanego tokena |
| | Brute-force protection (rate limiting) |
| **Autoryzacja** | IDOR - próba odczytu cudzych ocen |
| | Próba modyfikacji cudzego profilu |
| | Próba usunięcia cudzego konta |
| **Walidacja wejścia** | SQL Injection przez parametry URL |
| | XSS przez nazwy palarni/kaw |
| | Przekroczenie limitów znaków |
| | Nieprawidłowe typy danych |
| **Sesja** | Sprawdzenie HttpOnly i Secure flag cookies |
| | Walidacja SameSite policy |

**Przykładowe testy bezpieczeństwa:**

```typescript
describe('Security - Authorization', () => {
  it('prevents accessing other user ratings via IDOR', async () => {
    // User A creates a rating
    const userAToken = await loginAsUser('userA@test.com')
    const coffeeId = 'uuid-coffee-1'
    await createRating(userAToken, coffeeId, { main: 4, strength: 3, acidity: 2, aftertaste: 3 })
    
    // User B tries to access User A's rating directly
    const userBToken = await loginAsUser('userB@test.com')
    const response = await fetch(`/api/coffees/${coffeeId}/my-rating`, {
      headers: { Authorization: `Bearer ${userBToken}` }
    })
    
    // Should return 204 (no rating for User B) not User A's rating
    expect(response.status).toBe(204)
  })

  it('blocks access to protected endpoints without authentication', async () => {
    const protectedEndpoints = [
      { method: 'PUT', url: '/api/coffees/uuid/my-rating' },
      { method: 'POST', url: '/api/roasteries' },
      { method: 'PUT', url: '/api/profiles/me/display-name' },
      { method: 'DELETE', url: '/api/account' },
    ]

    for (const endpoint of protectedEndpoints) {
      const response = await fetch(endpoint.url, { method: endpoint.method })
      expect(response.status).toBe(401)
    }
  })
})
```

### 3.6 Testy dostępności (Accessibility)

**Cel:** Zapewnienie zgodności z WCAG 2.1 poziom AA.

**Obszary testowania:**

| Kryterium WCAG | Opis | Metoda weryfikacji |
|----------------|------|-------------------|
| 1.1.1 Non-text Content | Alternatywny tekst dla obrazów | Automated + Manual |
| 1.3.1 Info and Relationships | Poprawna struktura formularzy (label, aria) | Automated |
| 1.4.3 Contrast | Kontrast tekstu min. 4.5:1 | Automated |
| 2.1.1 Keyboard | Dostępność wszystkich funkcji z klawiatury | Manual |
| 2.4.3 Focus Order | Logiczna kolejność focusu | Manual |
| 2.4.7 Focus Visible | Widoczny wskaźnik focusu | Manual |
| 3.3.1 Error Identification | Identyfikacja błędów formularzy | Automated |
| 3.3.2 Labels or Instructions | Etykiety dla pól formularzy | Automated |
| 4.1.2 Name, Role, Value | Poprawne atrybuty ARIA | Automated |

**Narzędzia:**
- axe-core (automatyczne skanowanie)
- Lighthouse Accessibility Audit
- NVDA/VoiceOver (testy manualne)

---

## 4. Środowisko testowe

### 4.1 Środowiska

| Środowisko | Cel | Baza danych | URL |
|------------|-----|-------------|-----|
| **Local** | Rozwój i testy jednostkowe | Supabase Local (Docker) | `http://localhost:4321` |
| **Test** | Testy integracyjne i E2E | Supabase Cloud (projekt testowy) | `https://test.przekawowani.pl` |
| **Staging** | Testy UAT i pre-release | Supabase Cloud (staging) | `https://staging.przekawowani.pl` |
| **Production** | Testy smoke po deploymencie | Supabase Cloud (production) | `https://przekawowani.pl` |

### 4.2 Konfiguracja środowiska lokalnego

```bash
# Wymagane narzędzia
Node.js 20+ (zgodnie z .nvmrc)
Docker Desktop (dla Supabase Local)
Git

# Instalacja zależności
npm install

# Uruchomienie Supabase lokalnie
npx supabase start

# Uruchomienie testów
npm run test          # Testy jednostkowe/integracyjne
npm run test:watch    # Testy w trybie watch

# Uruchomienie serwera deweloperskiego
npm run dev
```

### 4.3 Zmienne środowiskowe dla testów

```env
# .env.test
SUPABASE_URL=http://localhost:54321
SUPABASE_KEY=eyJ... (local anon key)
PUBLIC_SUPABASE_URL=http://localhost:54321
PUBLIC_SUPABASE_ANON_KEY=eyJ...
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=TestPassword123
```

### 4.4 Dane testowe

**Seedowanie bazy danych:**

```sql
-- Dane testowe dla środowiska test/staging
INSERT INTO auth.users (id, email) VALUES 
  ('11111111-1111-1111-1111-111111111111', 'tester1@test.com'),
  ('22222222-2222-2222-2222-222222222222', 'tester2@test.com');

INSERT INTO public.profiles (user_id, display_name) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Tester1'),
  ('22222222-2222-2222-2222-222222222222', 'Tester2');

INSERT INTO public.roasteries (id, name, city) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Palarnia Testowa', 'Warszawa'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Kawa Premium', 'Kraków');

INSERT INTO public.coffees (id, roastery_id, name) VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Ethiopia Test'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Colombia Test');
```

---

## 5. Narzędzia do testowania

### 5.1 Framework testowy

| Narzędzie | Wersja | Zastosowanie |
|-----------|--------|--------------|
| **Vitest** | ^2.1.5 | Testy jednostkowe, integracyjne, komponenty |
| **Playwright** | latest | Testy E2E |
| **React Testing Library** | latest | Renderowanie i testowanie komponentów React |

### 5.2 Biblioteki pomocnicze

| Biblioteka | Zastosowanie |
|------------|--------------|
| `@testing-library/jest-dom` | Dodatkowe matchery dla DOM |
| `@testing-library/user-event` | Symulacja interakcji użytkownika |
| `msw` (Mock Service Worker) | Mockowanie API w testach komponentów |
| `axe-core` | Automatyczne testy dostępności |

### 5.3 Narzędzia CI/CD

| Narzędzie | Zastosowanie |
|-----------|--------------|
| **GitHub Actions** | Automatyczne uruchamianie testów |
| **ESLint** | Statyczna analiza kodu |
| **Prettier** | Formatowanie kodu |
| **Husky** | Pre-commit hooks |

### 5.4 Przykładowa konfiguracja Vitest

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: ['node_modules', 'tests', '**/*.d.ts'],
    },
    globals: true,
  },
  resolve: {
    alias: {
      '@': './src',
    },
  },
})
```

### 5.5 Przykładowa konfiguracja Playwright

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html'], ['json', { outputFile: 'test-results.json' }]],
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 12'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
  },
})
```

---

## 6. Harmonogram testów

### 6.1 Fazy testowania

| Faza | Typ testów | Częstotliwość | Odpowiedzialny |
|------|------------|---------------|----------------|
| **Rozwój** | Jednostkowe, Integracyjne API | Przy każdym commit (CI) | Deweloper |
| **Code Review** | Testy regresji | Przy każdym PR | Reviewer |
| **Sprint** | E2E, Dostępność | Koniec sprintu | QA |
| **Release** | Smoke, UAT | Przed każdym release | QA + PO |
| **Post-deployment** | Smoke | Po każdym deploy na prod | DevOps |

### 6.2 Pipeline CI/CD

```yaml
# .github/workflows/test.yml
name: Test Pipeline

on:
  push:
    branches: [master, develop]
  pull_request:
    branches: [master]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: '.nvmrc'
      - run: npm ci
      - run: npm run lint

  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: '.nvmrc'
      - run: npm ci
      - run: npm run test -- --coverage
      - uses: codecov/codecov-action@v3

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: '.nvmrc'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run build
      - run: npx playwright test
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## 7. Kryteria akceptacji testów

### 7.1 Kryteria wejścia (Entry Criteria)

- Kod źródłowy jest dostępny w repozytorium
- Środowisko testowe jest skonfigurowane i dostępne
- Dane testowe są przygotowane
- Dokumentacja API jest aktualna
- Build aplikacji przechodzi pomyślnie

### 7.2 Kryteria wyjścia (Exit Criteria)

| Typ testów | Kryterium akceptacji |
|------------|---------------------|
| **Jednostkowe** | 100% testów przechodzi, pokrycie kodu ≥ 80% |
| **Integracyjne API** | 100% testów przechodzi dla wszystkich endpointów |
| **Komponenty** | 100% testów przechodzi dla komponentów krytycznych |
| **E2E** | 100% przepływów krytycznych przechodzi |
| **Bezpieczeństwa** | Brak błędów o priorytecie krytycznym/wysokim |
| **Dostępności** | Brak naruszeń WCAG 2.1 AA |

### 7.3 Metryki jakości

| Metryka | Cel | Metoda pomiaru |
|---------|-----|----------------|
| Pokrycie kodu | ≥ 80% | Vitest coverage |
| Wskaźnik defektów | < 1 bug/100 LOC | JIRA/GitHub Issues |
| Czas wykonania testów | < 10 min (CI) | GitHub Actions |
| Flaky tests | < 2% | Monitoring CI |

---

## 8. Role i odpowiedzialności

### 8.1 Macierz RACI

| Aktywność | Deweloper | QA | Tech Lead | PO |
|-----------|-----------|-----|-----------|-----|
| Pisanie testów jednostkowych | R | C | A | I |
| Pisanie testów integracyjnych | R | R | A | I |
| Pisanie testów E2E | C | R | A | I |
| Code review testów | R | R | A | I |
| Utrzymanie środowiska testowego | C | R | A | I |
| Raportowanie błędów | R | R | I | C |
| Priorytetyzacja błędów | C | C | R | A |
| Testy UAT | I | C | I | R |
| Decyzja o release | I | C | R | A |

**Legenda:** R - Responsible, A - Accountable, C - Consulted, I - Informed

### 8.2 Opis ról

**Deweloper:**
- Pisze testy jednostkowe dla własnego kodu
- Utrzymuje pokrycie kodu na wymaganym poziomie
- Naprawia błędy zgłoszone przez QA
- Uczestniczy w code review testów

**QA Engineer:**
- Projektuje i wykonuje testy integracyjne i E2E
- Zarządza środowiskiem testowym
- Raportuje i śledzi błędy
- Weryfikuje poprawki błędów

**Tech Lead:**
- Definiuje strategię testowania
- Zatwierdza plany testów
- Podejmuje decyzje techniczne dotyczące narzędzi
- Monitoruje jakość kodu i metryki testów

**Product Owner:**
- Definiuje kryteria akceptacji dla funkcjonalności
- Uczestniczy w testach UAT
- Podejmuje decyzje o priorytetach błędów
- Zatwierdza release

---

## 9. Procedury raportowania błędów

### 9.1 Szablon zgłoszenia błędu

```markdown
## Tytuł
[Komponent/Endpoint] Krótki opis problemu

## Środowisko
- Przeglądarka: Chrome 120 / Firefox 121 / Safari 17
- System: Windows 11 / macOS Sonoma / Ubuntu 22.04
- Środowisko: Local / Test / Staging / Production
- Wersja aplikacji: [commit hash lub tag]

## Kroki reprodukcji
1. Przejdź do strony...
2. Kliknij przycisk...
3. Wprowadź wartość...

## Oczekiwany rezultat
Opis tego, co powinno się wydarzyć.

## Rzeczywisty rezultat
Opis tego, co faktycznie się dzieje.

## Dowody
- [ ] Screenshot
- [ ] Nagranie ekranu
- [ ] Logi konsoli
- [ ] Network trace

## Priorytet
- [ ] Krytyczny (blokuje kluczową funkcjonalność)
- [ ] Wysoki (znaczący wpływ na użyteczność)
- [ ] Średni (obejście dostępne)
- [ ] Niski (kosmetyczny, UX)

## Dodatkowe informacje
Wszelkie inne istotne informacje.
```

### 9.2 Klasyfikacja priorytetów

| Priorytet | Czas reakcji | Czas naprawy | Przykład |
|-----------|--------------|--------------|----------|
| **Krytyczny** | 1h | 4h | Niemożność logowania, utrata danych |
| **Wysoki** | 4h | 24h | Błąd przy zapisie oceny, nieprawidłowe obliczenia |
| **Średni** | 24h | Sprint | Błąd walidacji, problem z UI |
| **Niski** | Sprint | Backlog | Literówka, drobne UX |

### 9.3 Workflow błędu

```
[Nowy] → [W analizie] → [Potwierdzony] → [W naprawie] → [Do weryfikacji] → [Zamknięty]
                ↓                                               ↓
           [Odrzucony]                                    [Ponownie otwarty]
```

### 9.4 Narzędzia do śledzenia błędów

- **GitHub Issues** - zgłaszanie i śledzenie błędów
- **GitHub Projects** - zarządzanie backlogiem błędów
- **Labels:**
  - `bug` - potwierdzony błąd
  - `priority:critical` / `priority:high` / `priority:medium` / `priority:low`
  - `area:api` / `area:frontend` / `area:auth` / `area:database`
  - `needs-reproduction` - wymaga więcej informacji
  - `wontfix` - nie będzie naprawiony

---

## 10. Załączniki

### 10.1 Checklist testów regresji

```markdown
## Autentykacja
- [ ] Logowanie z prawidłowymi danymi
- [ ] Logowanie z nieprawidłowym hasłem
- [ ] Rejestracja nowego użytkownika
- [ ] Reset hasła
- [ ] Wylogowanie

## Profile
- [ ] Wyświetlanie własnego profilu
- [ ] Ustawienie nazwy wyświetlanej
- [ ] Wyświetlanie cudzego profilu

## Palarnie
- [ ] Lista palarni z paginacją
- [ ] Wyszukiwanie palarni po nazwie
- [ ] Filtrowanie palarni po mieście
- [ ] Szczegóły palarni
- [ ] Dodawanie nowej palarni

## Kawy
- [ ] Lista kaw z paginacją
- [ ] Wyszukiwanie kaw
- [ ] Szczegóły kawy
- [ ] Dodawanie kawy do palarni

## Oceny
- [ ] Dodawanie nowej oceny
- [ ] Edycja istniejącej oceny
- [ ] Wyświetlanie własnej oceny

## Konto
- [ ] Wyświetlanie ustawień konta
- [ ] Usunięcie konta
```

### 10.2 Matryca śledzenia wymagań (RTM)

| ID Wymagania | Opis | Scenariusze testowe | Status |
|--------------|------|---------------------|--------|
| REQ-001 | Użytkownik może się zarejestrować | A-001 do A-007 | ✅ |
| REQ-002 | Użytkownik może się zalogować | LF-001 do LF-009 | ✅ |
| REQ-003 | Użytkownik może ocenić kawę | RC-001 do RC-008, R-001 do R-010 | ✅ |
| REQ-004 | Użytkownik może przeglądać palarnie | RO-001 do RO-007 | ✅ |
| REQ-005 | Użytkownik może dodać palarnię | RO-005, RO-006, RO-007 | ✅ |
| REQ-006 | Użytkownik może usunąć konto | AP-005 do AP-007 | ✅ |

---

## Historia zmian dokumentu

| Wersja | Data | Autor | Opis zmian |
|--------|------|-------|------------|
| 1.0 | 2026-01-28 | AI QA Engineer | Wersja inicjalna |
