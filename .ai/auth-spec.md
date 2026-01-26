# Specyfikacja Techniczna Modułu Autentykacji - Przekawowani

## 1. Wprowadzenie

Niniejsza specyfikacja opisuje architekturę modułu rejestracji, logowania, wylogowania i odzyskiwania hasła dla aplikacji Przekawowani. Moduł jest oparty na wymaganiach US-001 z dokumentu PRD oraz wykorzystuje Supabase Auth jako backend autentykacji.

### 1.1. Wymagania źródłowe (US-001)

- Logowanie i rejestracja na dedykowanych stronach
- Logowanie wymaga adresu email i hasła
- Rejestracja wymaga adresu email, hasła i potwierdzenia hasła
- Przycisk logowania/wylogowania w prawym górnym rogu głównego layoutu
- Brak zewnętrznych serwisów logowania (Google, GitHub itp.)
- Odzyskiwanie hasła musi być możliwe
- Zalogowany użytkownik może: tworzyć palarnie, kawy, oceny oraz korzystać z kolekcji
- Niezalogowany użytkownik nie może przeglądać listy palarni i kaw

---

## 2. Architektura Interfejsu Użytkownika

### 2.1. Nowe strony Astro

#### 2.1.1. `/src/pages/auth/login.astro`

**Opis:** Strona logowania użytkownika.

**Odpowiedzialności:**
- Renderowanie layoutu autentykacji (`AuthLayout.astro`)
- Osadzanie komponentu React `LoginForm`
- Przekierowanie zalogowanego użytkownika na stronę główną (guard server-side)

**Server-side guard:**
```
Jeśli użytkownik jest zalogowany → redirect do "/"
```

#### 2.1.2. `/src/pages/auth/register.astro`

**Opis:** Strona rejestracji nowego użytkownika.

**Odpowiedzialności:**
- Renderowanie layoutu autentykacji
- Osadzanie komponentu React `RegisterForm`
- Przekierowanie zalogowanego użytkownika (guard server-side)

#### 2.1.3. `/src/pages/auth/forgot-password.astro`

**Opis:** Strona inicjowania odzyskiwania hasła.

**Odpowiedzialności:**
- Renderowanie layoutu autentykacji
- Osadzanie komponentu React `ForgotPasswordForm`
- Obsługa wysyłki e-maila z linkiem resetującym

#### 2.1.4. `/src/pages/auth/reset-password.astro`

**Opis:** Strona ustawiania nowego hasła po kliknięciu linku z e-maila.

**Odpowiedzialności:**
- Walidacja tokena z URL (query param lub hash)
- Renderowanie komponentu React `ResetPasswordForm`
- Przekierowanie po pomyślnym zresetowaniu hasła

#### 2.1.5. `/src/pages/auth/callback.astro`

**Opis:** Strona callback do obsługi przekierowań z Supabase Auth.

**Odpowiedzialności:**
- Obsługa tokenów z URL hash (po weryfikacji e-mail, resecie hasła)
- Wymiana code na sesję (jeśli PKCE flow)
- Przekierowanie do odpowiedniej strony docelowej

---

### 2.2. Nowe layouty Astro

#### 2.2.1. `/src/layouts/AuthLayout.astro`

**Opis:** Dedykowany layout dla stron autentykacji (login, register, forgot-password, reset-password).

**Charakterystyka:**
- Minimalistyczny wygląd bez głównej nawigacji
- Centrowanie formularza na stronie
- Link powrotny do strony głównej
- Wspólne style dla stron auth

**Props:**
- `title: string` - tytuł strony

#### 2.2.2. Rozszerzenie `/src/layouts/Layout.astro`

**Zmiany:**
- Dodanie sekcji nagłówka z nawigacją
- Warunkowe renderowanie przycisku "Zaloguj się" / "Wyloguj się" w prawym górnym rogu
- Opcjonalne wyświetlanie display_name lub email zalogowanego użytkownika

**Nowe props:**
- `user?: User | null` - informacja o zalogowanym użytkowniku

---

