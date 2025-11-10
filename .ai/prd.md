# Dokument wymagań produktu (PRD) - Przekawowani

## 1. Przegląd produktu

Przekawowani to webowa aplikacja społecznościowa dla miłośników kawy, ułatwiająca odkrywanie ziaren, ocenianie i tworzenie przejrzystego rankingu opierającego się na zbiorczych ocenach społeczności. Aplikacja skupia się na prostocie (KISS) i minimalnym zestawie danych.

Zakres MVP:
- Web tylko (brak aplikacji mobilnych i wsparcia mobile web, brak wymagań dostępności).
- Konta użytkowników przez Supabase Auth (e‑mail + weryfikacja)
- Publiczne katalogi: lista palarni, lista kaw danej palarni, lista wszystkich kaw.
- Dodawanie palarni i kaw przez zalogowanych użytkowników (z deduplikacją).
- Ocenianie kaw w oparciu o jedną główną metrykę oraz trzy dodatkowe metryki opisowe.
- Sortowanie wyłącznie po głównej ocenie kawy.

Adresaci:
- Głównie amatorzy kawy szukający nowych ziaren do spróbowania oraz miejsca do dzielenia się opiniami.

## 2. Problem użytkownika

W społeczności istnieje wielu miłośników kawy. Testowanie różnych kaw jest czasochłonne i kosztowne, a informacje o jakości są rozproszone i niespójne. Użytkownicy potrzebują prostego systemu:
- do odkrywania ziaren o wysokich ocenach,
- do wystawiania i przechowywania własnych ocen,
- do porównywania ocen społeczności w jednym miejscu.

## 3. Wymagania funkcjonalne

3.1 Konta i bezpieczeństwo
- Rejestracja i logowanie.
- Możliwość usunięcia konta, po usunięciu konta oceny zostają.

3.2 Profil użytkownika
- Pole display_name: ustawiane raz, unikalne globalnie, długość ≤ 32, dozwolone znaki alfanumeryczne z polskimi diakrytykami; separatory dozwolone: spacja, „-”, „.”; e‑mail zawsze prywatny.
- display_name nieedytowalne po ustawieniu.

3.3 Model danych i relacje
- Palarnia: pola minimalne nazwa, miasto. Unikalność po (normalized_nazwa, normalized_miasto). Normalizacja: lowercase, trim, unaccent; przechowywać również oryginały do prezentacji. Palarnie w różnych miastach traktowane jako oddzielne byty.
- Kawa: pole minimalne nazwa; relacja 1:N z palarnią; unikalność po (palarnia_id, normalized_nazwa).
- Duplikaty blokowane przez unikalne indeksy; brak scalania duplikatów w MVP.

3.4 Dodawanie i edycja bytów
- Każdy zalogowany użytkownik może dodać palarnię.
- Kawa może być dodana wyłącznie z widoku konkretnej palarni (palarnia w kontekście).
- Brak edycji i usuwania palarni/kaw po utworzeniu w MVP.

3.5 Ocenianie
- Jedna ocena kawy na użytkownika per kawa.
- Główna metryka: Ocena kawy (skala 1–5 z połówkami). Wykorzystywana do sortowania i rankingu.
- Dodatkowe metryki obowiązkowe: moc, kwasowość, posmak (skala 1–5 z połówkami). Służą do prezentacji; brak filtrowania i sortowania po tych metrykach. Wyświetlane z etykietami w UI.
- Użytkownik może edytować wyłącznie własną ocenę; brak usuwania i historii zmian.

3.6 Agregacja i ranking
- Wynik kawy: średnia arytmetyczna głównej „Oceny kawy” ze wszystkich ocen użytkowników.
- Oznaczenie „mała próba” dla kaw z liczbą ocen < 3.

