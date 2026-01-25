# Architektura UI dla Przekawowani

## 1. Przegląd struktury UI

Przekawowani (MVP) to aplikacja webowa oparta o zasoby domenowe: **palarnie**, **kawy** i **oceny**. Interfejs jest zorganizowany wokół katalogów (listy) i szczegółów zasobów, zgodnie z REST API.

Założenia i decyzje MVP (z PRD + notatek sesji):
- **Auth gate dla części katalogowej**: przeglądanie palarni/kaw jest dostępne dopiero po zalogowaniu (mimo że API dopuszcza anon-read).
- **display_name nie jest globalnym “gate”**: jest wymagany wyłącznie do akcji **tworzenia palarni**, **tworzenia kawy**, **oceniania**.
- **Listy są proste**: paginacja + wybór `pageSize`, stan zapisany w URL; brak wyszukiwania/filtrów w MVP (mimo że API je wspiera).
- **Szczegół kawy w MVP pokazuje agregaty** (średnie i licznik ocen); brak publicznej listy ocen.
- **Konflikty i błędy**: świadomie minimalna obsługa (m.in. 409, 401, 500) jako dług techniczny; UX w MVP jest “surowy”.
- **Po zapisaniu oceny**: brak toastów/potwierdzeń/komunikatu “zapisano” (zmiana może być widoczna dopiero po odświeżeniu danych).

## 2. Lista widoków

Poniżej lista wymaganych widoków (MVP) z mapowaniem na API, celami i kluczowymi komponentami.

### 2.1 Autoryzacja i wejście do aplikacji

- **Nazwa widoku**: Logowanie  
  - **Ścieżka widoku**: `/login`  
  - **Główny cel**: wejście do aplikacji dla istniejących użytkowników.  
  - **Kluczowe informacje do wyświetlenia**: formularz e-mail + hasło; link do rejestracji i resetu hasła.  
  - **Kluczowe komponenty widoku**:
    - Formularz logowania (walidacja pól, maskowanie hasła)
    - Linki: “Załóż konto”, “Nie pamiętasz hasła?”  
  - **UX, dostępność i względy bezpieczeństwa**:
    - Dostępność: poprawne etykiety pól, tab-order, focus ring, obsługa Enter.
    - Bezpieczeństwo: brak ujawniania szczegółów błędu (np. czy konto istnieje), brak logowania tokenów w UI.

- **Nazwa widoku**: Rejestracja  
  - **Ścieżka widoku**: `/register`  
  - **Główny cel**: utworzenie konta.  
  - **Kluczowe informacje do wyświetlenia**: e-mail, hasło, potwierdzenie hasła; informacja o weryfikacji e-mail.  
  - **Kluczowe komponenty widoku**:
    - Formularz rejestracji + walidacja (min. zgodność haseł)
  - **UX, dostępność i względy bezpieczeństwa**:
    - Bezpieczeństwo: ograniczenie podpowiedzi błędów do bezpiecznych komunikatów; brak ujawniania polityk wewnętrznych.

- **Nazwa widoku**: Reset hasła  
  - **Ścieżka widoku**: `/reset-hasla`  
  - **Główny cel**: odzyskanie hasła.  
  - **Kluczowe informacje do wyświetlenia**: formularz e-mail, informacja o wysłaniu wiadomości.  
  - **Kluczowe komponenty widoku**:
    - Formularz resetu hasła (bez potwierdzania czy e-mail istnieje)
  - **UX, dostępność i względy bezpieczeństwa**:
    - Bezpieczeństwo: zawsze ten sam komunikat “Jeśli konto istnieje, wyślemy link…”.

### 2.2 Aplikacja (chroniona) – katalog i szczegóły

- **Nazwa widoku**: Strona startowa (po zalogowaniu)  
  - **Ścieżka widoku**: `/` (po zalogowaniu przekierowuje do `/roasteries` lub `/coffees`)  
  - **Główny cel**: szybkie wejście do katalogu.  
  - **Kluczowe informacje do wyświetlenia**: krótkie wprowadzenie + skróty nawigacyjne.  
  - **Kluczowe komponenty widoku**:
    - Kafelki / linki: “Palarnie”, “Kawy”