### 2.3. Nowe komponenty React

#### 2.3.1. `/src/components/auth/LoginForm.tsx`

**Opis:** Formularz logowania jako interaktywny komponent React.

**Stan:**
- `email: string`
- `password: string`
- `isLoading: boolean`
- `error: string | null`

**Walidacja (client-side):**
- Email: wymagany, format email
- Hasło: wymagane, min. 8 znaków

**Komunikaty błędów:**
| Kod błędu | Komunikat użytkownika |
|-----------|----------------------|
| `invalid_credentials` | Nieprawidłowy adres email lub hasło |
| `email_not_confirmed` | Adres email nie został potwierdzony. Sprawdź skrzynkę pocztową. |
| `too_many_requests` | Zbyt wiele prób logowania. Spróbuj ponownie za chwilę. |
| `network_error` | Błąd połączenia. Sprawdź połączenie internetowe. |

**Akcje:**
- Submit → wywołanie API `/api/auth/login` (POST)
- Link do rejestracji (`/auth/register`)
- Link do odzyskiwania hasła (`/auth/forgot-password`)

**Po sukcesie:**
- Przekierowanie do strony głównej (`/`) lub URL z query param `?returnUrl=`

#### 2.3.2. `/src/components/auth/RegisterForm.tsx`

**Opis:** Formularz rejestracji nowego użytkownika.

**Stan:**
- `email: string`
- `password: string`
- `confirmPassword: string`
- `isLoading: boolean`
- `error: string | null`
- `successMessage: string | null`

**Walidacja (client-side):**
- Email: wymagany, format email
- Hasło: wymagane, min. 8 znaków, max. 72 znaki
- Potwierdzenie hasła: musi być identyczne z hasłem

**Komunikaty błędów:**
| Kod błędu | Komunikat użytkownika |
|-----------|----------------------|
| `email_taken` | Konto z tym adresem email już istnieje |
| `weak_password` | Hasło musi mieć minimum 8 znaków |
| `passwords_mismatch` | Hasła nie są identyczne |
| `invalid_email` | Podaj prawidłowy adres email |

**Po sukcesie:**
- Wyświetlenie komunikatu o wysłaniu e-maila weryfikacyjnego
- NIE automatyczne logowanie (wymaga potwierdzenia e-mail)

#### 2.3.3. `/src/components/auth/ForgotPasswordForm.tsx`

**Opis:** Formularz wysyłki linku do resetowania hasła.

**Stan:**
- `email: string`
- `isLoading: boolean`
- `error: string | null`
- `isSubmitted: boolean`

**Walidacja:**
- Email: wymagany, format email

**Komunikaty:**
| Stan | Komunikat |
|------|-----------|
| Sukces | Jeśli konto istnieje, wyślemy link do resetowania hasła na podany adres email. |
| Błąd rate limit | Zbyt wiele prób. Spróbuj ponownie za chwilę. |

**Uwaga bezpieczeństwa:** Nie ujawniać, czy email istnieje w systemie.

#### 2.3.4. `/src/components/auth/ResetPasswordForm.tsx`

**Opis:** Formularz ustawiania nowego hasła.

**Stan:**
- `password: string`
- `confirmPassword: string`
- `isLoading: boolean`
- `error: string | null`

**Walidacja:**
- Hasło: wymagane, min. 8 znaków, max. 72 znaki
- Potwierdzenie hasła: musi być identyczne

**Komunikaty błędów:**
| Kod błędu | Komunikat użytkownika |
|-----------|----------------------|
| `invalid_token` | Link do resetowania hasła wygasł lub jest nieprawidłowy |
| `weak_password` | Hasło musi mieć minimum 8 znaków |

**Po sukcesie:**
- Przekierowanie do strony logowania z komunikatem sukcesu

#### 2.3.5. `/src/components/auth/AuthButton.tsx`

**Opis:** Komponent przycisku autentykacji do nawigacji w Layout.

**Props:**
- `user: User | null`
- `displayName?: string | null`

