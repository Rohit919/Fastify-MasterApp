# Admin Frontend — Architecture & Planning

> **Phase:** Analysis & planning. This document is derived from a direct
> inspection of the actual repository (backend, contracts, and the existing
> `apps/admin`) and of the read-only reference at `_Reference/slash-admin-main`.
> It is implementation-ready for the next phase.
>
> **Important status note:** a working Admin Frontend already exists in
> `apps/admin` (built in earlier phases of this project). This document therefore
> serves two purposes: (1) it is the reference architecture for the Admin
> Frontend, and (2) it maps that architecture against **what already exists**,
> marking each area as _Implemented_, _Partial_, or _Backend endpoint required_.
> Anything not currently supported by the backend is called out explicitly and
> never invented.

---

## 0. TL;DR

- **Stack (existing project):** React 18 + TypeScript + Vite + React Router 6 +
  Tailwind + shadcn-style UI + Zustand + TanStack Query + react-hook-form + zod +
  i18next + recharts. Keep this stack.
- **Location:** `apps/admin` (already established — do **not** create a new app).
- **Contracts:** the monorepo ships `packages/api-contracts` (TypeBox). The admin
  imports the **same** schemas/types + endpoint registry the API validates
  against, so endpoint paths and DTOs cannot drift. This is the single most
  important architectural asset and must remain the backbone.
- **Slash Admin** (`_Reference/slash-admin-main`) is a **pattern reference only**.
  Its concrete stack (Ant Design, react-router 7, vanilla-extract, axios, MSW/
  Faker, `permissions[].code` shape) differs from this project and must **not**
  be copied wholesale.
- **Backend is the authorization boundary.** Frontend RBAC is UX only.
- **Known backend gaps** (frontend must degrade gracefully, not fake them):
  ~~no user create/update/delete/detail routes, no profile-update route, no
  dashboard-metrics route~~ — **all three have since been implemented** (see the
  Update note below). No backend gaps remain in the Phase-1 scope.

> **Update (post-implementation):** the user CRUD endpoints
> (`POST /users`, `GET/PATCH/DELETE /users/:userId`) and the self profile update
> (`PATCH /users/me`) are now implemented in the Fastify API — with password
> hashing, email-uniqueness conflict (409), a self-delete guard, RBAC gates
> (`users.create/read/update/delete`), and audit logging — and are wired into the
> admin (Users create/edit/delete + editable Settings → Profile). Backend tests
> cover them (users.crud.test.ts). A real dashboard-metrics endpoint —
> `GET /api/v1/admin/dashboard` (permission `metrics.read`, returning entity
> totals + recent users + a 7-day signups series) — has also been implemented
> and the dashboard now consumes it (with a graceful fallback when the caller
> lacks `metrics.read`). The `⚠ Backend endpoint required` markers in
> §5/§13/§16/§30 below reflect the doc's original state; **no Phase-1 backend
> gaps remain.**
>
> Additionally, two Slash-Admin UI enrichments from the integration audit are
> now implemented: a **command palette** (⌘/Ctrl-K global search over permitted
> nav routes) and **DataTable row-selection + bulk actions** (wired to a
> permission-gated bulk-delete on the Users page).

---

## 1. Repository Inspection (actual findings)

### 1.1 Monorepo layout

npm workspaces monorepo (`package.json` → `workspaces: ["packages/*", "apps/*"]`):

```text
Fastify-Master/
├── apps/
│   ├── api/          # Fastify API (@app/api)
│   └── admin/        # React admin (@app/admin)  ← already exists
├── packages/
│   └── api-contracts # @app/api-contracts — shared TypeBox contracts
├── prisma/           # schema + migrations + seed (root-level)
├── docs/             # extensive docs (this file lives here)
├── docker/           # docker-compose (postgres, redis, prometheus, …)
├── .github/workflows # CI
└── _Reference/
    └── slash-admin-main/   # read-only reference
```

Tooling present: Prettier, husky v8 + lint-staged, a root flat **ESLint** config
(`eslint.config.js`) covering both apps, Vitest (admin) + Vitest (api), CI
(`.github/workflows/ci.yml`) with quality/test/test-admin/build/security jobs.

### 1.2 Backend (Fastify) — verified

- **Base path:** `${API_PREFIX}/${API_VERSION}` = **`/api/v1`** (from `env.ts`,
  applied in `apps/api/src/app.ts`). Port `3000`, host `0.0.0.0`.
- **Module mount prefixes** (`app.ts`): `/auth` (auth + recovery), `/users`,
  `/examples`, `/todos`, `/admin` (RBAC roles/permissions **and** ops metrics).
- **CORS:** origins from `CORS_ORIGIN` (default includes `:5173` and `:3000`),
  `credentials: true` (required for the refresh cookie), allows `Authorization`.
- **Auth mechanism:** JWT access token (HS256, `~15m`) returned **in the response
  body**; opaque **refresh token in an HTTP-only, SameSite=Strict cookie**
  path-scoped to `/api/v1/auth` (`REFRESH_TOKEN_EXPIRES_IN` default `7d`). The
  JS never reads the refresh token. Refresh rotation with token-family reuse
  detection. **Login is email + password only — there is NO OTP on login.** OTP
  is used _only_ for the password-reset flow and email verification.
- **RBAC:** DB-backed. `PermissionKeys` in `packages/api-contracts/src/rbac.ts`
  is the catalog; keys are `resource.action` (e.g. `users.read`). Roles are
  many-to-many with permissions; users many-to-many with roles. Effective
  permissions resolved server-side by `AuthorizationService.getContext` and
  enforced by a `requirePermission(key)` preHandler on every protected route.
  `SystemRoles` = `SUPER_ADMIN | ADMIN | MANAGER | SUPPORT | VIEWER`.
- **Response envelopes (two coexist):**
  - Legacy `{ success: true, data }` — auth, `/users/me`, all `/admin` RBAC routes.
  - Canonical `{ data }` (single) / `{ data, meta }` (collection) — `GET /users`.