- **Nazwa widoku**: Lista palarni  
  - **Ścieżka widoku**: `/roasteries?page=1&pageSize=20`  
  - **Główny cel**: przegląd wszystkich palarni.  
  - **Kluczowe informacje do wyświetlenia**:
    - Element listy: `name`, `city`
    - Paginacja: `page`, `pageSize`, `total`
  - **Kluczowe komponenty widoku**:
    - Lista/karty palarni
    - Kontrolki paginacji + wybór `pageSize` (stan w URL)
    - Akcja “Dodaj palarnię” (widoczna po zalogowaniu; przed akcją sprawdzany `display_name`)
  - **UX, dostępność i względy bezpieczeństwa**:
    - UX: puste stany (brak palarni), skeleton/loading.
    - Bezpieczeństwo: akcje zapisu niewidoczne lub zablokowane bez wymaganego profilu.
  - **Mapowanie API**:
    - GET `/api/roasteries`

- **Nazwa widoku**: Szczegóły palarni + lista jej kaw  
  - **Ścieżka widoku**: `/roasteries/:id`  
  - **Główny cel**: pokazać palarnię i ranking jej kaw.  
  - **Kluczowe informacje do wyświetlenia**:
    - Palarnia: `name`, `city`
    - Kawa (na liście): `name`, `avgMain`, `ratingsCount`, `smallSample`
  - **Kluczowe komponenty widoku**:
    - Sekcja “O palarni”
    - Lista kaw palarni (posortowana po `avgMain` malejąco)
    - Akcja “Dodaj kawę” (w kontekście palarni; wymaga `display_name`)
  - **UX, dostępność i względy bezpieczeństwa**:
    - UX: informacja, że sortowanie jest tylko po ocenie głównej (brak innych opcji).
  - **Mapowanie API**:
    - GET `/api/roasteries/{id}`
    - GET `/api/roasteries/{id}/coffees`

- **Nazwa widoku**: Dodanie palarni  
  - **Ścieżka widoku**: `/roasteries/new`  
  - **Główny cel**: utworzenie nowej palarni (nazwa, miasto).  
  - **Kluczowe informacje do wyświetlenia**:
    - Pola: `name`, `city`
    - Informacja o braku edycji/usuwania w MVP
  - **Kluczowe komponenty widoku**:
    - Formularz “Dodaj palarnię”
    - “Gate” `display_name` (jeśli brak — przekierowanie do ustawienia nazwy lub modal)
  - **UX, dostępność i względy bezpieczeństwa**:
    - UX: walidacja pól po stronie UI (wymagane, niepuste).
    - Bezpieczeństwo: tylko użytkownik zalogowany; brak możliwości edycji po utworzeniu (brak UI).
  - **Mapowanie API**:
    - POST `/api/roasteries`

- **Nazwa widoku**: Dodanie kawy (z widoku palarni)  
  - **Ścieżka widoku**: `/roasteries/:id/coffees/new`  
  - **Główny cel**: utworzenie kawy w kontekście konkretnej palarni.  
  - **Kluczowe informacje do wyświetlenia**:
    - Pole: `name`
    - Kontekst: nazwa palarni (tylko do informacji)
  - **Kluczowe komponenty widoku**:
    - Formularz “Dodaj kawę”
    - Informacja o braku edycji/usuwania w MVP
    - “Gate” `display_name`
  - **UX, dostępność i względy bezpieczeństwa**:
    - UX: jednoznaczny kontekst palarni (żeby uniknąć pomyłek).
  - **Mapowanie API**:
    - POST `/api/roasteries/{id}/coffees`

- **Nazwa widoku**: Globalna lista kaw (ranking)  
  - **Ścieżka widoku**: `/coffees?page=1&pageSize=100&sort=rating_desc`  
  - **Główny cel**: przegląd rankingu kaw w całej aplikacji.  
  - **Kluczowe informacje do wyświetlenia**:
    - Kawa: `name`, `avgMain`, `ratingsCount`, `smallSample`
    - (Opcjonalnie) informacja o palarni: w API listy jest tylko `roasteryId` — w MVP można nie wyświetlać nazwy palarni w liście.
  - **Kluczowe komponenty widoku**:
    - Lista/karty kaw
    - “Badge” małej próby (`ratingsCount < 3`)
    - Paginacja + `pageSize` w URL
  - **UX, dostępność i względy bezpieczeństwa**:
    - UX: brak filtrów/sortowań poza “po ocenie” (UI nie pokazuje nieobsługiwanych opcji).
  - **Mapowanie API**:
    - GET `/api/coffees`