**Warianty:**
1. **Niezalogowany:** Przycisk "Zaloguj się" → link do `/auth/login`
2. **Zalogowany:** Dropdown z:
   - Wyświetlaniem display_name lub email
   - Przyciskiem "Wyloguj się" → wywołanie API `/api/auth/logout`

#### 2.3.6. `/src/components/ui/` - nowe komponenty Shadcn/ui

Wymagane komponenty z biblioteki Shadcn/ui:
- `Input` - pole tekstowe formularza
- `Label` - etykieta pola
- `Card`, `CardHeader`, `CardContent`, `CardFooter` - kontener formularza
- `Alert`, `AlertDescription` - komunikaty błędów i sukcesu
- `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem` - menu użytkownika

---

### 2.4. Obsługa stanu autentykacji (client-side)

#### 2.4.1. Hook `/src/lib/hooks/useAuth.ts`

**Opis:** Custom hook React do zarządzania stanem autentykacji po stronie klienta.

**Eksportowane wartości:**
- `user: User | null` - aktualny użytkownik
- `isLoading: boolean` - stan ładowania
- `signOut: () => Promise<void>` - funkcja wylogowania

**Implementacja:**
- Subskrypcja `supabase.auth.onAuthStateChange`
- Synchronizacja stanu między zakładkami przeglądarki
- Cleanup przy unmount

#### 2.4.2. Context Provider `/src/components/auth/AuthProvider.tsx`

**Opis:** React Context Provider dla stanu autentykacji.

**Wartość kontekstu:**
```typescript
type AuthContextValue = {
  user: User | null
  session: Session | null
  isLoading: boolean
  signOut: () => Promise<void>
}
```

---

### 2.5. Scenariusze użytkownika

#### 2.5.1. Rejestracja

1. Użytkownik wchodzi na `/auth/register`
2. Wypełnia formularz (email, hasło, potwierdzenie hasła)
3. Walidacja client-side → przy błędzie wyświetlenie komunikatu
4. Submit → POST `/api/auth/register`
5. Backend wywołuje `supabase.auth.signUp()`
6. Supabase wysyła e-mail weryfikacyjny
7. Użytkownik widzi komunikat o konieczności potwierdzenia e-maila
8. Użytkownik klika link w e-mailu → przekierowanie do `/auth/callback`
9. Callback przetwarza token i przekierowuje do `/`

#### 2.5.2. Logowanie

1. Użytkownik wchodzi na `/auth/login`
2. Wypełnia formularz (email, hasło)
3. Walidacja client-side
4. Submit → POST `/api/auth/login`
5. Backend wywołuje `supabase.auth.signInWithPassword()`
6. Sukces → ustawienie cookies sesji, przekierowanie do `/` lub `returnUrl`
7. Błąd → wyświetlenie komunikatu

#### 2.5.3. Wylogowanie

1. Zalogowany użytkownik klika "Wyloguj się" w nawigacji
2. Wywołanie POST `/api/auth/logout`
3. Backend wywołuje `supabase.auth.signOut()`
4. Usunięcie cookies sesji
5. Przekierowanie do `/`

#### 2.5.4. Odzyskiwanie hasła

1. Użytkownik wchodzi na `/auth/forgot-password`
2. Wpisuje adres email
3. Submit → POST `/api/auth/forgot-password`
4. Backend wywołuje `supabase.auth.resetPasswordForEmail()`
5. Wyświetlenie komunikatu (bez potwierdzenia istnienia konta)
6. Użytkownik otrzymuje e-mail z linkiem
7. Kliknięcie linku → `/auth/reset-password?token=...`
8. Użytkownik ustawia nowe hasło
9. Submit → POST `/api/auth/reset-password`
10. Sukces → przekierowanie do `/auth/login` z komunikatem

---

## 3. Logika Backendowa

### 3.1. Endpointy API

#### 3.1.1. `POST /api/auth/register`

**Opis:** Rejestracja nowego użytkownika.

**Request body:**
```typescript
type RegisterRequest = {
  email: string
  password: string
}
```

