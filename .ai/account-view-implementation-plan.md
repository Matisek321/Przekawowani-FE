# Plan implementacji widoku Konto / Ustawienia

## 1. Przegląd

Widok "Konto / Ustawienia" (`/account`) to strona ustawień użytkownika, która umożliwia przeglądanie podstawowych informacji o profilu oraz wykonywanie akcji związanych z sesją i kontem. Widok jest dostępny wyłącznie dla zalogowanych użytkowników i prezentuje:
- Informacje o profilu (email, display_name)
- Akcję wylogowania
- Akcję usunięcia konta (z potwierdzeniem)

Głównym celem widoku jest zapewnienie użytkownikowi kontroli nad swoim kontem w sposób bezpieczny i intuicyjny, zgodnie z wymaganiami PRD dotyczącymi możliwości usunięcia konta.

## 2. Routing widoku

- **Ścieżka**: `/account`
- **Plik strony**: `src/pages/account/index.astro`
- **Wymagania dostępu**: Zalogowany użytkownik (Auth Gate)
- **Przekierowanie dla niezalogowanych**: `/login?returnTo=/account`

## 3. Struktura komponentów

```
AccountPage (src/components/account/AccountPage.tsx)
├── LoadingState (skeleton podczas ładowania)
├── ErrorState (komunikat błędu)
└── Główna zawartość:
    ├── ProfileSection
    │   └── Card
    │       ├── CardHeader ("Profil")
    │       └── CardContent
    │           ├── ProfileField (Email - read-only)
    │           └── ProfileField (Display Name - read-only lub CTA)
    ├── SessionSection
    │   └── Card
    │       ├── CardHeader ("Sesja")
    │       └── CardContent
    │           └── LogoutButton
    └── DangerZone
        └── Card (variant: destructive border)
            ├── CardHeader ("Strefa niebezpieczna")
            └── CardContent
                ├── Opis konsekwencji usunięcia
                └── DeleteAccountButton → DeleteAccountDialog
                    └── AlertDialog (shadcn/ui)
                        ├── AlertDialogContent
                        │   ├── Tytuł i ostrzeżenie
                        │   ├── Pole potwierdzenia (wpisz "USUŃ")
                        │   └── AlertDialogFooter
                        │       ├── AlertDialogCancel
                        │       └── AlertDialogAction (Usuń konto)
```

## 4. Szczegóły komponentów

### AccountPage

- **Opis**: Główny komponent kontenerowy widoku ustawień konta. Zarządza pobieraniem danych profilu, obsługuje stany ładowania i błędów, renderuje sekcje widoku.
- **Główne elementy**: 
  - Kontener z klasą `container mx-auto max-w-2xl`
  - Nagłówek strony (h1: "Ustawienia konta")
  - Sekcje: ProfileSection, SessionSection, DangerZone
- **Obsługiwane interakcje**: Brak bezpośrednich - deleguje do komponentów dzieci
- **Obsługiwana walidacja**: Brak
- **Typy**: `AccountPageProps`, `AccountViewModel`
- **Propsy**: Brak (dane pobierane wewnętrznie przez hook)

### ProfileSection

- **Opis**: Sekcja wyświetlająca informacje o profilu użytkownika. Pokazuje email oraz display_name w trybie read-only.
- **Główne elementy**:
  - `Card` z nagłówkiem "Profil"
  - Lista pól profilu w układzie pionowym
  - Pole email (zawsze widoczne)
  - Pole display_name lub link do ustawienia nazwy
- **Obsługiwane interakcje**: Kliknięcie linku "Ustaw nazwę" (jeśli brak display_name)
- **Obsługiwana walidacja**: Brak
- **Typy**: `ProfileSectionProps`
- **Propsy**:
  - `email: string` - adres email użytkownika
  - `displayName: string | null` - nazwa wyświetlana lub null

### SessionSection

- **Opis**: Sekcja z akcjami związanymi z sesją użytkownika.
- **Główne elementy**:
  - `Card` z nagłówkiem "Sesja"
  - Przycisk wylogowania z ikoną
- **Obsługiwane interakcje**: Kliknięcie przycisku "Wyloguj się"
- **Obsługiwana walidacja**: Brak
- **Typy**: `SessionSectionProps`
- **Propsy**:
  - `onLogout: () => Promise<void>` - handler wylogowania
  - `isLoggingOut: boolean` - stan ładowania

### DangerZone