- **Nazwa widoku**: Szczegóły kawy (agregaty)  
  - **Ścieżka widoku**: `/coffees/:id`  
  - **Główny cel**: pokazać szczegóły kawy i jej wynik społecznościowy.  
  - **Kluczowe informacje do wyświetlenia**:
    - `name`
    - `avgMain`, `ratingsCount`, `smallSample`
    - Informacja o palarni (wymaga dogrania danych palarni przez `roasteryId`)
    - Średnie dla metryk dodatkowych (wymóg PRD): moc/kwasowość/posmak  
      - Uwaga: API w planie “coffee detail” nie zawiera jeszcze tych średnich — jeśli pozostaje tak jak w planie, UI w MVP musi ograniczyć się do `avgMain` + liczników albo wymaga rozszerzenia endpointu.
  - **Kluczowe komponenty widoku**:
    - Sekcja nagłówkowa: nazwa + wynik + badge “mała próba”
    - Sekcja metryk (główna + dodatkowe) z etykietami
    - CTA “Oceń tę kawę” (wymaga `display_name`)
  - **UX, dostępność i względy bezpieczeństwa**:
    - UX: jasne wyjaśnienie “małej próby”.
    - Bezpieczeństwo: brak publicznej listy ocen (zgodnie z API i RLS).
  - **Mapowanie API**:
    - GET `/api/coffees/{id}`
    - (Dla prezentacji palarni) GET `/api/roasteries/{roasteryId}`

- **Nazwa widoku**: Ocenianie kawy (formularz)  
  - **Ścieżka widoku**: `/coffees/:id/rate`  
  - **Główny cel**: wystawienie/zmiana własnej oceny (upsert).  
  - **Kluczowe informacje do wyświetlenia**:
    - 4 metryki wymagane: `main`, `strength`, `acidity`, `aftertaste` (1–5 co 0.5)
  - **Kluczowe komponenty widoku**:
    - Kontrolki oceny wspierające krok 0.5 + etykiety (np. “Ocena”, “Moc”, “Kwasowość”, “Posmak”)
    - Walidacja UI (zakres i krok)
    - Przycisk “Zapisz”
    - (MVP) brak “Mojej oceny” jako podglądu — formularz może nie być prefillowany
  - **UX, dostępność i względy bezpieczeństwa**:
    - Dostępność: sterowanie klawiaturą, wyraźny focus, komunikaty walidacji powiązane z polami.
    - Bezpieczeństwo: tylko dla zalogowanych; upsert dotyczy wyłącznie `me`.
  - **Mapowanie API**:
    - PUT `/api/coffees/{id}/my-rating`
    - (Opcjonalne prefill w przyszłości) GET `/api/coffees/{id}/my-rating` (204 gdy brak)

### 2.3 Profil i ustawienia

- **Nazwa widoku**: Ustawienie `display_name` (jednorazowe)  
  - **Ścieżka widoku**: `/account/display-name`  
  - **Główny cel**: ustawić publiczną nazwę widoczną w systemie (jednorazowo).  
  - **Kluczowe informacje do wyświetlenia**:
    - Reguły walidacji (≤ 32, dozwolone znaki, unikalność)
    - Komunikat, że nazwa jest nieedytowalna po ustawieniu
  - **Kluczowe komponenty widoku**:
    - Formularz ustawienia nazwy
    - Informacja o niezmienialności
  - **UX, dostępność i względy bezpieczeństwa**:
    - UX: czytelne komunikaty błędów walidacji (400) i konfliktów (409).
    - Uwaga MVP: notatki sesji zakładają minimalną obsługę 409; architektura przewiduje miejsce na komunikaty, nawet jeśli wdrożenie jest odłożone.
  - **Mapowanie API**:
    - POST `/api/profiles/me/display-name`