**Walidacja (Zod schema):**
```typescript
const RegisterBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
})
```

**Odpowiedzi:**
| Status | Kod | Opis |
|--------|-----|------|
| 201 | `created` | Użytkownik utworzony, e-mail weryfikacyjny wysłany |
| 400 | `validation_failed` | Błąd walidacji danych wejściowych |
| 409 | `email_taken` | Konto z tym adresem email już istnieje |
| 429 | `too_many_requests` | Rate limit |
| 500 | `internal_error` | Błąd serwera |

**Logika:**
1. Walidacja body (Zod)
2. Wywołanie `supabase.auth.signUp({ email, password })`
3. Obsługa błędów Supabase Auth
4. Zwrócenie odpowiedzi

#### 3.1.2. `POST /api/auth/login`

**Opis:** Logowanie użytkownika.

**Request body:**
```typescript
type LoginRequest = {
  email: string
  password: string
}
```

**Walidacja:**
```typescript
const LoginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})
```

**Odpowiedzi:**
| Status | Kod | Opis |
|--------|-----|------|
| 200 | - | Zalogowano pomyślnie (zwraca user + session info) |
| 400 | `validation_failed` | Błąd walidacji |
| 401 | `invalid_credentials` | Nieprawidłowe dane logowania |
| 403 | `email_not_confirmed` | E-mail nie potwierdzony |
| 429 | `too_many_requests` | Rate limit |
| 500 | `internal_error` | Błąd serwera |

**Logika:**
1. Walidacja body
2. Wywołanie `supabase.auth.signInWithPassword({ email, password })`
3. Ustawienie cookies sesji
4. Zwrócenie danych użytkownika

#### 3.1.3. `POST /api/auth/logout`

**Opis:** Wylogowanie użytkownika.

**Request body:** Brak

**Odpowiedzi:**
| Status | Kod | Opis |
|--------|-----|------|
| 200 | - | Wylogowano pomyślnie |
| 500 | `internal_error` | Błąd serwera |

**Logika:**
1. Wywołanie `supabase.auth.signOut()`
2. Usunięcie cookies sesji
3. Zwrócenie odpowiedzi

#### 3.1.4. `POST /api/auth/forgot-password`

**Opis:** Wysłanie e-maila do resetowania hasła.

**Request body:**
```typescript
type ForgotPasswordRequest = {
  email: string
}
```

**Walidacja:**
```typescript
const ForgotPasswordBodySchema = z.object({
  email: z.string().email(),
})
```

**Odpowiedzi:**
| Status | Kod | Opis |
|--------|-----|------|
| 200 | - | Żądanie przyjęte (bez potwierdzenia istnienia konta) |
| 400 | `validation_failed` | Błąd walidacji |
| 429 | `too_many_requests` | Rate limit |
| 500 | `internal_error` | Błąd serwera |

**Logika:**
1. Walidacja body
2. Wywołanie `supabase.auth.resetPasswordForEmail(email, { redirectTo })`
3. Zawsze zwracaj 200 (bezpieczeństwo - nie ujawniaj czy email istnieje)

#### 3.1.5. `POST /api/auth/reset-password`

**Opis:** Ustawienie nowego hasła.

**Request body:**
```typescript
type ResetPasswordRequest = {
  password: string
}
```

**Walidacja:**
```typescript
const ResetPasswordBodySchema = z.object({
  password: z.string().min(8).max(72),
})
```

**Odpowiedzi:**
| Status | Kod | Opis |
|--------|-----|------|
| 200 | - | Hasło zmienione pomyślnie |
| 400 | `validation_failed` | Błąd walidacji |
| 401 | `invalid_token` | Token wygasł lub nieprawidłowy |
| 500 | `internal_error` | Błąd serwera |

**Logika:**
1. Walidacja body
2. Sprawdzenie sesji (token z callback powinien już być w sesji)
3. Wywołanie `supabase.auth.updateUser({ password })`
4. Zwrócenie odpowiedzi

#### 3.1.6. `GET /api/auth/me`