3.7 Widoki/strony
- Lista palarni.
- Widok palarni: szczegóły palarni + lista jej kaw + akcja „Dodaj kawę”.
- Lista wszystkich kaw (globalny katalog).
- Widok szczegółu kawy: średnia Ocena kawy, metryki dodatkowe (moc, kwasowość, posmak) z etykietami, lista ocen użytkowników (zakres MVP może być ograniczony do agregatów).

3.8 Ograniczenia i brakujące elementy w MVP
- Brak roli admina.
- Brak anty‑spam, moderacji, zgłaszania treści.
- Brak integracji i rekomendacji.
- Brak aplikacji mobilnych i wymagań dostępności.
- Brak eventów analitycznych i formalnych KPI (metryki operacyjne możliwe z bazy).

## 4. Granice produktu

W zakresie:
- Rejestracja/logowanie, profile z display_name.
- Dodawanie palarni i kaw (z deduplikacją).
- Ocenianie kaw (główna Ocena + metryki dodatkowe).
- widoki list i szczegółów.

Poza zakresem (MVP):
- Edycja/usuwanie palarni i kaw po utworzeniu.
- Filtrowanie i sortowanie po metrykach dodatkowych.
- Anty‑spam, moderacja, system zgłoszeń.
- System rekomendacji, integracje zewnętrzne.
- Aplikacje mobilne, wsparcie mobile web, wymagania dostępności.
- Śledzenie eventów i formalne KPI (możliwe później).

Założenia techniczne:
- Supabase Postgres z rozszerzeniami unaccent; indeksy funkcjonalne na kolumnach znormalizowanych.
- Normalizacja tekstu: lowercase, trim, unaccent dla kolumn unikalności i wyszukiwania.

## 5. Historyjki użytkowników

US-001
Tytuł: Rejestracja i logowanie
Opis: Jako użytkownik chcę zarejestrować się i zalogować e‑mailem, aby móc dodawać palarnie, kawy i oceny.
Kryteria akceptacji:
- Możliwość rejestracji e‑mail + weryfikacja

US-002
Tytuł: Ustawienie display_name
Opis: Jako użytkownik chcę ustawić widoczną publicznie nazwę display_name przy pierwszym użyciu.
Kryteria akceptacji:
- Walidacja: unikalne globalnie, ≤ 32 znaki, alfanumeryczne + polskie diakrytyki; dozwolone separatory: spacja, „-”, „.”.
- Nazwa ustawiana jednokrotnie i nieedytowalna później.
- Błędny lub zajęty display_name powoduje czytelny komunikat błędu.

US-003
Tytuł: Przegląd listy palarni
Opis: Jako użytkownik chcę zobaczyć listę wszystkich palarni.
Kryteria akceptacji:
- Lista palarni jest widoczna na stronie nie posortowana
- Czas odpowiedzi listy spełnia p95 ≤ 300 ms (dla standardowego rozmiaru strony).
- Po wybraniu palarni przechodzę do jej widoku.

US-004
Tytuł: Dodanie palarni
Opis: Jako zalogowany użytkownik chcę dodać nową palarnię (nazwa, miasto).
Kryteria akceptacji:
- Walidacja wymaganych pól; normalizacja do unikalności (normalized_nazwa, normalized_miasto).
- Próba dodania duplikatu kończy się komunikatem o duplikacie; wpis nie jest tworzony.
- Po sukcesie przekierowanie do widoku palarni.

US-005
Tytuł: Widok palarni i jej kaw
Opis: Jako użytkownik chcę zobaczyć listę kaw danej palarni.
Kryteria akceptacji:
- Lista kaw przypiętych do danej palarni jest posortowana po ocenie malejąco.
- Przycisk „Dodaj kawę” widoczny tylko dla zalogowanych.

US-006
Tytuł: Dodanie kawy z widoku palarni
Opis: Jako zalogowany użytkownik chcę dodać kawę do aktualnej palarni.
Kryteria akceptacji:
- Formularz przyjmuje nazwę kawy; palarnia podpowiadana z kontekstu.
- Walidacja i brak możliwości dodania tej samej kawy po (palarnia_id, normalized_nazwa).
- Po sukcesie przekierowanie do szczegółu kawy lub listy kaw palarni.