- **Nazwa widoku**: Konto / ustawienia  
  - **Ścieżka widoku**: `/account`  
  - **Główny cel**: podstawowe ustawienia sesji i profilu.  
  - **Kluczowe informacje do wyświetlenia**:
    - Status zalogowania
    - Aktualny `display_name` (jeśli ustawiony)
    - Akcja “Wyloguj”
    - (Wymóg PRD) Akcja “Usuń konto”  
  - **Kluczowe komponenty widoku**:
    - Sekcja “Profil” (display_name read-only)
    - Akcje: wylogowanie
    - Sekcja “Niebezpieczne” (usunięcie konta)
  - **UX, dostępność i względy bezpieczeństwa**:
    - Bezpieczeństwo: usunięcie konta powinno wymagać reautoryzacji/konfirmacji (modal z potwierdzeniem).
    - Zgodność z API: w planie REST API brak endpointu “delete account” — architektura UI przewiduje ekran, ale wymaga doprecyzowania integracji (np. osobny endpoint lub mechanizm Supabase).

### 2.4 Widoki systemowe

- **Nazwa widoku**: 404 / zasób nie istnieje  
  - **Ścieżka widoku**: `/404` (oraz obsługa per zasób)  
  - **Główny cel**: czytelne zakończenie, gdy palarnia/kawa nie istnieje.  
  - **Kluczowe komponenty widoku**:
    - Komunikat + linki do katalogów

- **Nazwa widoku**: Błąd ogólny  
  - **Ścieżka widoku**: `/error` (lub stan w obrębie widoku)  
  - **Główny cel**: fallback dla 500/nieoczekiwanych błędów.  
  - **Kluczowe komponenty widoku**:
    - Komunikat + akcja “Spróbuj ponownie”

## 3. Mapa podróży użytkownika

### 3.1 Główny przypadek użycia: odkrycie kawy i wystawienie oceny

1) **Wejście** → `/login`  
2) **Po zalogowaniu** → przekierowanie do `/roasteries` (lub `/coffees`)  
3) **Odkrywanie**  
   - Ścieżka A: `/coffees` → wybór kawy → `/coffees/:id`  
   - Ścieżka B: `/roasteries` → `/roasteries/:id` → wybór kawy → `/coffees/:id`  
4) **Decyzja o ocenie**  
   - Klik “Oceń tę kawę” → jeśli brak `display_name`, przekierowanie do `/account/display-name`  
5) **Ustawienie display_name (jeśli wymagane)**  
   - `/account/display-name` → zapis → powrót do akcji (najlepiej: back to `/coffees/:id/rate`)  
6) **Wystawienie/zmiana oceny**  
   - `/coffees/:id/rate` → walidacja → PUT `/api/coffees/{id}/my-rating`  
   - (MVP) brak potwierdzenia; użytkownik wraca do `/coffees/:id` i ewentualnie widzi zmianę po odświeżeniu danych/agregatów

### 3.2 Dodanie palarni i kawy (kontrybucja)

1) `/roasteries` → “Dodaj palarnię”  
2) Jeśli brak `display_name` → `/account/display-name`  
3) `/roasteries/new` → POST `/api/roasteries` → przekierowanie do `/roasteries/:id`  
4) `/roasteries/:id` → “Dodaj kawę” → `/roasteries/:id/coffees/new`  
5) POST `/api/roasteries/{id}/coffees` → przekierowanie do `/coffees/:coffeeId` (lub powrót do listy kaw palarni)

## 4. Układ i struktura nawigacji

### 4.1 Globalny “app shell”

- **Top bar** (stały na widokach chronionych):
  - Logo/nazwa produktu (link do `/roasteries` lub `/coffees`)
  - Główne linki: **Palarnie** (`/roasteries`), **Kawy** (`/coffees`)
  - Prawa strona: menu konta (np. `display_name` jeśli jest) z akcją **Wyloguj** i linkiem do **Konto** (`/account`)

### 4.2 Zasady dostępu (route guards)

- **Auth gate**: wszystkie trasy katalogowe i szczegółowe (`/roasteries*`, `/coffees*`, `/account*`) wymagają zalogowania; w przeciwnym razie przekierowanie do `/login`.
- **display_name gate (akcyjny)**: tylko akcje zapisu:
  - `/roasteries/new`
  - `/roasteries/:id/coffees/new`
  - `/coffees/:id/rate`
  Jeśli `display_name` brak → przekierowanie do `/account/display-name` (z parametrem powrotu w URL).