**Opis:** Pobranie danych aktualnie zalogowanego użytkownika.

**Odpowiedzi:**
| Status | Kod | Opis |
|--------|-----|------|
| 200 | - | Dane użytkownika (id, email, profile) |
| 401 | `unauthorized` | Użytkownik niezalogowany |
| 500 | `internal_error` | Błąd serwera |

**Response body:**
```typescript
type MeResponse = {
  id: string
  email: string
  emailConfirmedAt: string | null
  profile: {
    displayName: string | null
    createdAt: string
  } | null
}
```

---

### 3.2. Struktura plików API

```
src/pages/api/auth/
├── register.ts      # POST /api/auth/register
├── login.ts         # POST /api/auth/login
├── logout.ts        # POST /api/auth/logout
├── forgot-password.ts  # POST /api/auth/forgot-password
├── reset-password.ts   # POST /api/auth/reset-password
└── me.ts            # GET /api/auth/me
```

---

### 3.3. Serwis autentykacji

#### 3.3.1. `/src/lib/services/auth.service.ts`

**Opis:** Warstwa serwisowa enkapsulująca logikę autentykacji Supabase.

**Eksportowane funkcje:**

```typescript
// Rejestracja użytkownika
async function registerUser(
  supabase: SupabaseClient,
  email: string,
  password: string
): Promise<{ user: User; needsEmailConfirmation: boolean }>

// Logowanie użytkownika
async function loginUser(
  supabase: SupabaseClient,
  email: string,
  password: string
): Promise<{ user: User; session: Session }>

// Wylogowanie użytkownika
async function logoutUser(
  supabase: SupabaseClient
): Promise<void>

// Wysłanie e-maila resetującego hasło
async function sendPasswordResetEmail(
  supabase: SupabaseClient,
  email: string,
  redirectUrl: string
): Promise<void>

// Aktualizacja hasła
async function updatePassword(
  supabase: SupabaseClient,
  newPassword: string
): Promise<void>

// Pobranie aktualnego użytkownika z profilem
async function getCurrentUserWithProfile(
  supabase: SupabaseClient
): Promise<{ user: User; profile: ProfileDto | null } | null>
```

**Obsługa błędów:**

Serwis rzuca dedykowane wyjątki z kodami:
- `email_taken` - adres email już zarejestrowany
- `invalid_credentials` - nieprawidłowe dane logowania
- `email_not_confirmed` - e-mail nie potwierdzony
- `weak_password` - hasło nie spełnia wymagań
- `invalid_token` - token resetowania wygasł/nieprawidłowy

---

### 3.4. Walidacja danych wejściowych

#### 3.4.1. `/src/lib/validation/auth.ts`

**Schematy Zod:**

```typescript
import { z } from 'zod'

export const RegisterBodySchema = z.object({
  email: z.string().email('Podaj prawidłowy adres email'),
  password: z
    .string()
    .min(8, 'Hasło musi mieć minimum 8 znaków')
    .max(72, 'Hasło może mieć maksymalnie 72 znaki'),
})

export const LoginBodySchema = z.object({
  email: z.string().email('Podaj prawidłowy adres email'),
  password: z.string().min(1, 'Hasło jest wymagane'),
})

export const ForgotPasswordBodySchema = z.object({
  email: z.string().email('Podaj prawidłowy adres email'),
})

export const ResetPasswordBodySchema = z.object({
  password: z
    .string()
    .min(8, 'Hasło musi mieć minimum 8 znaków')
    .max(72, 'Hasło może mieć maksymalnie 72 znaki'),
})

export type RegisterBody = z.infer<typeof RegisterBodySchema>
export type LoginBody = z.infer<typeof LoginBodySchema>
export type ForgotPasswordBody = z.infer<typeof ForgotPasswordBodySchema>
export type ResetPasswordBody = z.infer<typeof ResetPasswordBodySchema>
```

---

### 3.5. Rozszerzenie HTTP helpers

#### 3.5.1. `/src/lib/http.ts` - nowe funkcje