US-007
Tytuł: Posortowana lista wszystkich kaw
Opis: Jako użytkownik chcę przeglądać posortowaną globalną listę wszystkich kaw.
Kryteria akceptacji:
- Użytkownik widzi liste wszystkich kaw posortowaną po ocenie malejąco

US-008
Tytuł: Szczegóły kawy
Opis: Jako użytkownik chcę zobaczyć szczegóły kawy, średnią „Ocena kawy” i dodatkowe metryki.
Kryteria akceptacji:
- Wyświetl średnią „Ocena kawy”, liczbę ocen i etykietę „mała próba” przy < 3 ocenach.
- Wyświetl średnie dla metryk: moc, kwasowość, posmak (tylko prezentacja).
- Lista ocen użytkowników może być ograniczona do agregatów w MVP.

US-009
Tytuł: Wystawienie oceny kawy
Opis: Jako zalogowany użytkownik chcę ocenić kawę główną metryką oraz metrykami dodatkowymi.
Kryteria akceptacji:
- Wymagane pola: Ocena kawy, moc, kwasowość, posmak (skale 1–5 z połówkami).
- Wymuszenie jednej oceny per użytkownik per kawa (upsert po user_id + coffee_id).
- Po zapisaniu aktualizuje się średnia i etykiety na stronie kawy.

US-010
Tytuł: Edycja własnej oceny
Opis: Jako autor oceny chcę móc ją edytować.
Kryteria akceptacji:
- Edycja dozwolona tylko dla autora (RLS).
- Brak możliwości usunięcia oceny.
- Po edycji widoczne są zaktualizowane wartości i średnie.

US-011
Tytuł: Ograniczenia sortowania i filtrowania
Opis: Jako użytkownik akceptuję, że w MVP sortowanie jest dostępne wyłącznie po „Ocena kawy”.
Kryteria akceptacji:
- Brak opcji sortowania i filtrowania po metrykach dodatkowych.
- UI nie udostępnia nieobsługiwanych opcji.

US-012
Tytuł: Brak edycji/usuwania palarni i kaw
Opis: Jako użytkownik rozumiem, że nie mogę edytować ani usuwać palarni/kaw po utworzeniu.
Kryteria akceptacji:
- Endpointy/akcje edycji i usuwania nie istnieją w UI i API.
- RLS blokuje UPDATE/DELETE na tabelach palarni i kaw.

US-013
Tytuł: Stabilność i wydajność list
Opis: Jako użytkownik oczekuję szybkich list.
Kryteria akceptacji:
- p95 odpowiedzi list ≤ 300 ms przy standardowych rozmiarach zapytań.
- Indeksy funkcjonalne są zastosowane do kolumn znormalizowanych.

US-014
Tytuł: URL jako nośnik stanu
Opis: Jako użytkownik chcę móc dzielić się linkami do list z ich aktualnym stanem.
Kryteria akceptacji:
- Parametry sortowania są odzwierciedlone i odtwarzalne z query params.

## 6. Metryki sukcesu

Założenia MVP: brak eventów analitycznych i formalnych KPI; metryki operacyjne pozyskiwane z bazy (agregacje okresowe).

Metryki operacyjne (ad‑hoc z bazy):
- Liczba palarni, liczba kaw, liczba ocen w czasie (dzień/tydzień).
- Odsetek kaw z ≥ 3 ocenami (redukcja „małej próby”).
- Mediana czasu od dodania kawy do pierwszej oceny.
- Średnia „Ocena kawy” per palarnia oraz rozkład ocen.

Kryterium sukcesu produktu:
- Powstanie użytecznego, czytelnego rankingu najlepszych ziaren kawy w oparciu o oceny społeczności, wspierającego odkrywanie nowych kaw.