### 4.3 Nawigacja lokalna

- Z list do szczegółu: klik w element listy.
- Z szczegółu palarni do kawy: klik w element listy kaw.
- Z szczegółu kawy do oceny: CTA “Oceń”.
- Powroty: standardowe “Wstecz” w przeglądarce + linki kontekstowe (“Powrót do palarni”, “Powrót do listy kaw”).

## 5. Kluczowe komponenty

Komponenty przekrojowe (współdzielone przez wiele widoków):

- **AuthGate / ProtectedRoute**: wymusza zalogowanie i przekierowania.
- **DisplayNameGate**: blokuje tylko akcje wymagające `display_name` i prowadzi do `/account/display-name`.
- **AppShell (Layout)**: top bar + miejsce na treść + spójne odstępy i tytuły stron.
- **ResourceList + ItemCard**:
  - `RoasteryCard`: nazwa + miasto
  - `CoffeeCard`: nazwa + `avgMain` + `ratingsCount` + `smallSample`
- **PaginationControls**: sterowanie `page` i `pageSize`, synchronizacja z query params.
- **EmptyState / LoadingState**: brak danych, ładowanie, skeleton.
- **MetricDisplay**:
  - `RatingBadge` (średnia ocena)
  - `SmallSampleBadge` (mała próba)
  - `MetricRow` (etykieta + wartość)
- **RatingInput (step 0.5)**: kontrolka do wyboru 1–5 co 0.5 (wspólna dla 4 metryk) + walidacja.
- **ErrorBanner (minimalny)**: miejsce na komunikaty błędów (400/401/404/409/500), nawet jeśli MVP przewiduje uproszczone zachowanie.

---

## Mapowanie historyjek użytkownika (PRD) do architektury UI

- **US-001 Bezpieczny dostęp** → `/login`, `/register`, `/reset-hasla`, top-bar “Zaloguj/Wyloguj”, AuthGate dla zasobów.
- **US-002 Reguły dostępu (przeglądanie tylko po loginie)** → AuthGate dla `/roasteries*` i `/coffees*`.
- **US-003 Ustawienie display_name** → `/account/display-name` + DisplayNameGate na akcjach zapisu.
- **US-004 Przegląd listy palarni** → `/roasteries` (GET `/api/roasteries`).
- **US-005 Dodanie palarni** → `/roasteries/new` (POST `/api/roasteries`) + przekierowanie do `/roasteries/:id`.
- **US-006 Widok palarni i jej kaw** → `/roasteries/:id` (GET roastery + GET roastery coffees).
- **US-007 Dodanie kawy z widoku palarni** → `/roasteries/:id/coffees/new` (POST `/api/roasteries/{id}/coffees`).
- **US-008 Posortowana lista wszystkich kaw** → `/coffees` (GET `/api/coffees`, sort po `avgMain`).
- **US-009 Szczegóły kawy** → `/coffees/:id` (GET `/api/coffees/{id}` + badge “mała próba”; metryki dodatkowe wymagają zgodności payloadu API).
- **US-010 Wystawienie oceny kawy** → `/coffees/:id/rate` (PUT `/api/coffees/{id}/my-rating`, 4 metryki wymagane).
- **US-011 Edycja własnej oceny** → ten sam widok `/coffees/:id/rate` (upsert); prefill z GET my-rating możliwy jako usprawnienie, ale MVP może pozostać bez.
- **US-012 Ograniczenia sortowania i filtrowania** → UI list bez dodatkowych filtrów/sortów; komunikat/informacja w listach.
- **US-013 Brak edycji/usuwania palarni i kaw** → brak przycisków/tras edycji/usuwania; informacja w formularzach tworzenia.
- **US-014 Stabilność i wydajność list** → architektura list oparta o paginację i ograniczony `pageSize`; minimalny payload per item.
- **US-015 URL jako nośnik stanu** → `page` i `pageSize` w query params dla `/roasteries` i `/coffees` (opcjonalnie również dla list kaw palarni).