```typescript
export function jsonForbidden(code: string, message: string) {
  return json({ code, message }, { status: 403 })
}

export function jsonTooManyRequests(code: string, message: string) {
  return json({ code, message }, { status: 429 })
}
```

---

### 3.6. Aktualizacja middleware

#### 3.6.1. `/src/middleware/index.ts`

**Rozszerzenie odpowiedzialności:**
1. Tworzenie klienta Supabase per-request z obsługą cookies
2. Odczyt sesji z cookies i jej weryfikacja
3. Udostępnianie `user` i `session` w `context.locals`
4. Automatyczne odświeżanie sesji (refresh token)

**Nowe pola w `context.locals`:**
```typescript
interface Locals {
  supabase: SupabaseClient
  user: User | null
  session: Session | null
}
```

**Aktualizacja `env.d.ts`:**
```typescript
declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient
      user: import('@supabase/supabase-js').User | null
      session: import('@supabase/supabase-js').Session | null
    }
  }
}
```

---

### 3.7. Ochrona endpointów

#### 3.7.1. Helper do weryfikacji autentykacji

**Lokalizacja:** `/src/lib/auth-guard.ts`

```typescript
import type { APIContext } from 'astro'
import { jsonUnauthorized } from './http'

export function requireAuth(context: APIContext) {
  const user = context.locals.user
  if (!user) {
    return { authorized: false, response: jsonUnauthorized('unauthorized', 'Authentication required') }
  }
  return { authorized: true, user }
}
```

**Użycie w endpointach:**
```typescript
export const POST: APIRoute = async (context) => {
  const auth = requireAuth(context)
  if (!auth.authorized) return auth.response
  
  // ... logika wymagająca autentykacji
}
```

---

## 4. System Autentykacji

### 4.1. Konfiguracja Supabase Auth

#### 4.1.1. Klient Supabase z obsługą SSR

**Problem:** Domyślny klient Supabase nie obsługuje cookies w kontekście SSR.

**Rozwiązanie:** Wykorzystanie `@supabase/ssr` do tworzenia klienta per-request.

**Nowy plik:** `/src/db/supabase.server.ts`

```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import type { AstroCookies } from 'astro'
import type { Database } from './database.types'

export function createSupabaseServerClient(cookies: AstroCookies) {
  return createServerClient<Database>(
    import.meta.env.SUPABASE_URL,
    import.meta.env.SUPABASE_KEY,
    {
      cookies: {
        get(key: string) {
          return cookies.get(key)?.value
        },
        set(key: string, value: string, options: CookieOptions) {
          cookies.set(key, value, options)
        },
        remove(key: string, options: CookieOptions) {
          cookies.delete(key, options)
        },
      },
    }
  )
}
```

#### 4.1.2. Klient Supabase dla przeglądarki

**Nowy plik:** `/src/db/supabase.browser.ts`

```typescript
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'

export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY
  )
}
```

#### 4.1.3. Zmienne środowiskowe

**Rozszerzenie `.env`:**
```
# Server-side (existing)
SUPABASE_URL=...
SUPABASE_KEY=...

# Client-side (new)
PUBLIC_SUPABASE_URL=...
PUBLIC_SUPABASE_ANON_KEY=...
```

**Aktualizacja `env.d.ts`:**
```typescript
interface ImportMetaEnv {
  readonly SUPABASE_URL: string
  readonly SUPABASE_KEY: string
  readonly PUBLIC_SUPABASE_URL: string
  readonly PUBLIC_SUPABASE_ANON_KEY: string
}
```

---

### 4.2. Przepływ sesji

#### 4.2.1. Cookies sesji

Supabase Auth przechowuje tokeny w cookies:
- `sb-<project-ref>-auth-token` - access token + refresh token

**Konfiguracja cookies:**
- `httpOnly: true` (w warstwie SSR)
- `secure: true` (w produkcji)
- `sameSite: lax`
- `path: /`

#### 4.2.2. Odświeżanie sesji