- **Pagination:** `OffsetPageMeta` = `{ page, pageSize, total, totalPages }`;
  query `{ page, pageSize }` (default 25, max 100). A cursor variant exists but
  is unused by the admin surface.
- **Error envelope:** `{ error: { code, message, statusCode, requestId?, details?,
timestamp, path?, retryAfter? } }`. Clients branch on the **stable `code`**,
  never the message. `requirePermission` denials use a slightly different shape
  `{ success:false, error:{ message, statusCode } }` — the client must tolerate both.

### 1.3 Database (Prisma) — relevant models

`prisma/migrations` includes `add_rbac`, `add_refresh_tokens`,
`add_lockout_and_token_family`, `add_otp_and_password_reset`. Relevant entities:
`User` (with scalar legacy `role`, lockout fields, `emailVerifiedAt`,
`passwordChangedAt`), `Role`, `Permission`, `RolePermission`, `UserRole`,
`RefreshToken` (token/family/expiresAt/revokedAt), OTP/password-reset tables.
The seed provisions 26 permissions, the 5 system roles, and one SUPER_ADMIN.

### 1.4 Existing `apps/admin` (what's already there)

Already implements the full Phase-1 surface (Dashboard, Auth, Users, Roles,
Permissions, Settings, i18n, Themes, Tables, Forms) on the stack in §0, wired to
the real API via `@app/api-contracts`. Structure:

```text
apps/admin/src/
├── app/{providers, router, router/route-config.ts, protected-route.tsx}
├── components/{ui, data-table, forms, feedback, layout, common}
├── layouts/{admin, auth}
├── modules/{auth, dashboard, users, roles, permissions, settings, errors}
├── hooks/            # use-url-table-state
├── i18n/             # config + en locale namespaces
├── lib/              # api-client, errors, notify, query-client, utils
├── stores/           # auth.store (Zustand)
├── styles/           # globals.css (theme tokens)
└── test/             # Vitest setup + helpers
```

This existing structure is **the recommended architecture**, with two naming
deltas from the generic template in §6 (documented there): `modules/` instead of
`features/`, and a shared `@app/api-contracts` endpoint registry instead of a
local `api/endpoints.ts`.

---

## 2. Slash Admin Analysis (`_Reference/slash-admin-main`) — verified

Slash Admin's actual stack (from its `package.json` + source): React **19**,
**react-router 7**, **Ant Design 5** + Tailwind v4 + Radix + **vanilla-extract**

- styled-components, **axios**, TanStack Query, Zustand, react-hook-form + zod,
  **i18next + i18next-browser-languagedetector**, sonner, **MSW + Faker** mocks,
  apexcharts, multi-tab layout, `@dnd-kit`, FullCalendar, react-quill.

### 2.1 Analysis table

| Slash Admin Area             | Relevant? | Reuse                                                                      | Modify                                                                        | Ignore                                                                  | Reason / What exactly                                                                                                             |
| ---------------------------- | --------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Layout** (dashboard shell) | Yes       | Pattern: sidebar + header + content shell                                  | Rebuild in Tailwind/shadcn; drop Ant Design + multi-tab + vanilla-extract     | Multi-tab, horizontal/RTL variants, FullCalendar                        | Concept is right; the AntD/vanilla-extract implementation conflicts with this project's shadcn/Tailwind stack. → `layouts/admin`. |
| **Sidebar**                  | Yes       | Pattern: permission-filtered nav sections driven by nav-data               | Drive from local `route-config.ts` + `usePermissions`; Tailwind styling       | AntD Menu, `@dnd-kit` sorting                                           | Nav must hide links the user lacks. Already implemented in `components/layout/sidebar.tsx`.                                       |
| **Header**                   | Yes       | Pattern: breadcrumbs + theme switch + account dropdown + search            | Rebuild with shadcn dropdown; drop AntD                                       | Notice center, fullscreen, search-command palette (later)               | → `components/layout/header.tsx`.                                                                                                 |
| **Dashboard**                | Partial   | Pattern: KPI cards + charts + activity grid                                | Use recharts (not apexcharts); feed via a metrics abstraction                 | Demo widgets, mock analytics, calendar/banners                          | No backend metrics endpoint → derive from real endpoints + placeholder chart.                                                     |
| **Authentication**           | Partial   | Pattern: auth guard + login form + auth layout                             | Match THIS backend: JWT-in-body + httpOnly refresh cookie; OTP only for reset | `/auth/signin` mock, username-based login, `permissions[].code` model   | Slash Admin auth is mock-only (see §32). Adapt to real endpoints.                                                                 |
| **Users**                    | Partial   | Pattern: table page + form                                                 | Wire to real `GET /users` (paginated) + role-assignment endpoint              | Mock user service, create/edit forms that assume nonexistent routes     | Backend lacks create/update/delete users.                                                                                         |
| **Roles**                    | Yes       | Pattern: role list + permission assignment editor                          | Wire to real `/admin/roles` CRUD + `PUT /admin/roles/:id/permissions`         | Mock role/menu service                                                  | Real CRUD exists — good fit.                                                                                                      |
| **Permissions**              | Yes       | Pattern: grouped permission display                                        | Group by `resource` prefix from `GET /admin/permissions`                      | Menu-permission tree tied to Slash Admin's menu entity                  | Read-only registry in this backend.                                                                                               |
| **Settings**                 | Partial   | Pattern: tabbed settings (profile/appearance/security)                     | Only backend-supported actions                                                | Font/layout/RTL/multi-tab/color-preset settings drawer                  | Backend has change-password + logout-all, but no profile-update.                                                                  |
| **i18n**                     | Yes       | Pattern: i18next + namespaced locale files + language switch + persistence | Use plain `en` (this project), keep `zh_CN` out                               | `zh_CN` bundle, language-detector (optional)                            | Structure is directly reusable. Already implemented with namespaces.                                                              |
| **Themes**                   | Yes       | Pattern: central theme provider + persisted mode + system detection        | shadcn HSL-token model + `.dark` class (not vanilla-extract + AntD adapter)   | AntD theme adapter, color-preset engine, `themeStretch`/font tokens     | Centralized light/dark/system already implemented.                                                                                |
| **Tables**                   | Yes       | Pattern: one reusable DataTable for all resources                          | Build on shadcn table primitives; server-side pagination                      | AntD Table, its column/DnD features                                     | Shared `components/data-table` already implemented.                                                                               |
| **Forms**                    | Yes       | Pattern: RHF + zod + a `Form` field abstraction                            | shadcn form field + zod resolvers                                             | AntD Form, react-quill editor                                           | Directly reusable. Already implemented (`components/forms`).                                                                      |
| **State management**         | Yes       | Pattern: Zustand (client) + TanStack Query (server); `actions` namespace   | Split auth vs settings stores as needed                                       | Their exact `userStore`/`settingStore` shapes (token model differs)     | Concept adopted; shapes adapted to this backend's session model.                                                                  |
| **API layer**                | Yes       | Pattern: one central client + per-resource service modules                 | Use `fetch` (not axios) + contract registry; envelope-aware; 401 refresh      | axios instance, hardcoded `Bearer Token`, their `Result`/`ResultStatus` | Their client sends a literal `"Bearer Token"` (mock). Ours attaches the real JWT + silent refresh.                                |
| **Routing**                  | Yes       | Pattern: sections (auth/dashboard/main) + guards + lazy pages              | React Router 6 (project) not 7; permission-aware route config                 | react-router-7 APIs, backend-driven menu routing                        | Centralized route config already implemented.                                                                                     |