- **Opis**: Sekcja z niebezpiecznymi akcjami (usunięcie konta). Wyróżniona wizualnie czerwoną ramką.
- **Główne elementy**:
  - `Card` z czerwoną ramką (`border-destructive`)
  - Nagłówek "Strefa niebezpieczna"
  - Opis konsekwencji usunięcia konta
  - Przycisk otwierający dialog potwierdzenia
- **Obsługiwane interakcje**: Kliknięcie "Usuń konto" otwiera dialog
- **Obsługiwana walidacja**: Brak (walidacja w dialogu)
- **Typy**: `DangerZoneProps`
- **Propsy**:
  - `onDeleteAccount: () => Promise<void>` - handler usunięcia konta
  - `isDeleting: boolean` - stan ładowania

### DeleteAccountDialog

- **Opis**: Modal potwierdzenia usunięcia konta. Wymaga wpisania słowa "USUŃ" dla potwierdzenia akcji.
- **Główne elementy**:
  - `AlertDialog` (shadcn/ui)
  - Tytuł: "Usuń konto"
  - Ostrzeżenie o nieodwracalności akcji
  - Lista konsekwencji (usunięcie ocen, profilu)
  - Pole tekstowe do wpisania "USUŃ"
  - Przyciski: Anuluj, Usuń konto
- **Obsługiwane interakcje**:
  - Wpisywanie tekstu potwierdzenia
  - Kliknięcie "Anuluj" - zamknięcie dialogu
  - Kliknięcie "Usuń konto" - wykonanie usunięcia (jeśli walidacja przeszła)
- **Obsługiwana walidacja**:
  - Pole potwierdzenia musi zawierać dokładnie "USUŃ" (case-sensitive)
  - Przycisk "Usuń konto" nieaktywny do momentu poprawnej walidacji
- **Typy**: `DeleteAccountDialogProps`, `DeleteConfirmationState`
- **Propsy**:
  - `isOpen: boolean` - czy dialog jest otwarty
  - `onOpenChange: (open: boolean) => void` - handler zmiany stanu
  - `onConfirm: () => Promise<void>` - handler potwierdzenia
  - `isDeleting: boolean` - stan ładowania
  - `error: string | null` - komunikat błędu

## 5. Typy

### AccountViewModel

```typescript
type AccountViewModel = {
  status: 'loading' | 'authenticated' | 'unauthenticated' | 'error'
  email: string | null
  displayName: string | null
  errorMessage: string | null
}
```

### ProfileSectionProps

```typescript
type ProfileSectionProps = {
  email: string
  displayName: string | null
}
```

### SessionSectionProps

```typescript
type SessionSectionProps = {
  onLogout: () => Promise<void>
  isLoggingOut: boolean
}
```

### DangerZoneProps

```typescript
type DangerZoneProps = {
  onDeleteAccount: () => Promise<void>
  isDeleting: boolean
}
```

### DeleteAccountDialogProps

```typescript
type DeleteAccountDialogProps = {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
  isDeleting: boolean
  error: string | null
}
```

### DeleteConfirmationState

```typescript
type DeleteConfirmationState = {
  confirmationText: string
  isValid: boolean
}
```

### Istniejące typy wykorzystywane

- `ProfileDto` z `src/types.ts` - dla odpowiedzi API profilu

## 6. Zarządzanie stanem

### useAccountPage (custom hook)

Hook zarządzający stanem całego widoku konta:

```typescript
function useAccountPage() {
  // Stan autoryzacji z istniejącego hooka
  const { userId, accessToken, status, isLoading, isAuthenticated } = useAuthSession()
  
  // Stan profilu
  const [profile, setProfile] = useState<ProfileDto | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  
  // Stan akcji
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  
  // Stan dialogu usunięcia
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  
  // Efekt pobierania profilu
  useEffect(() => {
    // Pobierz profil po załadowaniu sesji
  }, [status, userId, accessToken])
  
  // Handler wylogowania
  const handleLogout = useCallback(async () => {
    // Wywołaj POST /api/auth/logout
    // Przekieruj do strony głównej
  }, [])
  
  // Handler usunięcia konta
  const handleDeleteAccount = useCallback(async () => {
    // Wywołaj DELETE /api/account lub Supabase Admin API
    // Po sukcesie przekieruj do strony głównej
  }, [accessToken])
  
  return {
    // Dane widoku
    viewModel: {
      status,
      email: profile?.email || null, // email z sesji auth
      displayName: profile?.displayName || null,
      errorMessage: profileError,
    },
    // Stany akcji
    isLoggingOut,
    isDeleting,
    deleteError,
    // Dialog
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    // Handlery
    handleLogout,
    handleDeleteAccount,
  }
}
```