Middleware automatycznie:
1. Sprawdza ważność access token
2. Jeśli wygasł, używa refresh token do pobrania nowego
3. Aktualizuje cookies z nowym tokenem
4. Obsługuje błędy odświeżania (wylogowanie)

---

### 4.3. Tworzenie profilu użytkownika

#### 4.3.1. Automatyczne tworzenie profilu przy rejestracji

**Opcja A - Trigger bazodanowy (rekomendowane):**

Dodanie migracji z triggerem na `auth.users`:

```sql
-- Trigger: create profile on user signup
create or replace function public.fn_create_profile_on_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger trg_auth_users_create_profile
after insert on auth.users
for each row
execute function public.fn_create_profile_on_signup();
```

**Opcja B - W serwisie rejestracji:**

Po pomyślnym `signUp`, wywołanie inserta do `profiles`.

---

### 4.4. Integracja z istniejącymi endpointami

#### 4.4.1. Usunięcie `DEFAULT_USER_ID`

**Obecny stan:** Endpointy używają stałego `DEFAULT_USER_ID` z `src/db/constants.ts`.

**Docelowy stan:** Używanie `context.locals.user.id` z middleware.

**Przykład migracji (`/api/profiles/me/display-name.ts`):**

```typescript
// PRZED:
const userId = DEFAULT_USER_ID

// PO:
const user = context.locals.user
if (!user) {
  return jsonUnauthorized('unauthorized', 'Authentication required')
}
const userId = user.id
```

#### 4.4.2. Endpointy wymagające autentykacji

- `POST /api/roasteries` - tworzenie palarni ✅ (już sprawdza)
- `POST /api/roasteries/[id]/coffees` - tworzenie kawy
- `PUT /api/coffees/[id]/my-rating` - upsert oceny
- `POST /api/profiles/me/display-name` - ustawienie display_name

---

### 4.5. Bezpieczeństwo

#### 4.5.1. Rate limiting

Supabase Auth ma wbudowany rate limiting. Dodatkowo rozważyć:
- Custom rate limiting na poziomie middleware dla endpointów auth
- Wykorzystanie Astro middleware do zliczania requestów per IP

#### 4.5.2. CSRF Protection

- Formularze używają POST z JSON body (nie form data)
- Tokeny sesji w httpOnly cookies
- Supabase automatycznie weryfikuje origin

#### 4.5.3. Password Security

- Minimalna długość: 8 znaków (Supabase default)
- Maksymalna długość: 72 znaki (limit bcrypt)
- Supabase hashuje hasła z bcrypt

#### 4.5.4. E-mail Security

- Weryfikacja e-mail wymagana przed pierwszym logowaniem
- Rate limiting na wysyłkę e-maili resetujących
- Tokeny resetowania wygasają po określonym czasie (Supabase default: 24h)

---

## 5. Typy i kontrakty

### 5.1. Rozszerzenie `/src/types.ts`

```typescript
// =====================
// Auth DTOs
// =====================

/**
 * Response from /api/auth/me endpoint
 */
export type AuthMeResponse = {
  id: string
  email: string
  emailConfirmedAt: string | null
  profile: ProfileDto | null
}

/**
 * Response from /api/auth/login endpoint
 */
export type AuthLoginResponse = {
  user: {
    id: string
    email: string
  }
}

/**
 * Response from /api/auth/register endpoint
 */
export type AuthRegisterResponse = {
  message: string
  requiresEmailConfirmation: boolean
}

/**
 * Standard error response for auth endpoints
 */
export type AuthErrorResponse = {
  code: string
  message: string
}
```

---

## 6. Aktualizacja konfiguracji

### 6.1. Nowe zależności npm

```json
{
  "dependencies": {
    "@supabase/ssr": "^0.5.x"
  }
}
```

### 6.2. Komponenty Shadcn/ui do zainstalowania

```bash
npx shadcn@latest add input
npx shadcn@latest add label
npx shadcn@latest add card
npx shadcn@latest add alert
npx shadcn@latest add dropdown-menu
```

---

## 7. Podsumowanie struktury plików

