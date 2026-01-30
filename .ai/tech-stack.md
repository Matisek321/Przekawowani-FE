Frontend - Astro z React dla komponentów interaktywnych:
- Astro 5 pozwala na tworzenie szybkich, wydajnych stron i aplikacji z minimalną ilością JavaScript
- React 19 zapewni interaktywność tam, gdzie jest potrzebna
- TypeScript 5 dla statycznego typowania kodu i lepszego wsparcia IDE
- Tailwind 4 pozwala na wygodne stylowanie aplikacji
- Shadcn/ui zapewnia bibliotekę dostępnych komponentów React, na których oprzemy UI

Backend - Supabase jako kompleksowe rozwiązanie backendowe:
- Zapewnia bazę danych PostgreSQL
- Zapewnia SDK w wielu językach, które posłużą jako Backend-as-a-Service
- Jest rozwiązaniem open source, które można hostować lokalnie lub na własnym serwerze
- Posiada wbudowaną autentykację użytkowników

CI/CD i Hosting:
- Github Actions do tworzenia pipeline'ów CI/CD
- Cloudflare Pages jako hosting aplikacji Astro
  - @astrojs/cloudflare ^12.6.12 - adapter Astro dla Cloudflare Pages
  - Wrangler ^4.1.0 - CLI do zarządzania deploymentem na Cloudflare
  - Kompatybilność: 2025-01-30
  - Output: ./dist

Testowanie jednostkowe i integracyjne - Vitest:
- Vitest ^2.1.5 - framework do testów jednostkowych i integracyjnych
- Środowisko: jsdom ^27.4.0
- Coverage provider: v8 (@vitest/coverage-v8 ^2.1.9)
- Pool: forks (dla lepszej izolacji testów)
- Timeout: 10s
- Pattern: src/**/*.{test,spec}.{ts,tsx}
- @testing-library/react ^16.3.2 - testowanie komponentów React
- @testing-library/jest-dom ^6.9.1 - dodatkowe matchery dla DOM
- @testing-library/user-event ^14.6.1 - symulacja interakcji użytkownika
- msw ^2.12.7 (Mock Service Worker) - mockowanie API w testach

Testy End-to-End - Playwright:
- @playwright/test ^1.58.0 - testy E2E w rzeczywistym środowisku przeglądarki
- Test directory: ./tests/e2e
- Pattern: **/*.spec.ts
- Przeglądarki: Chromium (Desktop Chrome)
- testIdAttribute: data-test-id
- Base URL: http://localhost:3000
- Trace: on-first-retry
- Screenshot: only-on-failure
- Video: on-first-retry
- Timeout: 30s (expect: 5s)
- CI: retries 2, workers 1
- Output: ./tests/e2e/test-results

Skrypty testowe (npm scripts):
- npm run test - uruchomienie testów jednostkowych (vitest run)
- npm run test:watch - testy w trybie watch (vitest)
- npm run test:ui - testy z interfejsem UI (vitest --ui)
- npm run test:coverage - testy z raportem pokrycia (vitest run --coverage)
- npm run test:e2e - uruchomienie testów E2E (playwright test)
- npm run test:e2e:ui - testy E2E z interfejsem UI (playwright test --ui)
- npm run test:e2e:report - wyświetlenie raportu E2E (playwright show-report)
