<conversation_summary>
<decisions>
Przeglądanie katalogów (palarnie/kawy) nie jest dostępne bez logowania.
display_name jest wymagany tylko dla akcji: dodawanie palarni, dodawanie kawy, ocenianie (nie jako globalny „gate” całej aplikacji).
Struktura tras i nawigacji ma być oparta o zasoby API i user stories: stałe pozycje „Palarni(e)” i „Kawy”, szczegóły jako podstrony; prosty dostęp do profilu/ustawień (logout + status display_name).
W MVP na listach ma być tylko paginowana lista (bez wyszukiwania i filtrów).
Paginacja ma być ustandaryzowana: paginacja + selektor pageSize w limitach, stan zapisany w URL; opcjonalny „Load more” tylko jeśli UX tego wymaga, ale nadal sterowany page/pageSize.
Formularz oceny ma używać kontrolki wspierającej krok 0.5 dla main/strength/acidity/aftertaste, z walidacją po stronie UI i etykietami metryk zgodnymi z PRD.
Widok kawy w MVP pokazuje tylko agregaty (bez listy ocen i bez „Mojej oceny”).
Obsługa konfliktów 409 (deduplikacja, display_name) w UI: brak; użytkownik akceptuje ryzyko.
Obsługa błędów/wygaśnięcia sesji i cache: brak (świadoma decyzja).
Po wystawieniu oceny: brak sygnalizacji w UI (brak toastów/potwierdzeń/stanów „zapisano”).
</decisions>
<matched_recommendations>
Wdrożyć „auth gate” dla całej części katalogowej i tras zasobów (zgodnie z decyzją o braku przeglądania bez logowania).
Oprzeć IA/trasowanie o zasoby API: /roasteries, /roasteries/:id, /coffees, /coffees/:id + miejsce na profil/ustawienia (logout + status display_name).
Ustandaryzować komponent listy: paginacja + pageSize w query params; nie implementować UI dla q/query/city/roasteryId w MVP.
Oceny: zastosować komponenty z krokiem 0.5 i walidację UI przed wysłaniem; metryki dodatkowe tylko do prezentacji (bez sortowania/filtrów).
Widok kawy oprzeć o agregaty (avgMain, ratingsCount, smallSample) i nie implementować GET/PUT my-rating jako części „Mojej oceny” (poza samym formularzem oceniania, jeśli występuje).
Responsywność/dostępność: baseline desktop/tablet + klawiatura/focus w formularzach w oparciu o shadcn/ui.
Świadomie odłożyć konflikty i błędy (401/403/409/429/500) oraz cache — potraktować jako dług techniczny na kolejny etap.
</matched_recommendations>
<ui_architecture_planning_summary>
Główne wymagania architektury UI (MVP):
Aplikacja web (Astro + React) z Supabase Auth; brak przeglądania bez logowania.
Prosta architektura informacji: katalog palarni i katalog kaw + ich szczegóły, bez wyszukiwania/filtrów.
display_name wymagany tylko przy: dodawaniu palarni, dodawaniu kawy, ocenianiu.
Ocena kawy: 4 obowiązkowe metryki w skali 1–5 co 0.5 (UI waliduje przed wysyłką).
Brak obsługi konfliktów 409, brak cache, brak obsługi błędów i wygaśnięcia sesji, brak sygnalizacji po zapisie oceny.
Kluczowe widoki/ekrany i przepływy użytkownika:
Auth: logowanie/rejestracja/reset hasła jako wejście do aplikacji.
RoasteriesList (GET /api/roasteries): lista paginowana.
RoasteryDetail (GET /api/roasteries/{id} + GET /api/roasteries/{id}/coffees): szczegóły palarni + lista kaw palarni (ranking po agregacie) + akcja „Dodaj kawę”.
CoffeesList (GET /api/coffees): globalna lista kaw paginowana (ranking).
CoffeeDetail (GET /api/coffees/{id}): szczegóły kawy i agregaty (avgMain, ratingsCount, smallSample).
CreateRoastery (POST /api/roasteries): formularz (wymaga login + display_name).
CreateCoffeeUnderRoastery (POST /api/roasteries/{id}/coffees): formularz w kontekście palarni (wymaga login + display_name).
RateCoffee (PUT /api/coffees/{id}/my-rating): formularz oceniania (wymaga login + display_name), bez odczytu „mojej oceny” i bez potwierdzeń po zapisie.
Strategia integracji z API i zarządzania stanem:
Widoki list/szczegółów mapują się bezpośrednio do endpointów list i detali.
Stan list utrzymywany w URL: page i pageSize.
Brak cache i brak zdefiniowanego mechanizmu obsługi błędów/sesji (świadome uproszczenie).
display_name jako warunek dostępu do 3 akcji (tworzenie palarni, tworzenie kawy, ocenianie); reszta funkcji dostępna po samym zalogowaniu.
Responsywność, dostępność, bezpieczeństwo:
Responsywność: baseline desktop/tablet, bez pełnego mobile-first.
Dostępność: pragmatyczna (klawiatura/focus/aria) dzięki shadcn/ui, bez formalnego audytu.
Bezpieczeństwo: Supabase Auth + token Bearer; UI ma egzekwować wymagania logowania oraz wymóg display_name dla wybranych akcji.
Konsekwencje/implikacje decyzji:
Brak obsługi konfliktów i błędów oznacza, że część scenariuszy (np. duplikat, brak autoryzacji, błędna walidacja serwera) może kończyć się „twardą” porażką bez UX-owej podpowiedzi.
Brak sygnalizacji po zapisie oceny oznacza brak informacji zwrotnej dla użytkownika poza ewentualną zmianą danych na ekranie (jeśli nastąpi).
</ui_architecture_planning_summary>
<unresolved_issues>
Brak — wszystkie wcześniej wskazane obszary zostały domknięte decyzjami (świadome odłożenie obsługi błędów/konfliktów/cache oraz brak sygnalizacji po zapisie).
</unresolved_issues>
</conversation_summary>