### 7.1. Nowe pliki

```
src/
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   ├── ForgotPasswordForm.tsx
│   │   ├── ResetPasswordForm.tsx
│   │   ├── AuthButton.tsx
│   │   └── AuthProvider.tsx
│   └── ui/
│       ├── input.tsx (shadcn)
│       ├── label.tsx (shadcn)
│       ├── card.tsx (shadcn)
│       ├── alert.tsx (shadcn)
│       └── dropdown-menu.tsx (shadcn)
├── db/
│   ├── supabase.server.ts
│   └── supabase.browser.ts
├── layouts/
│   └── AuthLayout.astro
├── lib/
│   ├── auth-guard.ts
│   ├── hooks/
│   │   └── useAuth.ts
│   ├── services/
│   │   └── auth.service.ts
│   └── validation/
│       └── auth.ts
├── pages/
│   ├── api/
│   │   └── auth/
│   │       ├── register.ts
│   │       ├── login.ts
│   │       ├── logout.ts
│   │       ├── forgot-password.ts
│   │       ├── reset-password.ts
│   │       └── me.ts
│   └── auth/
│       ├── login.astro
│       ├── register.astro
│       ├── forgot-password.astro
│       ├── reset-password.astro
│       └── callback.astro
└── supabase/
    └── migrations/
        └── 20260126_create_profile_on_signup.sql
```

### 7.2. Zmodyfikowane pliki

```
src/
├── db/
│   └── supabase.client.ts (refaktoryzacja lub deprecacja)
├── env.d.ts (nowe typy locals)
├── layouts/
│   └── Layout.astro (dodanie nawigacji z AuthButton)
├── lib/
│   └── http.ts (nowe helpers: jsonForbidden, jsonTooManyRequests)
├── middleware/
│   └── index.ts (obsługa sesji, user w locals)
├── pages/
│   └── api/
│       └── profiles/
│           └── me/
│               └── display-name.ts (usunięcie DEFAULT_USER_ID)
└── types.ts (nowe typy auth)
```

---

## 8. Zgodność z istniejącą aplikacją

### 8.1. Zachowanie kompatybilności

1. **Publiczne endpointy GET** - pozostają dostępne bez autentykacji:
   - `GET /api/roasteries`
   - `GET /api/roasteries/[id]`
   - `GET /api/roasteries/[id]/coffees`
   - `GET /api/coffees`
   - `GET /api/coffees/[id]`
   - `GET /api/profiles/[userId]`

2. **Endpointy wymagające autentykacji** - używają `context.locals.user`:
   - `POST /api/roasteries` (już zaimplementowane)
   - `POST /api/roasteries/[id]/coffees`
   - `PUT /api/coffees/[id]/my-rating`
   - `POST /api/profiles/me/display-name`

3. **RLS policies** - bez zmian (już skonfigurowane dla ról `anon` i `authenticated`)

### 8.2. Migracja z `DEFAULT_USER_ID`

Po wdrożeniu autentykacji:
1. Usunięcie stałej `DEFAULT_USER_ID` z `src/db/constants.ts`
2. Aktualizacja wszystkich endpointów używających tej stałej
3. Aktualizacja testów API (mock autentykacji)

---

## 9. Testowanie

### 9.1. Testy jednostkowe

- Walidacja schematów Zod
- Serwis auth.service.ts (mockowanie Supabase)

### 9.2. Testy integracyjne API

Rozszerzenie istniejących testów w `tests/api/`:
- `auth.register.test.ts`
- `auth.login.test.ts`
- `auth.logout.test.ts`
- `auth.forgot-password.test.ts`
- `auth.reset-password.test.ts`

### 9.3. Testy E2E

Scenariusze do przetestowania:
1. Pełny flow rejestracji (bez weryfikacji e-mail w testach)
2. Logowanie z poprawnymi danymi
3. Logowanie z błędnymi danymi
4. Wylogowanie
5. Ochrona endpointów (401 dla niezalogowanych)
6. Odzyskiwanie hasła (mockowanie e-maili)