### 2.2 What to take, concretely

- **Reuse (as patterns):** the auth-guard + permission-check hook shape
  (`check/checkAny/checkAll`), the permission-filtered nav, the central API
  client + per-resource services, the i18next namespaced locale layout, the
  central theme provider, the single reusable DataTable, and the RHF+zod form
  abstraction. All of these already have concrete equivalents in `apps/admin`.
- **Modify:** everything that assumes Ant Design, vanilla-extract, axios,
  react-router 7, or Slash Admin's `permissions[].code` object shape — this
  project uses flat permission **strings** (`users.read`), shadcn/Tailwind,
  `fetch`, and RR6.
- **Ignore:** MSW/Faker mocks, demo pages, multi-tab shell, FullCalendar,
  react-quill, color-preset/RTL/font settings, and the mock auth service.

---

## 3. Recommended Production Architecture

### 3.1 Layered model

```text
React Page (route element)
        ↓
Feature component (modules/<feature>/components)
        ↓
Feature hook (TanStack Query / mutation)   ← modules/<feature>/hooks
        ↓
Feature API service (modules/<feature>/api/*.api.ts)
        ↓
Central API client (lib/api-client.ts)
        ↓
Shared endpoint contracts (@app/api-contracts)
        ↓
Fastify API (/api/v1)
```

Client vs server state is strictly separated (see §7).

### 3.2 Framework decision

**Keep React 18 + TypeScript + Vite + React Router 6.** Rationale: it's the
established project stack, the shared contracts package is TS/TypeBox, and there
is no benefit to matching Slash Admin's React 19 / RR7. Do **not** introduce
Ant Design, vanilla-extract, styled-components, or axios.

### 3.3 State decision

| Concern                                                   | Home                                  | Why                                                              |
| --------------------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------- |
| Users/Roles/Permissions/`/users/me`/dashboard data        | **TanStack Query**                    | Server state: caching, refetch, invalidation.                    |
| Access token + current user + effective roles/permissions | **Zustand** (`auth.store`, persisted) | Drives every request + permission-aware UI; legitimately global. |
| Theme, language                                           | **Local providers + localStorage**    | UI preference, not server data.                                  |
| Table filters (search/sort/page/role)                     | **URL query params**                  | Bookmarkable, shareable, refresh-safe (`useUrlTableState`).      |
| Dialog open, form fields                                  | **React local state / RHF**           | Ephemeral UI.                                                    |

Do not store server datasets in Zustand.

---

## 4. API Architecture

### 4.1 Structure (as implemented, mapped to the §6 template)

The generic template says `src/api/{client,endpoints,auth.api,users.api,...}`.
This project realizes the same responsibilities as:

- `lib/api-client.ts` → the central client (template `api/client.ts`).
- `@app/api-contracts` → the endpoint registry + contracts (template
  `api/endpoints.ts`), shared with the backend. **Do not duplicate a local
  `endpoints.ts`.**
- `modules/<feature>/api/*.api.ts` → per-resource services (`auth.api.ts`,
  `users.api.ts`, `roles.api.ts`, …), co-located with their feature.

### 4.2 Central client responsibilities (implemented in `lib/api-client.ts`)

- Base URL from `config.apiBaseUrl` (empty in dev → Vite proxy to `:3000`).
- Attach `Authorization: Bearer <accessToken>`; send `credentials: 'include'`.
- **Request timeout** via `AbortController` (`VITE_API_TIMEOUT_MS`, default 30s).
- Parse both envelope conventions; unwrap `.data` for simple calls, return full
  body for contract calls.
- Normalize failures to a typed `ApiError { message, statusCode, requestId, code }`.
- **Silent refresh:** on `401`, single-flight `POST /api/v1/auth/refresh`
  (cookie), retry once; on failure clear session + redirect to `/login`.

### 4.3 Error normalization

`lib/errors.ts#mapApiError(error, t)` maps the stable `code` → a localized
message (`INVALID_CREDENTIALS`, `RATE_LIMITED`, `FORBIDDEN`, `NOT_FOUND`,
`CONFLICT`, `VALIDATION_ERROR`, `TIMEOUT`, `NETWORK_ERROR`, …). `getRequestId`
surfaces the server request id in error UIs for log correlation. Components never
parse HTTP status codes themselves.

---

## 5. Endpoint Centralization (actual backend routes)

Endpoints come from `@app/api-contracts` (`API_ENDPOINTS` / `API_CONTRACTS`),
which already carry the `/api/v1` prefix. The table below is the authoritative
map; **items marked _Backend endpoint required_ do not exist yet.**

