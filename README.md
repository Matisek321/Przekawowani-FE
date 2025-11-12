## 1. Project name

Przekawowani

## 2. Project description

Przekawowani is a social web application for coffee enthusiasts that helps discover beans, submit ratings, and build a transparent community-driven ranking. The MVP emphasizes simplicity (KISS) and a minimal data model:
- Web-only experience
- User accounts via Supabase Auth (email + verification)
- Public catalogs: roaster list, each roaster’s coffees, and a global coffees list
- Authenticated users can add roasters and coffees
- Coffee ratings use one primary metric for ranking, plus three descriptive metrics (strength, acidity, aftertaste)
- Sorting is only by the primary coffee rating

For full product requirements, see `.ai/prd.md`.

## 3. Tech stack

- Frontend:
  - Astro 5 (content-focused, fast by default)
  - React 19 (interactive components where needed)
  - TypeScript 5 (type safety and IDE support)
  - Tailwind CSS 4 (utility-first styling)
  - Shadcn/ui (accessible React UI components)
- Backend:
  - Supabase (PostgreSQL, Auth, open source; can be self-hosted)
- CI/CD and Hosting:
  - GitHub Actions (CI/CD pipelines)
  - DigitalOcean (hosting via Docker image)

See `.ai/tech-stack.md` for more details.

## 4. Getting started locally

### Prerequisites
- Node.js 22.14.0 (see `.nvmrc`)
- npm (bundled with Node.js)

### Quickstart
```bash
git clone https://github.com/przeprogramowani/Przekawowani.git
cd Przekawowani

# Use the project’s Node version
nvm use 22.14.0

# Install dependencies
npm install

# Start the dev server
npm run dev
# Astro default: http://localhost:4321
```

### Production build and preview
```bash
# Build for production
npm run build

# Preview the production build locally
npm run preview
```

Notes:
- Supabase integration (database/auth) will be wired in as the MVP evolves; refer to `.ai/prd.md` for the planned data model and flows.

## 5. Available scripts

- `npm run dev`: Start the Astro development server
- `npm run build`: Build the production bundle
- `npm run preview`: Preview the production build locally
- `npm run astro`: Direct access to the Astro CLI
- `npm run lint`: Run ESLint
- `npm run lint:fix`: Auto-fix lint issues when possible
- `npm run format`: Format the repository with Prettier

## 6. Project scope

In scope (MVP):
- Accounts: registration/login via email with verification; ability to delete account (ratings remain)
- Profile: one-time, globally unique `display_name` (≤ 32 chars; supports Polish diacritics; allowed separators: space, `-`, `.`)
- Entities and relations:
  - Roaster: minimal fields name, city; uniqueness by `(normalized_name, normalized_city)`; normalization via lowercase, trim, unaccent; store originals for display
  - Coffee: minimal field name; relation 1:N with roaster; uniqueness by `(roaster_id, normalized_name)`
  - Dedup enforced by unique indexes; no merge of duplicates in MVP
- Adding and editing:
  - Any authenticated user can add a roaster
  - Coffee can only be added from the current roaster view
  - No edit/delete of roasters/coffees post-creation in MVP
- Rating:
  - One rating per user per coffee
  - Primary metric: Coffee Rating (1–5 with halves), used for sorting and ranking
  - Required descriptive metrics: strength, acidity, aftertaste (1–5 with halves), for display only
  - Users can edit only their own rating; no deletion or history
- Aggregation and ranking:
  - Coffee score: arithmetic mean of primary Coffee Rating across user ratings
  - Mark “small sample” for coffees with < 3 ratings
- Views/pages:
  - Roaster list
  - Roaster detail (roaster info, its coffees, “Add coffee” for authenticated users)
  - Global coffees list
  - Coffee detail (average primary rating, descriptive metrics, count of ratings; aggregates may be shown instead of full review lists in MVP)

Out of scope (MVP):
- Admin role, moderation, anti‑spam, reporting
- Editing/deleting roasters and coffees after creation
- Filtering/sorting by descriptive metrics
- Recommendations and external integrations
- Mobile apps, mobile web requirements, accessibility requirements
- Analytics events and formal KPIs (operational metrics may be derived from the DB)

## 7. Project status

- Version: 0.0.1
- Status: MVP in active development
- Node: 22.14.0

Helpful docs:
- Product Requirements: `.ai/prd.md`
- Tech Stack Overview: `.ai/tech-stack.md`

Badges:

![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)
![Node 22.14.0](https://img.shields.io/badge/node-22.14.0-43853D?logo=node.js&logoColor=white)
![Version 0.0.1](https://img.shields.io/badge/version-0.0.1-blue)

## 8. License

This project is licensed under the MIT License.

## 9. API

### GET `/api/profiles/{userId}`

Public endpoint returning a minimal public profile by `userId` (UUID).

- Method: GET
- Auth: Not required
- Params:
  - `userId` (path): UUID
- Responses:
  - 200 OK
    ```json
    {
      "userId": "f2e9b2a0-2f9a-4e51-9d7b-5b4f0a1c2d3e",
      "displayName": "Jane Doe",
      "createdAt": "2025-11-11T12:00:00.000000Z"
    }
    ```
  - 400 Bad Request
    ```json
    { "code": "invalid_request", "message": "userId must be a valid UUID" }
    ```
  - 404 Not Found
    ```json
    { "code": "profile_not_found", "message": "Profile not found" }
    ```
  - 500 Internal Server Error
    ```json
    { "code": "internal_error", "message": "Unexpected server error" }
    ```
- Headers:
  - `Content-Type: application/json; charset=utf-8`
  - `Cache-Control: public, max-age=60, stale-while-revalidate=600`

Examples:
```bash
# 400
curl -i http://localhost:4321/api/profiles/not-a-uuid

# 404 (replace with a valid UUID not present in profiles)
curl -i http://localhost:4321/api/profiles/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee

# 200 (replace with an existing profile UUID)
curl -i http://localhost:4321/api/profiles/<existing-uuid>
```


### GET `/api/roasteries`

Public endpoint returning a paginated list of roasteries with optional filters.

- Method: GET
- Auth: Not required
- Query:
  - `q` (optional): string, trimmed, 1..64; contains on normalized name
  - `city` (optional): string, trimmed, 1..64; exact match on normalized city
  - `page` (optional): int ≥ 1, default 1
  - `pageSize` (optional): int 1..100, default 20
- Responses:
  - 200 OK
    ```json
    {
      "page": 1,
      "pageSize": 20,
      "total": 2,
      "items": [
        { "id": "1", "name": "Kawa A", "city": "Warszawa", "createdAt": "2025-11-11T12:00:00.000000Z" }
      ]
    }
    ```
  - 400 Bad Request
    ```json
    { "code": "invalid_request", "message": "Invalid query" }
    ```
  - 500 Internal Server Error
    ```json
    { "code": "internal_error", "message": "Unexpected server error" }
    ```
- Headers:
  - `Content-Type: application/json; charset=utf-8`
  - `Cache-Control: public, max-age=60, stale-while-revalidate=120`
  - `X-Request-Id: <uuid>`

Examples:
```bash
curl -i "http://localhost:4321/api/roasteries"
curl -i "http://localhost:4321/api/roasteries?page=2&pageSize=5"
curl -i "http://localhost:4321/api/roasteries?q=KAwA%20%C3%81"
curl -i "http://localhost:4321/api/roasteries?city=Kielc%C3%A9"
```