### Stan w DeleteAccountDialog

Lokalny stan komponentu:

```typescript
const [confirmationText, setConfirmationText] = useState('')
const isValid = confirmationText === 'USUŃ'
```

## 7. Integracja API

### Pobieranie profilu

- **Endpoint**: `GET /api/profiles/{userId}`
- **Typ odpowiedzi**: `ProfileDto`
- **Nagłówki**: `Authorization: Bearer {accessToken}`
- **Obsługa błędów**:
  - 404: Profil nie istnieje (wyświetl email z sesji, displayName = null)
  - 401: Sesja wygasła → przekieruj do logowania
  - 500: Błąd serwera → wyświetl komunikat błędu

### Wylogowanie

- **Endpoint**: `POST /api/auth/logout`
- **Typ żądania**: Brak body
- **Typ odpowiedzi**: `{ success: true }` lub błąd
- **Obsługa błędów**: Niezależnie od wyniku, przekieruj do strony głównej

### Usunięcie konta

**Uwaga**: W aktualnym planie API brak dedykowanego endpointu. Wymagane jest:

**Opcja A** (rekomendowana): Utworzenie nowego endpointu API

- **Endpoint**: `DELETE /api/account`
- **Typ żądania**: Brak body
- **Nagłówki**: `Authorization: Bearer {accessToken}`
- **Typ odpowiedzi**: `{ success: true }`
- **Logika backendu**:
  1. Usuń profil użytkownika (kaskadowo usunie oceny przez FK)
  2. Wywołaj `supabase.auth.admin.deleteUser(userId)`
- **Obsługa błędów**:
  - 401: Nieautoryzowany
  - 500: Błąd serwera

**Opcja B**: Bezpośrednie wywołanie Supabase Auth (jeśli dostępne po stronie klienta)

- Użyj `supabase.auth.admin.deleteUser()` (wymaga service_role)
- Nie rekomendowane z powodów bezpieczeństwa

## 8. Interakcje użytkownika

### Przeglądanie profilu
1. Użytkownik wchodzi na `/account`
2. System sprawdza autoryzację
3. Jeśli niezalogowany → przekierowanie do `/login?returnTo=/account`
4. Jeśli zalogowany → pobierz profil i wyświetl dane

### Wylogowanie
1. Użytkownik klika "Wyloguj się"
2. Przycisk pokazuje stan ładowania (spinner)
3. System wywołuje `POST /api/auth/logout`
4. Przekierowanie do strony głównej (`/`)

### Usunięcie konta
1. Użytkownik klika "Usuń konto"
2. Otwiera się dialog potwierdzenia
3. Użytkownik czyta ostrzeżenie o konsekwencjach
4. Użytkownik wpisuje "USUŃ" w pole potwierdzenia
5. Przycisk "Usuń konto" staje się aktywny
6. Użytkownik klika "Usuń konto"
7. Przycisk pokazuje stan ładowania
8. System wywołuje `DELETE /api/account`
9. Po sukcesie: przekierowanie do strony głównej z komunikatem
10. Po błędzie: wyświetl komunikat w dialogu

### Ustawienie display_name (jeśli brak)
1. Użytkownik widzi informację "Nie ustawiono nazwy wyświetlanej"
2. Użytkownik klika link "Ustaw nazwę"
3. Przekierowanie do `/account/display-name?returnTo=/account`

## 9. Warunki i walidacja

### Walidacja potwierdzenia usunięcia konta

| Warunek | Komponent | Wpływ na UI |
|---------|-----------|-------------|
| `confirmationText === 'USUŃ'` | DeleteAccountDialog | Aktywuje przycisk "Usuń konto" |
| `confirmationText !== 'USUŃ'` | DeleteAccountDialog | Przycisk "Usuń konto" nieaktywny |

### Warunki dostępu

| Warunek | Sprawdzenie | Akcja |
|---------|-------------|-------|
| Brak sesji | `status === 'unauthenticated'` | Przekieruj do `/login?returnTo=/account` |
| Sesja wygasła (401 z API) | Odpowiedź API | Przekieruj do `/login?returnTo=/account` |

### Stany przycisków