```ts
// Conceptual view — real values live in @app/api-contracts, not re-declared here.
API_ENDPOINTS = {
  auth: {
    login: "/api/v1/auth/login", // ✅ email+password
    logout: "/api/v1/auth/logout", // ✅ cookie
    logoutAll: "/api/v1/auth/logout-all", // ✅
    refresh: "/api/v1/auth/refresh", // ✅ cookie
    me: "/api/v1/users/me", // ✅ profile+roles+perms
    changePassword: "/api/v1/auth/change-password", // ✅
    forgotPassword: "/api/v1/auth/forgot-password", // ✅ OTP email
    verifyResetOtp: "/api/v1/auth/password-reset/verify", // ✅ → resetToken
    resetPassword: "/api/v1/auth/password-reset/confirm", // ✅
    verifyEmail: "/api/v1/auth/verify-email", // ✅ (not used by admin yet)
    // NOTE: there is NO login-time OTP endpoint. Do not add "verifyOtp" for login.
  },
  users: {
    list: "/api/v1/users", // ✅ paginated {data,meta}
    detail: (id) => "/api/v1/users/:userId", // ✅ (implemented — users.read)
    create: "/api/v1/users", // ✅ (implemented — users.create)
    update: (id) => "/api/v1/users/:userId", // ✅ (implemented — users.update)
    delete: (id) => "/api/v1/users/:userId", // ✅ (implemented — users.delete)
    updateMe: "/api/v1/users/me", // ✅ (implemented — self, PATCH)
    getRoles: (id) => "/api/v1/admin/users/:id/roles", // ✅
    setRoles: (id) => "/api/v1/admin/users/:id/roles", // ✅ PUT (replace)
  },
  roles: {
    list: "/api/v1/admin/roles", // ✅
    create: "/api/v1/admin/roles", // ✅
    detail: (id) => "/api/v1/admin/roles/:id", // ✅
    update: (id) => "/api/v1/admin/roles/:id", // ✅ PATCH
    setPermissions: (id) => "/api/v1/admin/roles/:id/permissions", // ✅ PUT
    delete: (id) => "/api/v1/admin/roles/:id", // ✅
  },
  permissions: { list: "/api/v1/admin/permissions" }, // ✅ read-only
  settings: {
    profileRead: "/api/v1/users/me", // ✅
    profileUpdate: "/api/v1/users/me", // ✅ (implemented — PATCH /me, self)
    preferences: "(frontend-only)", // theme/language persisted locally
  },
};
```

**Rule:** never invent an endpoint. If a feature needs one that doesn't exist,
build the UI against the abstraction and mark the wire-up as _Backend endpoint
required_ (as Users create/edit/delete and profile-update are today).

---

## 6. Recommended Folder Structure

The **existing** `apps/admin/src` layout is the recommendation. Below, the
generic template (from the brief) is shown with the project's realized mapping:

```text
apps/admin/src/
├── app/
│   ├── providers/      # ThemeProvider + composed AppProviders (Query, Toaster, i18n)
│   ├── router.tsx      # route tree (lazy pages, guards, layouts)
│   ├── router/         # route-config.ts (nav+permission+breadcrumb metadata), permission-route.tsx
│   └── protected-route.tsx
├── components/
│   ├── ui/             # shadcn-style primitives (Button, Card, Dialog, Table, …)
│   ├── data-table/     # reusable DataTable + pagination + search + types
│   ├── forms/          # FormField / TextField / FieldError
│   ├── feedback/       # Loading / EmptyState / ErrorState / ConfirmDialog / ErrorBoundary
│   ├── layout/         # sidebar, header, breadcrumbs, user-menu, theme-switcher
│   └── common/         # PageHeader
├── layouts/{admin, auth}
├── modules/            # ← template's "features/"
│   ├── auth/{api, components, hooks, stores, schemas.ts, types.ts}
│   ├── dashboard/{api, components, hooks}
│   ├── users/{api, components, hooks, types.ts}
│   ├── roles/{api, components, hooks, schemas.ts}
│   ├── permissions/{components, hooks, lib}
│   ├── settings/{components, hooks}
│   └── errors/         # forbidden-page, not-found-page
├── hooks/              # cross-feature (use-url-table-state)
├── i18n/{index.ts, config.ts, locales/en/*.json}
├── lib/                # api-client, errors, notify, query-client, utils  ← template's "api/" + "lib/"
├── stores/             # auth.store (Zustand)
├── styles/globals.css  # ← template's "themes/" (token source)
└── test/               # Vitest setup + test-utils
```

Per-directory rules:

- `components/ui`, `components/data-table`, `components/forms`, `components/feedback`
  — **generic, reusable, dumb.** MUST NOT import from `modules/*`, `lib/api-*`,
  or the auth store. Data comes via props.
- `modules/<feature>` — feature-specific UI + hooks + api service + schemas. MAY
  depend on `components/*`, `lib/*`, `stores/*`, and `@app/api-contracts`.
- `lib/` — cross-cutting infra (client, errors, notify, utils). MUST NOT import
  from `modules/*`.
- `stores/` — global client state only. `i18n/`, `styles/` — presentation infra.

**Naming deltas from the template (intentional):** `modules/` ≡ template
`features/`; contract registry replaces `api/endpoints.ts`; `styles/globals.css`
replaces a `themes/` dir; there is no top-level `types/`/`constants/` because
shared types come from `@app/api-contracts` and constants live with their
feature/route-config.

---

## 7. Architecture Decisions (summary)

- **Framework:** React 18 + Vite + RR6 (keep). No AntD.
- **Routing:** central `route-config.ts` metadata (`path, titleKey, icon,
permission, section`) drives router + nav + breadcrumbs. Public auth routes
  under a shared `AuthLayout`; protected routes under `ProtectedRoute` →
  `AdminLayout` → per-route `PermissionRoute`. Pages are **lazy-loaded**.
- **State:** see §3.3.
- **Styling/Theme:** Tailwind + shadcn HSL tokens; one `ThemeProvider`.

---

## 8. Authentication Architecture

### 8.1 Flow (matches the real backend — no login OTP)

```text
User
 ↓  POST /auth/login { email, password }        (email+password ONLY)
Credentials validated by API
 ↓  200 { data: { accessToken, user } } + Set-Cookie: refreshToken (httpOnly)
Store accessToken + user (Zustand)
 ↓
GET /users/me  → { id,email,name,role, roles[], permissions[] }
 ↓  sync roles/permissions into the auth store
Dashboard (permission-aware UI now available)
```

Password recovery is the **only** OTP path:

```text
/forgot-password { email } → generic OK (+ OTP emailed)
   ↓
/password-reset/verify { email, otp } → { resetToken, expiresAt }
   ↓
/password-reset/confirm { resetToken, newPassword } → OK (all sessions revoked)
   ↓  redirect to /login
```

### 8.2 Session rules

- **Stored in browser:** access token + user + effective roles/permissions
  (Zustand, persisted). This is for bootstrap/UX; `/users/me` is the source of truth.
- **Never stored by JS:** the refresh token (HTTP-only cookie, browser-managed).
- **Session expiration / 401:** central client tries **one** silent refresh
  (single-flight). Success → retry the request; failure → clear session +
  redirect to `/login` (guard against redirect loops on auth pages).
- **Token refresh:** `POST /auth/refresh` (no body; cookie carries the token);
  returns a new access token and rotates the cookie.
- **Logout:** `POST /auth/logout` (best-effort server revocation) then clear
  local session + query cache regardless; `logout-all` + `change-password`
  revoke all sessions server-side.
- **403 handling:** render a Forbidden page/state; do not attempt refresh.

---

## 9. RBAC Architecture

### 9.1 Backend relationship (verified)

```text
User ──< UserRole >── Role ──< RolePermission >── Permission (key: resource.action)
```

Effective permissions are the union across a user's roles, resolved server-side
and returned by `GET /users/me` as flat **string arrays** `roles[]` +
`permissions[]`. (Note: Slash Admin models permissions as objects with `.code`;
this project uses plain strings — do not copy the `.code` shape.)

### 9.2 Frontend layer

- `usePermissions()` → `can / canAny / canAll / hasRole / hasAnyRole / hasAllRoles`
  reading the auth store.
- `<PermissionGate permission|anyOf|allOf fallback>` → hides buttons/actions.
- Sidebar filters links by each route's `permission` (route-config).
- `<PermissionRoute permission>` → gates a route, renders the 403 page on denial
  (waits for `/users/me` to settle to avoid a false-403 flash on hard refresh).

> **Frontend RBAC is a UI/UX layer only. The backend `requirePermission` is the
> real authorization boundary and re-checks every protected operation.**

---

## 10. Permission Naming

Adopt the backend's existing convention verbatim: **`resource.action`**, lowercase.
Current catalog (from `PermissionKeys`): `dashboard.read`; `users.read/create/
update/delete`; `users.roles.read/update`; `roles.read/create/update/delete`;
`permissions.read`; `todos.*`; `orders.*`; `audit.read`; `metrics.read`;
`settings.read/update`. Future logistics keys (`shipment.view`, `driver.view`, …)
slot into the same scheme with **no frontend changes** — the grouped Permissions
UI buckets by the `resource` prefix automatically. Permission keys are
language-independent and must never be translated.

---

## 11. Route Architecture

```text
Public (AuthLayout):
  /login                       (implemented)
  /forgot-password             (implemented)
  /verify-otp                  (implemented — reset OTP, NOT login OTP)
  /reset-password              (implemented)

Protected (ProtectedRoute → AdminLayout → PermissionRoute):
  /dashboard        perm dashboard.read
  /users            perm users.read
  /roles            perm roles.read
  /permissions      perm permissions.read
  /settings         (any authenticated user; ?tab=profile|appearance|security)
  /                 → redirect /dashboard

Fallbacks:
  403  ForbiddenPage (rendered by PermissionRoute on denial)
  *    NotFoundPage (404)
```

Route shapes vs the generic brief: user/role **create/edit/detail** are realized
as **dialogs** on the list pages (not `/users/:id/edit` routes). This is a
deliberate, valid deviation; if dedicated detail routes are wanted later, add
them under the same permission gates.

---

## 12. Dashboard Architecture

- Layout: `PageHeader` + KPI `StatCard` grid + `SignupsChart` (recharts) +
  `QuickActions`. Components receive data via props (no fetching inside generic
  cards).
- Data: `modules/dashboard/api/dashboard.api.ts` is a **metrics abstraction**.
  Because there is **no backend metrics endpoint** (_Backend endpoint required_),
  it currently derives real counts from existing endpoints (users `meta.total`,
  roles count, permissions count) and supplies a clearly-labelled placeholder
  chart series with a visible "placeholder data" notice. When a real
  `GET /admin/dashboard` (or logistics metrics) lands, only this file changes.
- States: loading (skeletons), empty, error (with retry + requestId) all present.

---

## 13. Users Architecture

- **Page:** `modules/users/components/users-page.tsx` — `DataTable` with
  server-side search (name/email), role filter, sortable `name/email/createdAt`,
  pagination, column visibility, and a row action to assign roles. Filters are
  URL-synced.
- **API/hooks:** `usersApi.list/me/getRoles/setRoles`; `useUsers` (keepPrevious),
  `useUserRoles`, `useSetUserRoles`.
- **Role assignment:** `AssignRolesDialog` → `PUT /admin/users/:id/roles`
  (permission `users.roles.update`), with confirmation semantics.
- **Types:** from `@app/api-contracts` (`UserListItem`, `ListUsersQuery`, …).
- **Backend endpoint required:** create user, edit user, user detail, status
  management, delete/deactivate, bulk actions. Surface as informative notices,
  not dead buttons, until routes exist.

---

## 14. Roles Architecture