| Przycisk | Warunek aktywności | Stan ładowania |
|----------|-------------------|----------------|
| Wyloguj się | Zawsze aktywny (gdy nie trwa wylogowanie) | `isLoggingOut` |
| Usuń konto (w dialogu) | `confirmationText === 'USUŃ' && !isDeleting` | `isDeleting` |

## 10. Obsługa błędów

### Błędy pobierania profilu

| Kod HTTP | Przyczyna | Obsługa |
|----------|-----------|---------|
| 404 | Profil nie istnieje | Wyświetl dane z sesji, displayName = null |
| 401 | Sesja wygasła | Przekieruj do `/login?returnTo=/account` |
| 500 | Błąd serwera | Wyświetl komunikat: "Nie udało się pobrać danych profilu" |
| Network error | Brak połączenia | Wyświetl komunikat: "Sprawdź połączenie internetowe" |

### Błędy wylogowania

Wszystkie błędy są obsługiwane przez przekierowanie do strony głównej - użytkownik oczekuje wylogowania.

### Błędy usunięcia konta

| Kod HTTP | Przyczyna | Obsługa |
|----------|-----------|---------|
| 401 | Sesja wygasła | Zamknij dialog, przekieruj do logowania |
| 500 | Błąd serwera | Wyświetl w dialogu: "Nie udało się usunąć konta. Spróbuj ponownie." |
| Network error | Brak połączenia | Wyświetl w dialogu: "Sprawdź połączenie internetowe" |

### Komunikaty błędów

```typescript
const ERROR_MESSAGES = {
  profileLoadFailed: 'Nie udało się pobrać danych profilu. Odśwież stronę i spróbuj ponownie.',
  sessionExpired: 'Sesja wygasła. Zaloguj się ponownie.',
  deleteAccountFailed: 'Nie udało się usunąć konta. Spróbuj ponownie później.',
  networkError: 'Błąd połączenia. Sprawdź połączenie internetowe i spróbuj ponownie.',
}
```

## 11. Kroki implementacji

### Krok 1: Dodanie komponentu AlertDialog z shadcn/ui

```bash
npx shadcn@latest add alert-dialog
```

### Krok 2: Utworzenie endpointu API do usunięcia konta

Plik: `src/pages/api/account.ts`

```typescript
// DELETE /api/account
// 1. Pobierz użytkownika z sesji
// 2. Usuń profil użytkownika (kaskadowo usunie oceny)
// 3. Usuń użytkownika z Supabase Auth
// 4. Zwróć sukces
```

### Krok 3: Implementacja hooka useAccountPage

Plik: `src/components/account/useAccountPage.ts`

1. Wykorzystaj istniejący `useAuthSession`
2. Dodaj logikę pobierania profilu
3. Dodaj handlery dla wylogowania i usunięcia konta
4. Zarządzaj stanem dialogu

### Krok 4: Implementacja DeleteAccountDialog

Plik: `src/components/account/DeleteAccountDialog.tsx`

1. Użyj AlertDialog z shadcn/ui
2. Zaimplementuj pole potwierdzenia z walidacją
3. Obsłuż stany ładowania i błędów

### Krok 5: Implementacja sekcji widoku

Pliki:
- `src/components/account/ProfileSection.tsx`
- `src/components/account/SessionSection.tsx`
- `src/components/account/DangerZone.tsx`

### Krok 6: Implementacja głównego komponentu AccountPage

Plik: `src/components/account/AccountPage.tsx`

1. Użyj hooka `useAccountPage`
2. Obsłuż stany ładowania, błędów i autoryzacji
3. Złóż sekcje widoku

### Krok 7: Utworzenie strony Astro

Plik: `src/pages/account/index.astro`

```astro
---
import Layout from '@/layouts/Layout.astro'
import { AccountPage } from '@/components/account/AccountPage'

export const prerender = false
---

<Layout title="Ustawienia konta">
  <AccountPage client:load />
</Layout>
```

### Krok 8: Aktualizacja nawigacji w AuthButton

Dodaj link do `/account` w menu dropdown dla zalogowanych użytkowników.

### Krok 9: Testowanie

1. Test wyświetlania profilu (z display_name i bez)
2. Test wylogowania
3. Test usunięcia konta (walidacja, sukces, błędy)
4. Test przekierowań dla niezalogowanych
5. Test obsługi błędów sieciowych

### Krok 10: Dostosowanie stylów i UX

1. Dodaj odpowiednie ikony (lucide-react)
2. Upewnij się, że strefa niebezpieczna jest wyraźnie wyróżniona
3. Sprawdź responsywność na różnych rozdzielczościach