- **Page:** roles `DataTable` + create/edit dialog + delete confirmation;
  system roles are protected in the UI.
- **API/hooks:** `rolesApi.list/get/create/update/setPermissions/remove`;
  `useRoles/useCreateRole/useUpdateRole/useDeleteRole`.
- **Permission editor:** `RoleFormDialog` chooses permissions from the live
  registry, grouped by resource; create sends name+description+permissions,
  edit sends description+permissions (name is immutable per `UpdateRoleBody`).
- **Required permissions:** `roles.read/create/update/delete`.

---

## 15. Permissions Architecture

Read-only registry from `GET /admin/permissions`, **grouped by `resource`
prefix** (`groupPermissionsByResource`) into cards, with client-side search.
Grouping by resource is the clearest and most scalable choice — it stays
readable when hundreds of logistics permissions are added, with zero page
changes. Required permission: `permissions.read`.

---

## 16. Settings Architecture

Tabbed shell (`?tab=`), only backend-supported actions:

- **Profile** — read-only view from `/users/me` (+ notice). _Backend endpoint
  required_ for editing.
- **Appearance** — theme (light/dark/system) + language. **Frontend-only
  preferences**, persisted in `localStorage`.
- **Security** — change password (`/auth/change-password`) and sign-out-
  everywhere (`/auth/logout-all`); both revoke sessions server-side → redirect to
  login. Active-session listing and MFA are _Backend endpoint required_.

---

## 17. i18n Architecture

- **Library:** i18next + react-i18next (matches Slash Admin's pattern).
- **Structure:** `i18n/index.ts` (init) + `config.ts` + `locales/en/*.json`.
- **Namespaces:** `common, nav, auth, users, roles, permissions, settings,
dashboard, validation`.
- **Language switching + persistence:** `setLanguage()` writes `localStorage`
  and calls `changeLanguage`; `fallbackLng: en`. Optional
  `i18next-browser-languagedetector` can be added like Slash Admin, but is not
  required for a single language.
- **Rules:** translate navigation, titles, buttons, form labels, validation and
  API-error messages, toasts, dialogs, table labels, empty/error states. **Never**
  translate permission keys, endpoint names, or DB identifiers.

---

## 18. Theme Architecture

- **Provider:** one `ThemeProvider` toggles `.dark` on `<html>`; all colors are
  HSL CSS variables in `styles/globals.css` (shadcn model).
- **Modes:** light / dark / system; `system` reacts live to the OS via
  `matchMedia`. Persisted in `localStorage`.
- **Compatibility:** tables, dialogs, dropdowns, forms, sidebar, auth, and the
  recharts chart (which references `hsl(var(--primary))`) all theme correctly.
- Do **not** duplicate theme state across stores. Do not port Slash Admin's AntD
  theme adapter or color-preset engine.

---

## 19. DataTable Architecture

One generic `DataTable<T>` (`components/data-table`) with:
column defs (`{ id, header, cell, sortKey?, hidden?, alwaysVisible? }`),
server-side sort + pagination (`OffsetPageMeta`), a toolbar slot
(search + filters), column-visibility menu, row actions, and integrated
loading/empty/error states (empty distinguishes "no data" vs "no results").
`useUrlTableState` syncs `page/pageSize/search/sort/filters` to the URL. The same
component already backs Users, Roles, and Permissions and will back
`ShipmentsTable`/`DriversTable`/`OrdersTable` unchanged.

---

## 20. Forms Architecture

react-hook-form + zod (`@hookform/resolvers`). `components/forms/form-field.tsx`
provides `FormField`, `TextField` (label + input + error, ref-forwarded for
`register`), and `FieldError` (resolves i18n message keys). Client validation
schemas **mirror** the backend TypeBox contracts (email format, 8–128 char
password, 6-digit OTP, role name 2–64) but the backend remains authoritative.
States handled: default values, submitting, success (toast), field errors,
server-validation errors, reset. Works for auth, role, and settings forms today;
future shipment/driver forms reuse the same primitives.

---

## 21. Error Handling

Central `mapApiError(error, t)` + typed `ApiError.code`:

| Status / condition | Code(s)                         | UI behavior                                           |
| ------------------ | ------------------------------- | ----------------------------------------------------- |
| 400                | `VALIDATION_ERROR`              | inline field/form errors; message toast               |
| 401                | `UNAUTHORIZED`/`TOKEN_*`        | silent refresh → retry; else clear session → `/login` |
| 403                | `FORBIDDEN`                     | Forbidden page/state (no refresh)                     |
| 404                | `NOT_FOUND`                     | not-found state / 404 route                           |
| 409                | `CONFLICT`                      | conflict message (e.g. duplicate role)                |
| 422                | `VALIDATION_ERROR`              | field errors (backend uses 400 today)                 |
| 429                | `RATE_LIMITED`/`ACCOUNT_LOCKED` | "try again later" (+ retryAfter)                      |
| 500                | `INTERNAL_ERROR`                | generic error + requestId                             |
| network            | `NETWORK_ERROR`                 | "check your connection"                               |
| timeout            | `TIMEOUT`                       | "request timed out" (AbortController)                 |

Uncaught render errors are contained by `ErrorBoundary` (app-level in `main.tsx`

- per-page in `AdminLayout`, keyed by pathname). No stack traces to users;
  `requestId` shown for support/log correlation.

---

## 22. Loading / Empty / Error UX

Reusable: `Loading` (spinner), skeleton rows in the DataTable, button spinners
during submit/delete, `EmptyState` (variant `empty` vs `no-results`), `ErrorState`
(message + requestId + retry). No blank screens on any async page.

---

## 23. Dependency Rules

```text
components/ui, components/forms, components/feedback, components/data-table
        ▲ (imported by)
modules/<feature>/components
        ▲
modules/<feature>/hooks
        ▲
modules/<feature>/api  →  lib/api-client  →  @app/api-contracts
```

Forbidden edges: generic `components/*` → `modules/*`; `components/*` →
`lib/api-*`; `components/*` → `stores/auth`; `lib/*` → `modules/*`. Enforced by
convention today; can be hardened later with an import-boundary lint rule.

---

## 24. Testing Architecture

- **Unit:** permission helpers/auth store, `mapApiError`, `groupPermissions`,
  URL-table-state.
- **Component:** `PermissionGate`, `ProtectedRoute`, `PermissionRoute` (403/
  loading/allowed), form field rendering.
- **Integration:** login flow (success/failure/validation), logout, API-client
  401→refresh→retry, timeout/network normalization, role assignment services.
- **E2E (future):** login→dashboard, permission-denied redirect, role assignment
  round-trip against a running API. _(Not yet present; recommended once flows are
  stable — do not over-engineer before then.)_

Tooling: Vitest + React Testing Library + jsdom (`vitest.config.ts`,
`src/test/setup.ts`, `renderWithProviders`). The above unit/component/integration
layers are already implemented (48 tests). E2E is the main open item.

---

## 25. Security Review

| Area           | Frontend responsibility                                     | Backend responsibility               |
| -------------- | ----------------------------------------------------------- | ------------------------------------ |
| Access token   | Hold in memory/persisted store; attach as Bearer; never log | Sign/verify (HS256), short TTL       |
| Refresh token  | Never read/store in JS (httpOnly cookie)                    | Issue/rotate/revoke; reuse detection |
| Authorization  | UX gating only (`can()`, guards)                            | **Enforce every permission**         |
| XSS            | No `dangerouslySetInnerHTML`; rely on React escaping        | —                                    |
| CSRF           | Refresh cookie is `SameSite=Strict`, path-scoped            | Cookie flags + strict SameSite       |
| Env/secrets    | Only `VITE_*` (public) — never secrets                      | Holds all real secrets               |
| Error messages | Show mapped message + requestId; no stack traces            | Stable codes + requestId             |
| Session        | Central 401 handling; clear on logout/expiry                | Revoke on logout/change-password     |

Risks specific to this repo are enumerated in §28.

---

## 26. Performance Architecture

Lazy-load all route pages (implemented); manual vendor chunking
(`react-vendor`/`query-vendor`/`charts`) so `recharts` only loads on the
dashboard; TanStack Query caching + `keepPreviousData` for paged lists;
**server-side** pagination (never download all rows); no premature memoization.
Table virtualization only if a genuinely large, non-paginated list appears.

---

## 27. Accessibility

Keyboard navigation and visible focus rings on all interactive elements; Radix
primitives for accessible dialogs/menus/switch; labeled form fields with
`aria-invalid` and `role="alert"` errors; semantic `<button>`/`<table>`; theme
tokens chosen for contrast in both modes; state never conveyed by color alone.
Full WCAG conformance requires manual screen-reader testing (out of scope for
static analysis) and is the recommended pre-launch audit.

---

## 28. Migration Strategy (`_Reference/slash-admin-main` → `apps/admin`)

Since `apps/admin` already exists, "migration" means _continuing_ to derive
patterns, not copying files:

- **Copy:** nothing verbatim. Slash Admin stays read-only reference.
- **Recreate (pattern → this stack):** any remaining Slash Admin idea not yet
  adopted (e.g. a command-palette search, a notice center) is rebuilt in
  shadcn/Tailwind + `fetch` + RR6, wired to real contracts.
- **Adapt:** permission model (`.code` → string), auth (mock → real JWT+cookie),
  client (axios → `fetch`), theme (vanilla-extract/AntD → HSL tokens).
- **Delete/never introduce:** MSW/Faker, demo pages, multi-tab shell,
  FullCalendar, react-quill, color-preset/RTL/font settings.
- **Keep as reference only:** `_Reference/slash-admin-main` in its entirety.

---

## 29. Do NOT Copy These Blindly

| Slash Admin item                                                    | Why not                                                              |
| ------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `_mock/` + MSW + Faker                                              | Development/mock-only; must never reach production (§35 risk).       |
| `apiClient.ts` hardcoded `Authorization: "Bearer Token"`            | Mock auth; real client attaches the JWT + silent refresh.            |
| `userService` (`/auth/signin`, username login)                      | Endpoints/shape don't match this backend (`/auth/login`, email).     |
| `permissions[].code` object model                                   | This backend uses flat permission strings.                           |
| Ant Design + vanilla-extract + styled-components                    | Conflicts with the shadcn/Tailwind stack; duplicate styling systems. |
| Multi-tab layout, `@dnd-kit`, FullCalendar, react-quill, apexcharts | Demo/heavy features outside current scope; bundle bloat.             |
| Color-preset / RTL / font-size settings drawer                      | Not backed by requirements; adds config surface with no backend.     |
| react-router 7 APIs                                                 | Project uses RR6.                                                    |

---

## 30. Implementation Phases (roadmap)

The project already executed Phases 1–13 below; each entry lists objective /
files / deps / tasks / acceptance / risk, and marks current status.

1. **Foundation** — _Done._ Vite/TS/Tailwind/shadcn, providers, config, `.env`.
   Accept: app boots, typecheck/build pass. Risk: over-copying reference.
2. **Layout + Theme** — _Done._ `layouts/*`, `ThemeProvider`, sidebar/header.
   Accept: light/dark/system persists across all surfaces.
3. **Central API client** — _Done._ `lib/api-client.ts` (envelope-aware, 401
   refresh, timeout). Accept: no `fetch` in components; typed errors.
4. **Authentication** — _Done._ login + reset flow + guards + session bootstrap.
   Accept: login→dashboard; expiry→refresh→retry or logout. Risk: auth mismatch.
5. **RBAC** — _Done._ `usePermissions`, `PermissionGate`, `PermissionRoute`,
   route-config. Accept: nav/routes/actions gate correctly; backend still enforces.
6. **Users** — _Partial._ list+role-assignment done; create/edit/delete
   _Backend endpoint required_. Accept: paginated list, filters, role assign.
7. **Roles** — _Done._ CRUD + permission assignment.
8. **Permissions** — _Done._ grouped read-only registry.
9. **Dashboard** — _Done (data abstracted)._ metrics endpoint _required_ later.
10. **Settings** — _Partial._ profile read-only (_update required_), appearance,
    security.
11. **i18n** — _Done._ en namespaces; keys used app-wide.
12. **Shared Tables + Forms** — _Done._ one DataTable; RHF+zod forms.
13. **Testing + Hardening** — _Mostly done._ unit/component/integration + lint +
    error boundary + timeout; **E2E outstanding**.

Recommended **next** work (net-new): backend routes for user CRUD, profile
update, and dashboard metrics; then wire the already-abstracted UI to them; add
E2E for the critical flows.

---

## 31. Definition of Done (initial Admin Frontend)

| Criterion                                                   | Status                      |
| ----------------------------------------------------------- | --------------------------- |
| Application starts successfully                             | ✅                          |
| Authentication works (login/logout/reset/refresh)           | ✅                          |
| Protected routes work                                       | ✅                          |
| RBAC works (nav/route/action gating; backend authoritative) | ✅                          |
| Users work (list/search/filter/sort/paginate/role-assign)   | ✅ (CRUD ⚠ backend)         |
| Roles work (CRUD + permission assignment)                   | ✅                          |
| Permissions work (grouped, scalable)                        | ✅                          |
| Dashboard works (loading/empty/error; API-ready)            | ✅ (metrics ⚠ backend)      |
| Settings work (profile view / appearance / security)        | ✅ (profile edit ⚠ backend) |
| Theme works (light/dark/system, persisted)                  | ✅                          |
| i18n works (English, centralized keys)                      | ✅                          |
| Tables work (shared DataTable)                              | ✅                          |
| Forms work (zod + server errors)                            | ✅                          |
| API centralized                                             | ✅                          |
| Errors centralized                                          | ✅                          |
| No secrets exposed                                          | ✅                          |
| TypeScript passes                                           | ✅                          |
| Lint passes (0 errors)                                      | ✅                          |
| Tests pass (48)                                             | ✅ (E2E outstanding)        |
| Production build passes                                     | ✅                          |

---

## 32. Architectural Risks

| Risk                                         | Impact                                     | Mitigation                                                                                        |
| -------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Slash Admin coupling / over-copying          | Drags AntD/vanilla-extract/mocks into prod | Reference-only; adopt patterns, not files (§29).                                                  |
| Duplicate state management                   | Cache incoherence, bugs                    | One rule: server=Query, client=Zustand, URL=filters (§3.3).                                       |
| Duplicate API clients                        | Inconsistent auth/refresh/errors           | Single `lib/api-client.ts`; features use services only.                                           |
| Frontend/backend permission mismatch         | UI shows actions the API rejects           | Frontend gates from `/users/me`; backend `requirePermission` is truth; keys shared via contracts. |
| Auth implementation mismatch                 | Broken login/refresh                       | Built to the real JWT-in-body + httpOnly-cookie + no-login-OTP model.                             |
| Mock API reaching production                 | Data leakage / fake behavior               | No MSW/Faker imported anywhere; app calls the real API only.                                      |
| Large components / tight coupling            | Hard to maintain                           | Feature slices + reusable primitives; dependency rules (§23).                                     |
| Poor table/form abstraction                  | Reinventing per feature                    | One `DataTable`, one form-field abstraction, both proven across features.                         |
| Inventing endpoints                          | Frontend breaks at runtime                 | Contract registry only; missing routes marked _Backend endpoint required_.                        |
| Envelope inconsistency (legacy vs canonical) | Parsing bugs                               | Client handles both centrally.                                                                    |

---

## 33. Final Recommendation

### Recommended architecture

```text
                    Admin Frontend (apps/admin)
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
      Pages          Shared UI          State
   (route els)    (ui/data-table/     (Zustand: auth/theme;
        │           forms/feedback)     Query: server; URL: filters)
        └────────────────┼────────────────┘
                         ▼
                   Feature Layer (modules/*)
                         │
                         ▼
                   API Services (modules/*/api)
                         │
                         ▼
             Central API Client (lib/api-client.ts)
                         │
                  @app/api-contracts (shared TypeBox)
                         │
                         ▼
                     Fastify API (/api/v1)
                         │
             ┌───────────┼───────────┐
             ▼           ▼           ▼
           Auth         RBAC     Business Logic
             │           │           │
             └───────────┼───────────┘
                         ▼
                       Prisma
                         │
                         ▼
                    PostgreSQL
```

### Recommended folder structure

See §6 (the existing `apps/admin/src` layout).

### Recommended dependencies

Keep the current set (React 18, Vite, RR6, Tailwind + shadcn primitives + Radix,
Zustand, TanStack Query, RHF + zod, i18next, recharts, sonner, lucide). Add
nothing from Slash Admin's AntD/vanilla-extract/axios/MSW stack. For E2E, add
Playwright when that phase begins.

### Recommended implementation order

Foundation → Layout/Theme → API client → Auth → RBAC → Users → Roles →
Permissions → Dashboard → Settings → i18n → shared Tables/Forms → Testing.
(Already executed; next: backend routes for user CRUD / profile / metrics, then
wire the abstracted UI + add E2E.)

### Key architectural decisions

1. Shared `@app/api-contracts` is the backbone — types + endpoints, never duplicated.
2. Backend is the security boundary; frontend RBAC is UX only.
3. Server state = TanStack Query; client state = Zustand; filters = URL.
4. One central API client (envelope-aware, silent refresh, timeout, typed errors).
5. One reusable DataTable and one form abstraction across all features.
6. Slash Admin is a pattern reference, adapted to shadcn/Tailwind + `fetch` + RR6.

### Key things to avoid

Copying Slash Admin files/stack wholesale; MSW/Faker in production; inventing
endpoints; duplicate clients/stores; generic UI depending on features; assuming
frontend permission checks are security.

---

_Deliverable of this phase: this document only. No application source, backend
code, or `_Reference/slash-admin-main` was modified._
