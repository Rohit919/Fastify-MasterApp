# Admin Frontend Plan

## Fastify-MasterApp — Production Admin Frontend

**Status:** Planned / Architecture  
**Priority:** P1 — Core Platform  
**Scope:** `apps/admin` + API integration + shared API contracts

---

## 1. Goal

Build a production-quality Admin frontend for Fastify-MasterApp.

The Admin application should provide a consistent interface for:

- authentication;
- dashboard and system overview;
- user management;
- role and permission management;
- operational resources such as orders;
- audit logs;
- application settings;
- profile/session management;
- API error handling;
- loading, empty, and failure states.

The frontend must remain a separate application from the Fastify API.

Recommended architecture:

```text
Fastify-MasterApp
│
├── apps/
│   ├── api/
│   │   └── Fastify API
│   │
│   └── admin/
│       └── React Admin
│
└── packages/
    └── api-contracts/
        └── Shared schemas/types
```

The Admin frontend is a client of the API, not a second backend.

---

# 2. Core Principles

## 2.1 API is the source of truth

The Admin application must never access the database directly.

```text
Admin
  ↓
HTTP API
  ↓
Business logic
  ↓
Database
```

Never:

```text
Admin
  ↓
Prisma
  ↓
Database
```

---

## 2.2 Authorization belongs to the API

The frontend can hide UI elements based on permissions, but it must never be treated as a security boundary.

Example:

```tsx
{can("users.delete") && <DeleteUserButton />}
```

is useful for UX.

But the API must still enforce:

```text
DELETE /users/:id
        ↓
authenticate
        ↓
requirePermission("users.delete")
        ↓
allow / deny
```

---

## 2.3 Server state and client state must remain separate

Use TanStack Query for server state:

```text
Users
Orders
Roles
Permissions
Audit logs
Dashboard data
```

Use Zustand or local React state for client/UI state:

```text
Sidebar state
Modal state
Filters that are purely local
UI preferences
Temporary form state
```

Do not put API collections into Zustand simply because they are globally accessible.

---

## 2.4 Shared contracts

Use:

```text
packages/api-contracts
```

as the shared contract between API and Admin.

The Admin application should not duplicate backend DTOs manually.

---

# 3. Recommended Frontend Structure

Recommended:

```text
apps/admin/
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── router.tsx
│   │   ├── providers.tsx
│   │   └── routes.tsx
│   │
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   ├── data-table/
│   │   ├── forms/
│   │   ├── feedback/
│   │   └── navigation/
│   │
│   ├── features/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── users/
│   │   ├── roles/
│   │   ├── permissions/
│   │   ├── orders/
│   │   ├── audit/
│   │   └── settings/
│   │
│   ├── lib/
│   │   ├── api/
│   │   ├── auth/
│   │   ├── permissions/
│   │   ├── errors/
│   │   └── utils/
│   │
│   ├── stores/
│   │   └── ui/
│   │
│   ├── hooks/
│   ├── config/
│   ├── styles/
│   └── main.tsx
│
├── public/
├── tests/
└── package.json
```

Prefer `features/` or `modules/` over a large global collection of:

```text
components/
services/
types/
pages/
```

for business functionality.

---

# 4. Application Layers

The Admin frontend should have clear boundaries.

```text
UI
 ↓
Feature hooks
 ↓
API client
 ↓
HTTP API
```

Example:

```text
UsersPage
   ↓
useUsers()
   ↓
usersApi.list()
   ↓
GET /users
```

For mutations:

```text
EditUserForm
   ↓
useUpdateUser()
   ↓
usersApi.update()
   ↓
PATCH /users/:id
```

Avoid calling HTTP clients directly from deeply nested UI components.

Bad:

```tsx
const response = await fetch("/api/users");
```

Better:

```tsx
const { data } = useUsers();
```

---

# 5. Routing

Use React Router with route boundaries.

Recommended route structure:

```text
/login

/
/dashboard

/users
/users/:id
/users/:id/edit

/roles
/roles/:id
/roles/:id/edit

/permissions

/orders
/orders/:id

/audit-logs

/settings
```

Authenticated routes should be protected at the application level.

Conceptually:

```text
PublicRoute
  └── /login

ProtectedRoute
  ├── /dashboard
  ├── /users
  ├── /orders
  ├── /roles
  └── /settings
```

Authorization should then be applied at the feature/action level.

---

# 6. Authentication Flow

Recommended flow:

```text
Open Admin
    ↓
Check authenticated session
    ↓
Not authenticated?
    ↓
/login
    ↓
Submit credentials
    ↓
POST /auth/login
    ↓
Authenticated
    ↓
Load current user
    ↓
Load roles/permissions
    ↓
/dashboard
```

The frontend should have one authoritative authentication state.

Recommended:

```text
AuthProvider
    +
current-user query
    +
short-lived access token/session
```

Do not duplicate authentication state across multiple stores.

---

# 7. Token / Session Strategy

Follow the API's authentication design.

Preferred browser strategy:

```text
Access token
    ↓
short-lived

Refresh/session credential
    ↓
secure HttpOnly cookie where applicable
```

Avoid storing long-lived refresh tokens in:

```text
localStorage
sessionStorage
```

unless there is a deliberate security architecture requiring it.

If the backend uses HttpOnly refresh cookies, the Admin should let the browser manage the cookie and use the access/session mechanism defined by the API.

---

# 8. Handling Expired Sessions

When an API request returns:

```text
401
```

the API client should have a centralized strategy.

Conceptually:

```text
Request
  ↓
401
  ↓
Attempt session refresh
  ↓
Success?
 ├── yes → retry original request
 └── no  → clear auth state → /login
```

Do not implement this separately in every feature.

---

# 9. API Client

Create one configured API client.

Example:

```text
src/lib/api/
├── client.ts
├── errors.ts
└── index.ts
```

Feature API functions should sit near their feature:

```text
features/users/
├── api.ts
├── hooks.ts
├── types.ts
├── components/
└── pages/
```

The client should handle:

- base URL;
- authentication;
- headers;
- JSON serialization;
- common errors;
- request IDs;
- 401 handling;
- response parsing.

---

# 10. TanStack Query

Use TanStack Query for API state.

Example query:

```ts
useQuery({
  queryKey: ["users", filters],
  queryFn: () => usersApi.list(filters),
});
```

Example mutation:

```ts
useMutation({
  mutationFn: usersApi.update,
});
```

After successful mutations, invalidate the appropriate queries.

Example:

```text
Update user
   ↓
success
   ↓
invalidate ["users"]
   ↓
refresh user list
```

Avoid manually maintaining duplicate copies of server state.

---

# 11. Query Key Convention

Standardize query keys.

Recommended:

```text
["current-user"]

["users", filters]

["users", userId]

["roles"]

["roles", roleId]

["permissions"]

["orders", filters]

["orders", orderId]

["audit-logs", filters]

["dashboard"]
```

Do not use arbitrary strings across the application.

For larger applications, centralize query key factories.

---

# 12. Dashboard

The dashboard should provide useful operational information rather than becoming a collection of decorative cards.

Recommended first version:

```text
Dashboard
├── Total Users
├── Active Users
├── Total Orders
├── Pending Orders
├── Recent Activity
└── Recent Audit Events
```

The API should provide aggregated dashboard data rather than requiring the frontend to make many unrelated requests.

Prefer:

```text
GET /admin/dashboard
```

over:

```text
GET /users/count
GET /orders/count
GET /orders/pending/count
GET /audit/recent
GET /users/recent
```

for every dashboard load.

---

# 13. User Management

Recommended functionality:

```text
Users
├── List
├── Search
├── Filter
├── Sort
├── Pagination
├── View
├── Edit
├── Activate / deactivate
├── Assign roles
└── Delete where permitted
```

List columns might include:

```text
Name
Email
Status
Roles
Created
Last active
Actions
```

Do not expose sensitive information unnecessarily.

---

# 14. User Details

Recommended user page:

```text
User
├── Profile
├── Roles
├── Permissions
├── Sessions
└── Activity
```

For permissions, distinguish:

```text
Direct permissions
```

from:

```text
Effective permissions
```

If the project only uses role-based permissions, show:

```text
Role
  ↓
Effective permissions
```

rather than pretending users have independently assigned permissions.

---

# 15. Role Management

Role management should be a first-class feature.

```text
Roles
├── List
├── Create
├── View
├── Edit
├── Permissions
└── Delete
```

Role editor:

```text
Role name
Description

Permissions
├── Users
│   ├── Read
│   ├── Create
│   ├── Update
│   └── Delete
├── Orders
│   ├── Read
│   ├── Create
│   └── Update
└── Audit
    └── Read
```

Use grouped permissions in the UI.

Do not show users a giant unstructured list of permission strings.

---

# 16. Permission-aware UI

Create one central permission helper.

Example:

```ts
can("users.read")
can("users.create")
can("users.update")
can("users.delete")
```

Use it for:

```text
Navigation
Pages
Buttons
Menus
Actions
```

Example:

```tsx
{can("users.create") && (
  <CreateUserButton />
)}
```

For routes:

```text
/users
requires users.read
```

For actions:

```text
Create → users.create
Edit   → users.update
Delete → users.delete
```

The API remains the final authority.

---

# 17. Avoid Hard-Coded Role Checks

Avoid:

```tsx
if (user.role === "ADMIN") {
  ...
}
```

Prefer:

```tsx
if (can("users.update")) {
  ...
}
```

Why?

Because later you may have:

```text
ADMIN
MANAGER
SUPPORT
CUSTOMER_SUCCESS
REGIONAL_MANAGER
```

All with different combinations of permissions.

Permission checks scale better than role checks.

Role-specific checks should only exist when the business rule genuinely refers to a role.

---

# 18. Permission Guard Components

A reusable component can simplify the UI.

Example:

```tsx
<Can permission="users.delete">
  <DeleteUserButton />
</Can>
```

Or:

```tsx
<Can permission="roles.update">
  <EditRoleButton />
</Can>
```

Do not use this component as a security mechanism.

It only controls rendering.

---

# 19. Unauthorized Pages

Implement:

```text
403 Forbidden
```

for authenticated users who cannot access a page.

Example:

```text
You don't have permission to access this page.
```

Provide a safe navigation option:

```text
Back to Dashboard
```

Do not reveal internal permission architecture unnecessarily.

---

# 20. Navigation

Navigation should be permission-aware.

Example:

```text
Dashboard
    dashboard.read

Users
    users.read

Roles
    roles.read

Orders
    orders.read

Audit Logs
    audit.read

Settings
    settings.read
```

The sidebar should not show links the user cannot use.

But the route itself must still be protected.

---

# 21. Data Tables

A reusable data-table system is important because most admin applications are table-heavy.

Required capabilities:

```text
Pagination
Sorting
Filtering
Search
Column visibility
Row actions
Loading
Empty state
Error state
```

Recommended URL synchronization:

```text
/users?page=2&search=rohit&status=active
```

Benefits:

- refresh-safe;
- shareable URLs;
- browser back/forward works;
- filters persist naturally.

---

# 22. Pagination

Prefer server-side pagination.

Request:

```text
GET /users?page=2&pageSize=25
```

Response should provide enough information for the UI:

```json
{
  "items": [],
  "page": 2,
  "pageSize": 25,
  "total": 240,
  "totalPages": 10
}
```

Use one pagination convention across the API.

Do not make each module invent its own pagination format.

---

# 23. Search / Filtering

Standardize filter behavior.

Example:

```text
/users
  ?search=rohit
  &status=active
  &role=ADMIN
  &page=1
  &pageSize=25
```

The frontend should serialize filters consistently.

Avoid embedding business filtering logic in the UI.

---

# 24. Forms

Forms should have consistent:

```text
Loading
Validation
Error
Success
Cancel
Dirty state
```

Example:

```text
Edit User

Name       [____________]
Email      [____________]
Status     [ Active ▼ ]
Roles      [ Admin, ... ]

          Cancel   Save
```

Validation should align with shared API contracts where practical.

Client validation improves UX.

Server validation remains authoritative.

---

# 25. Error Handling

Create a central API error model.

Example:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": {}
  }
}
```

Common frontend behavior:

```text
401 → authentication flow
403 → forbidden UI
404 → not found
409 → conflict message
422 → validation errors if used by API
429 → rate limit message
500 → generic server error
```

Never show raw stack traces to administrators.

---

# 26. Toasts and Feedback

Use a consistent feedback system.

Success:

```text
User updated successfully.
```

Error:

```text
Unable to update user. Please try again.
```

Destructive actions should require confirmation.

Example:

```text
Delete user?

This action cannot be undone.

Cancel    Delete
```

For important operations, prefer clear inline confirmation over relying only on transient toasts.

---

# 27. Loading States

Every server-driven page needs a deliberate loading state.

Avoid blank screens.

Use:

```text
Skeleton
Spinner
Table skeleton
Button loading state
```

Example:

```text
Users
------------------------------
[Loading rows...]
[Loading rows...]
[Loading rows...]
```

For mutations:

```text
Saving...
```

and disable duplicate submission.

---

# 28. Empty States

Differentiate:

```text
No data exists
```

from:

```text
No results match the current filters
```

Example:

```text
No users yet.

Create your first user.
```

versus:

```text
No users match "rohit".

Clear filters
```

---

# 29. Destructive Actions

Use extra protection for:

```text
Delete user
Delete role
Disable account
Remove SUPER_ADMIN
Change critical settings
```

For highly sensitive actions, consider:

```text
Confirmation dialog
+
Explicit resource name
+
Permission check
+
Audit event
```

For irreversible actions, a typed confirmation can be appropriate.

---

# 30. Audit Logs

Create an Admin audit-log screen.

Recommended filters:

```text
Actor
Action
Resource
Date range
Target
```

Table:

```text
Time
Actor
Action
Resource
Target
IP
```

Example:

```text
12:32
Admin
ROLE_ASSIGNED
User
user-123
```

Audit data should come from the API.

Do not construct audit history in the browser.

---

# 31. Settings

Settings should be split into logical groups.

Example:

```text
Settings
├── General
├── Security
├── Notifications
└── System
```

Every setting mutation must be protected by API permissions.

Example:

```text
settings.read
settings.update
```

Sensitive settings should receive additional validation and auditing.

---

# 32. Responsive Design

The Admin UI should work on:

```text
Desktop
Laptop
Tablet
```

Mobile support can be secondary if the application is designed primarily for desktop administrators.

At minimum:

- tables should remain usable;
- navigation should collapse;
- dialogs should fit smaller screens;
- forms should not overflow;
- important actions should remain accessible.

---

# 33. Accessibility

Target practical WCAG compliance.

Requirements:

- keyboard navigation;
- visible focus;
- semantic buttons;
- labels for form fields;
- accessible dialogs;
- accessible tables;
- sufficient contrast;
- meaningful error messages;
- no interaction that requires mouse-only behavior.

Do not use a `<div>` as a button when a `<button>` is appropriate.

---

# 34. Design System

Create a small consistent UI system.

Core components:

```text
Button
Input
Select
Checkbox
Switch
Textarea
Dialog
Drawer
Dropdown
Tabs
Badge
Card
Table
Pagination
Tooltip
Toast
Alert
Skeleton
EmptyState
ErrorState
```

Avoid allowing every feature to invent its own button, modal, table, or form styling.

---

# 35. Feature Ownership

Each feature should own its business-specific UI.

Example:

```text
features/users/
├── api.ts
├── hooks.ts
├── permissions.ts
├── components/
│   ├── UserTable.tsx
│   ├── UserForm.tsx
│   └── UserRoleEditor.tsx
├── pages/
│   ├── UsersPage.tsx
│   └── UserDetailsPage.tsx
└── index.ts
```

Shared components belong in:

```text
components/
```

Do not move every component into a global folder.

---

# 36. State Management Rules

Use the simplest appropriate state.

### Local React state

Use for:

```text
Form fields
Dialog open/close
Temporary UI state
```

### TanStack Query

Use for:

```text
API data
Caching
Refetching
Mutations
Server synchronization
```

### Zustand

Use for:

```text
Sidebar preferences
UI preferences
Cross-page UI state
```

Avoid:

```text
Zustand = database
```

---

# 37. Security Rules

The Admin frontend must follow these rules:

1. Never trust frontend permissions.
2. Never trust client-provided role information for authorization.
3. Never store secrets in frontend source code.
4. Never expose server credentials.
5. Never put privileged API keys in Vite environment variables.
6. Treat `VITE_*` values as public.
7. Do not log access tokens.
8. Do not log refresh/session credentials.
9. Use HTTPS in production.
10. Use secure cookie settings when cookies are used.
11. Centralize authentication handling.
12. Handle 401/403 consistently.
13. Keep destructive actions protected.
14. Avoid leaking sensitive API errors.
15. Keep dependency versions maintained.

---

# 38. Environment Configuration

Frontend environment variables are public.

Never put:

```text
DATABASE_URL
JWT_SECRET
AWS_SECRET_ACCESS_KEY
PRIVATE_API_KEY
```

into Admin environment variables.

Safe examples:

```text
VITE_API_BASE_URL
VITE_APP_NAME
VITE_ENVIRONMENT
```

Anything shipped to the browser should be considered public.

---

# 39. API Contract Strategy

The shared package should contain:

```text
Request schemas
Response schemas
Enums
Permission keys
Pagination types
Common error types
```

Example:

```text
packages/api-contracts/
├── auth/
├── users/
├── roles/
├── permissions/
├── orders/
├── audit/
├── common/
└── index.ts
```

The Admin should consume these contracts rather than recreating them.

---

# 40. Performance

Prioritize practical optimizations.

### First

```text
Avoid unnecessary API requests
Use query caching
Use pagination
Lazy-load large routes
```

### Later

```text
Virtualized tables
Prefetching
Advanced caching
Bundle optimization
```

Do not optimize prematurely.

---

# 41. Route-Level Code Splitting

Large feature pages can be lazy loaded.

Conceptually:

```ts
const UsersPage = lazy(() => import("./features/users/pages/UsersPage"));
```

Good candidates:

```text
Users
Roles
Orders
Audit
Settings
```

The login page and basic shell can load immediately.

---

# 42. Testing Strategy

Use multiple levels.

## Unit tests

Test:

```text
Permission helpers
Formatters
Utilities
Validation helpers
```

## Component tests

Test:

```text
Forms
Tables
Dialogs
Permission-aware rendering
```

## Integration tests

Test:

```text
Feature + API client + query behavior
```

## E2E tests

Critical workflows:

```text
Login
Logout
User creation
User editing
Role assignment
Permission enforcement
Forbidden page
Logout/session expiration
```

---

# 43. RBAC Frontend Test Cases

At minimum:

```text
ADMIN sees Users navigation
SUPPORT does not see Roles navigation

users.read → Users page accessible
users.read missing → Users page forbidden

users.create → Create button visible
users.create missing → Create button hidden

users.delete → Delete action visible
users.delete missing → Delete action hidden
```

Also test direct URL navigation:

```text
User without roles.read
  ↓
directly opens /roles
  ↓
403 page
```

This verifies that UI hiding and route protection are both implemented.

---

# 44. E2E Security Test

Important:

```text
1. Login as SUPPORT.
2. Navigate to Users.
3. Attempt DELETE /users/:id directly.
4. API returns 403.
5. User remains unchanged.
```

The test must verify the API boundary, not just whether the button was hidden.

---

# 45. Admin API Conventions

Use consistent resource naming.

Prefer:

```text
GET    /users
GET    /users/:id
POST   /users
PATCH  /users/:id
DELETE /users/:id
```

For role assignment:

```text
GET /users/:id/roles
PUT /users/:id/roles
```

Avoid inconsistent patterns such as:

```text
POST /deleteUser
POST /updateUserRole
POST /getAllUsers
```

---

# 46. URL and Navigation State

Where useful, synchronize page state with URL parameters.

Example:

```text
/users?page=2
/users?search=rohit
/users?status=active
/users?role=ADMIN
```

This improves:

- browser navigation;
- deep links;
- debugging;
- refresh behavior;
- sharing.

Do not put sensitive information into URLs.

---

# 47. Confirmation and Unsaved Changes

For forms with meaningful edits:

```text
Edit user
  ↓
User changes fields
  ↓
Navigate away
  ↓
Unsaved changes warning
```

Use this selectively.

Do not make every small form overly complicated.

---

# 48. Session and Multi-Tab Behavior

The application should handle multiple tabs.

Example:

```text
Tab A → logout
Tab B → API request
       ↓
       401
       ↓
       clear session
       ↓
       login
```

Avoid stale authentication state.

If cross-tab synchronization is needed, use a browser-supported mechanism such as `BroadcastChannel` or storage events without placing secrets in storage.

---

# 49. Observability

The Admin should make API request failures diagnosable.

If the API returns:

```text
X-Request-ID
```

or an equivalent request ID, include it in error handling.

For example:

```text
Something went wrong.

Request ID: abc123
```

This helps correlate an Admin error with API logs.

Do not expose internal stack traces.

---

# 50. Logging

Frontend logs should be intentional.

Do not log:

```text
Passwords
Access tokens
Refresh tokens
Cookies
Authorization headers
Sensitive user data
```

Production builds should avoid noisy debugging logs.

---

# 51. Build and Deployment

Recommended production flow:

```text
npm/pnpm install
        ↓
typecheck
        ↓
lint
        ↓
unit tests
        ↓
build
        ↓
E2E tests
        ↓
deploy
```

The Admin should produce a static production bundle if the architecture permits it.

Possible deployment:

```text
CDN / static hosting
       ↓
Admin SPA
       ↓
Fastify API
```

---

# 52. CI Requirements

Admin CI should include:

```text
TypeScript typecheck
ESLint
Unit tests
Build
E2E tests for critical flows
```

Fail the pipeline on:

```text
Type errors
Lint errors where configured as blocking
Test failures
Production build failures
```

---

# 53. Error Boundaries

Use React error boundaries around major application areas.

Example:

```text
App
├── Shell
├── Dashboard
├── Users
├── Orders
└── Settings
```

A feature crash should produce a controlled error screen instead of destroying the entire application shell where practical.

---

# 54. Feature Rollout Strategy

Do not build every admin module simultaneously.

Recommended order:

```text
Phase 1
├── App shell
├── Authentication
├── API client
├── Error handling
└── RBAC integration

Phase 2
├── Dashboard
└── Users

Phase 3
├── Roles
├── Permissions
└── User role assignment

Phase 4
├── Orders
└── Operational workflows

Phase 5
├── Audit logs
└── Settings

Phase 6
└── Polish / accessibility / performance
```

---

# 55. Phase 1 — Application Foundation

Implement:

```text
App shell
Router
Auth flow
API client
TanStack Query
Global error handling
Loading states
Design system foundation
Permission helper
```

Definition of done:

- [ ] App starts reliably.
- [ ] Login works.
- [ ] Protected routes work.
- [ ] API errors are centralized.
- [ ] Query client is configured.
- [ ] Shared contracts are consumed.
- [ ] Basic layout is responsive.

---

# 56. Phase 2 — Dashboard and Users

Implement:

```text
Dashboard
Users list
User details
User create
User edit
User activation/deactivation
Pagination
Search
Filtering
```

Definition of done:

- [ ] Users are API-backed.
- [ ] Loading states exist.
- [ ] Empty states exist.
- [ ] Error states exist.
- [ ] Permissions are enforced by API.
- [ ] UI is permission-aware.

---

# 57. Phase 3 — RBAC Administration

Implement:

```text
Roles list
Role creation
Role editing
Permission assignment
User role assignment
```

Important:

```text
Only authorized administrators
can modify roles and permissions.
```

Protect SUPER_ADMIN operations.

Definition of done:

- [ ] Roles CRUD works.
- [ ] Permissions are grouped.
- [ ] Role assignment works.
- [ ] Privilege escalation is prevented.
- [ ] Changes are audited.
- [ ] E2E security tests exist.

---

# 58. Phase 4 — Operational Modules

For each resource:

```text
List
Details
Create
Edit
Delete/deactivate
Filters
Pagination
Permissions
Audit
```

Follow the same conventions.

This is how the starter kit becomes reusable.

---

# 59. Phase 5 — Audit and Settings

Implement:

```text
Audit log viewer
Security settings
Application settings
Notification settings
```

Every sensitive mutation should produce an audit event.

---

# 60. Reusable CRUD Pattern

Every standard CRUD feature should follow:

```text
Feature
├── api.ts
├── hooks.ts
├── permissions.ts
├── components/
│   ├── List
│   ├── Form
│   ├── Details
│   └── Actions
├── pages/
│   ├── ListPage
│   └── DetailsPage
└── index.ts
```

This pattern should be documented and reused.

---

# 61. Example Users Feature

```text
features/users/
├── api.ts
├── hooks.ts
├── permissions.ts
├── components/
│   ├── UserTable.tsx
│   ├── UserFilters.tsx
│   ├── UserForm.tsx
│   ├── UserStatusBadge.tsx
│   ├── UserRoleEditor.tsx
│   └── DeleteUserDialog.tsx
├── pages/
│   ├── UsersPage.tsx
│   └── UserDetailsPage.tsx
└── index.ts
```

Permissions:

```ts
export const userPermissions = {
  read: "users.read",
  create: "users.create",
  update: "users.update",
  delete: "users.delete",
} as const;
```

---

# 62. Example Feature Flow

For editing a user:

```text
UserDetailsPage
      ↓
useUser(userId)
      ↓
User data
      ↓
UserForm
      ↓
useUpdateUser()
      ↓
PATCH /users/:id
      ↓
API authorization
      ↓
Business logic
      ↓
Database
      ↓
Success
      ↓
Invalidate user queries
```

The frontend should not know how the database operation works.

---

# 63. Do Not Over-Engineer

Avoid introducing abstractions without a demonstrated need.

Do not create:

```text
GenericUniversalCrudEngine
GenericPageBuilder
GenericFormFactory
GenericPermissionMagic
```

unless the application has enough repeated behavior to justify them.

Prefer:

```text
Simple feature pattern
+
Reusable UI primitives
+
Reusable API/query patterns
```

This keeps the starter kit understandable.

---

# 64. Recommended Admin Navigation

Initial version:

```text
┌──────────────────────────────┐
│ Fastify MasterApp            │
├──────────────────────────────┤
│ Dashboard                    │
│                              │
│ Users                        │
│   Users                      │
│   Roles                      │
│   Permissions                │
│                              │
│ Orders                       │
│                              │
│ Audit Logs                   │
│                              │
│ Settings                     │
│                              │
│ ──────────────────────────── │
│ Profile                      │
│ Logout                       │
└──────────────────────────────┘
```

Every item should be permission-aware.

---

# 65. Recommended Admin UX

Prioritize:

```text
Fast
Predictable
Consistent
Clear
Recoverable
```

An administrator should always understand:

```text
Where am I?
What data am I viewing?
What changed?
What can I do?
Why can't I do something?
What happens if I click this?
```

Avoid unnecessary animations and decorative complexity.

---

# 66. Production Definition of Done

The Admin frontend is production-ready when:

- [ ] Authentication is implemented.
- [ ] Session expiration is handled.
- [ ] Protected routes work.
- [ ] API client is centralized.
- [ ] Shared contracts are used.
- [ ] TanStack Query manages server state.
- [ ] UI state is separated from server state.
- [ ] RBAC permissions control UI visibility.
- [ ] API enforces every protected operation.
- [ ] Dashboard is functional.
- [ ] Users CRUD is functional.
- [ ] Roles management is functional.
- [ ] Permission management is functional.
- [ ] Audit logs are available.
- [ ] Loading states exist.
- [ ] Empty states exist.
- [ ] Error states exist.
- [ ] Destructive actions require confirmation.
- [ ] Forms have validation.
- [ ] Pagination/filtering/search are standardized.
- [ ] Accessibility baseline is met.
- [ ] Responsive behavior is acceptable.
- [ ] Error boundaries exist.
- [ ] No secrets are shipped to the browser.
- [ ] CI runs typecheck, lint, tests, and build.
- [ ] Critical E2E flows pass.
- [ ] Security tests verify API authorization.

---

# 67. Final Architecture

The target Admin architecture is:

```text
                         ADMIN FRONTEND
                              │
          ┌───────────────────┴───────────────────┐
          │                                       │
      React UI                              Client State
          │                                  Zustand/local
          ↓
   Feature Components
          │
          ↓
   Feature Hooks
          │
          ↓
   TanStack Query
          │
          ↓
      API Client
          │
          ↓
      Fastify API
          │
     ┌────┴─────┐
     ↓          ↓
Authentication  Authorization
                  │
                  ↓
              RBAC
                  │
                  ↓
            Business Logic
                  │
                  ↓
                Prisma
                  │
                  ↓
             PostgreSQL
```

Shared contracts sit between the API and Admin:

```text
             packages/api-contracts
                    │
             ┌──────┴──────┐
             ↓             ↓
          Fastify         Admin
```

---

# 68. Priority Summary

## P0 — Security

```text
Authentication
RBAC integration
401/403 handling
Secure session handling
No secrets in frontend
API authorization
```

## P1 — Core Admin

```text
App shell
Users
Dashboard
Roles
Permissions
API client
TanStack Query
Forms
Tables
```

## P2 — Operations

```text
Orders
Audit logs
Settings
Advanced filtering
Bulk actions
```

## P3 — Quality

```text
Accessibility
E2E coverage
Performance
Error boundaries
UX polish
```

## P4 — Advanced

```text
Feature flags
Multi-tenant UI
Advanced analytics
Bulk imports/exports
Advanced permission delegation
```

---

# 69. Final Principle

The Admin frontend should be a **thin, typed, permission-aware client** over the Fastify API.

The desired boundary is:

```text
Admin decides:
    What to display
    How to interact
    How to present errors
    How to guide the administrator

API decides:
    Who is authenticated
    What they are authorized to do
    What data they can access
    What business rules apply
    What is written to the database
```

That separation is the foundation for keeping Fastify-MasterApp maintainable as the number of Admin features grows.

---

# Part II — Implemented Admin Frontend (As-Built)

**Status:** Implemented (Phase 1 scope) · `apps/admin`

This section documents what was actually built, how it derives from the
open-source **Slash Admin** reference in `_Reference/slash-admin/`, and how it
integrates with the real Fastify API. Part I above remains the aspirational
plan; this part is the source of truth for the current code.

## A. Relationship to Slash Admin (`_Reference/`)

`_Reference/slash-admin/` is a **read-only reference implementation** and is
never imported by the Admin. The production Admin (`apps/admin`) borrows Slash
Admin's *architecture and UI patterns*, not its code:

| Borrowed from Slash Admin (pattern)        | Where it lives in `apps/admin`                          |
| ------------------------------------------ | ------------------------------------------------------- |
| shadcn/ui token model (HSL CSS variables)  | `src/styles/globals.css`, `tailwind.config.ts`          |
| Theme provider (light/dark/system, persist)| `src/app/providers/theme-provider.tsx`                  |
| Feature-oriented folder structure          | `src/modules/*`, `src/components/*`, `src/layouts/*`     |
| Sidebar + header admin shell               | `src/layouts/admin`, `src/components/layout/*`          |
| Reusable UI primitives (Button, Card, …)   | `src/components/ui/*`                                    |
| Data-table pattern                         | `src/components/data-table/*`                            |
| Route-config-driven navigation             | `src/app/router/route-config.ts`                        |
| i18n namespaces                            | `src/i18n/*`                                             |

**Not** copied: Slash Admin's MSW/Faker mocks, demo pages, mock auth, and
hardcoded sample data. The Admin talks to the real API only.

## B. Technology stack

React 18 · TypeScript · Vite · React Router 6 · Tailwind CSS · shadcn-style
components (Radix primitives + CVA) · Zustand (client/UI state) · TanStack Query
(server state) · react-hook-form + zod (forms) · i18next (i18n) · recharts
(charts) · sonner (toasts) · lucide-react (icons).

## C. Directory map

```text
apps/admin/src/
├── app/
│   ├── providers/            # ThemeProvider, composed AppProviders
│   ├── router.tsx            # route tree (lazy pages, guards, layouts)
│   ├── router/
│   │   ├── route-config.ts   # nav + permission + breadcrumb metadata
│   │   └── permission-route.tsx
│   └── protected-route.tsx   # auth guard
├── components/
│   ├── ui/                   # shadcn-style primitives
│   ├── data-table/           # reusable DataTable + pagination + search
│   ├── forms/                # FormField / TextField / FieldError
│   ├── feedback/             # Loading / EmptyState / ErrorState / ConfirmDialog
│   ├── layout/               # sidebar, header, breadcrumbs, menus, switchers
│   └── common/               # PageHeader
├── layouts/
│   ├── admin/                # authenticated shell
│   └── auth/                 # login/reset shell
├── modules/                  # feature slices
│   ├── auth/ dashboard/ users/ roles/ permissions/ settings/ errors/
├── hooks/                    # cross-feature hooks (use-url-table-state)
├── i18n/                     # config + en locale namespaces
├── lib/                      # api-client, errors, notify, query-client, utils
├── stores/                   # auth.store (Zustand)
└── styles/                   # globals.css (theme tokens)
```

Each feature slice follows: `api/` → `hooks/` → `components/` (+ `schemas.ts`,
`stores/` where needed), so future logistics modules (shipments, drivers, …)
drop in with the same shape and reuse the DataTable, forms, and guards unchanged.

## D. API integration & the contracts package

All HTTP goes through `src/lib/api-client.ts`, which uses the shared
`@app/api-contracts` package for endpoint paths (`API_ENDPOINTS`) and typed
contracts (`API_CONTRACTS`). Components never call `fetch` and never hardcode
URLs. Flow:

```text
Component → feature hook (TanStack Query) → feature api service → apiClient → Fastify API
```

The client understands **both** backend envelope conventions: the legacy
`{ success, data }` and the canonical `{ data, meta }` (used by the paginated
users list). Errors are normalized to a typed `ApiError` carrying the stable
`code`; `src/lib/errors.ts` maps codes → localized messages.

### Endpoints actually consumed (and backend gaps)

- Auth: `POST /auth/login`, `POST /auth/logout`, `POST /auth/logout-all`,
  `POST /auth/refresh`, `POST /auth/change-password`, and the reset flow
  `POST /auth/forgot-password` → `POST /auth/password-reset/verify` →
  `POST /auth/password-reset/confirm`.
- Users: `GET /users` (paginated, `page/pageSize/search/role/sortBy/sortOrder`),
  `GET /users/me` (profile + effective roles/permissions).
- RBAC: `GET/POST/PATCH/DELETE /admin/roles`, `PUT /admin/roles/:id/permissions`,
  `GET /admin/permissions`, `GET/PUT /admin/users/:id/roles`.

Backend gaps surfaced gracefully in the UI (no fake endpoints invented):
- No user create/update/delete routes → the Users page lists + assigns roles
  only; a notice explains create/edit aren't available yet.
- No profile-update route → Profile settings are read-only with a notice.
- No dashboard metrics API → `modules/dashboard/api/dashboard.api.ts` derives
  headline counts from real endpoints and labels chart data as placeholder.

## E. Authentication & sessions

- **Login** is email + password only (the backend has no OTP on login). On
  success the access token + user are stored in the auth store; the refresh
  token is set by the API as an HTTP-only cookie the JS never reads.
- **Silent refresh:** on a `401`, the api-client makes a single-flight call to
  `POST /auth/refresh` (cookie-based), updates the access token, and retries the
  original request once. If refresh fails, it clears the session and redirects
  to `/login`. Concurrent 401s share one refresh call.
- **Password reset** is the OTP flow: request code → verify code (exchanged for
  a single-use reset token, held in an ephemeral store) → set new password.
- **Change password / logout-everywhere** revoke all sessions server-side, so
  the Admin clears local state and returns the user to `/login`.

## F. RBAC (UX only — API is the boundary)

- Effective `roles` + `permissions` come from `GET /users/me` and are synced
  into the auth store by the admin layout.
- `usePermissions()` exposes `can / canAny / canAll / hasRole / …`.
- `<PermissionGate>` hides buttons/actions; the sidebar hides links the caller
  can't use (driven by `route-config.ts`).
- `<PermissionRoute>` guards routes and renders a 403 page on denial (waiting
  for `/me` to settle to avoid a false 403 flash on refresh).
- Permission identifiers (`resource.action`) are **never** translated — they're
  stable machine keys. Only human-facing labels are localized.

The backend independently enforces every permission via `requirePermission`, so
the frontend controls are strictly a UX convenience.

## G. Reusable systems

- **DataTable** (`components/data-table`): server-side sorting + pagination,
  toolbar slot (search/filters), column visibility, row actions, and
  loading/empty/error states. One implementation powers Users, Roles, and
  Permissions and is ready for future modules.
- **Tables sync to the URL** via `useUrlTableState` (`?search=&role=&page=&sortBy=`)
  for bookmarkable, refresh-safe lists.
- **Forms**: react-hook-form + zod schemas (mirroring the backend contracts),
  with `FieldError` resolving i18n message keys. Submit/loading/success/error
  states are handled; server errors surface via toasts + inline messages.
- **Feedback**: `Loading`, `EmptyState` (distinguishes "no data" vs "no
  results"), `ErrorState` (with retry), and `ConfirmDialog` for destructive
  actions. `notify` is the single toast entry point.

## H. Theming & i18n

- **Theme**: `ThemeProvider` toggles the `.dark` class on `<html>`; all colors
  are HSL CSS variables so every surface (tables, dialogs, charts, sidebar,
  auth) works in light/dark/system. The choice persists in `localStorage` and
  `system` reacts live to OS changes.
- **i18n**: `i18next` with English namespaces under `src/i18n/locales/en/`
  (`common, nav, auth, users, roles, permissions, settings, dashboard,
  validation`). All user-facing strings use `t()`. Adding a language is a
  drop-in of a new locale folder.

## I. Environment & security

- `apps/admin/.env.example` documents `VITE_API_BASE_URL` (browser-safe only).
  In dev it's empty and Vite proxies `/api` → `http://localhost:3000`; the
  `/api/v1` prefix comes from the shared endpoint registry.
- No secrets live in the frontend. `VITE_*` values are treated as public.
- The refresh token stays in an HTTP-only cookie; only the short-lived access
  token is held in the client.

## J. Development & quality

```bash
# from repo root
npm run dev:api        # start Fastify API on :3000
npm run dev:admin      # start the Admin (Vite) — proxies /api to :3000
npm run lint           # ESLint across the monorepo (flat config, 0 errors)

# from apps/admin
npm run typecheck      # tsc --noEmit           (passes)
npm run lint           # eslint src             (0 errors)
npm run test           # vitest run             (48 tests pass)
npm run build          # tsc -b && vite build   (passes; routes are code-split)
```

All four gates pass: **typecheck**, **lint** (0 errors), **tests**, and
**production build**.

### Resilience & networking (post-audit hardening)

- **Request timeout:** the API client wraps every `fetch` in an
  `AbortController` timeout (`VITE_API_TIMEOUT_MS`, default 30s). A timeout
  surfaces as a typed `TIMEOUT` `ApiError`; a transport failure as
  `NETWORK_ERROR`. Both are localized by `mapApiError`.
- **Error boundary:** `components/feedback/error-boundary.tsx` wraps the whole
  app (in `main.tsx`) and the routed page area (in `AdminLayout`, keyed by
  pathname so navigation resets a crashed page). A feature crash shows a
  controlled fallback instead of a blank screen and never leaks a stack trace.
- **Request ID surfacing:** `ErrorState` shows the server `requestId` (from
  `ApiError`) when present, so an admin can quote it to support/logs. Data-table
  and page-level error states pass it through via `getRequestId`.

### Linting

A single flat ESLint config lives at the repo root (`eslint.config.js`) and
covers both apps: `@eslint/js` + `typescript-eslint` recommended, plus
`react-hooks` and `react-refresh` for the admin. `no-undef` is disabled for TS
(TypeScript checks it). `npm run lint` is 0 errors repo-wide (a few pre-existing
API warnings remain and are non-blocking).

### Testing

Vitest + React Testing Library + jsdom, configured in `vitest.config.ts` with a
setup file (`src/test/setup.ts`) that registers jest-dom matchers and stubs
`matchMedia`. `src/test/test-utils.tsx` provides a `renderWithProviders` helper
(Query + Router). Coverage of the §63 priority flows:

- Permission utilities (`auth.store` can/canAny/canAll) and `mapApiError` mapping.
- `PermissionGate` show/hide/fallback/anyOf/allOf rendering.
- `ProtectedRoute` redirect-when-unauthenticated / render-when-authenticated.
- `PermissionRoute` 403-on-denied, render-on-allowed, loading, ungated.
- Login flow (success → session + navigate; invalid creds → error, no navigate;
  client-side validation blocks submit).
- Logout (clears session + redirects, even when the server call fails).
- Session expiration / silent refresh in the API client (401 → refresh → retry;
  refresh-fail → session cleared + redirect), error normalization, timeout.
- Role assignment (`usersApi.getRoles/setRoles/list` hit the right endpoints).
- Permission grouping utility.

Run `npm run test:admin` from the repo root, or `npm test` from `apps/admin`.

## K. Definition of Done (Phase 1 scope) — status

- [x] Admin runs independently; `_Reference/slash-admin` untouched.
- [x] TypeScript passes; production build succeeds.
- [x] Login, logout, forgot/reset password, refresh, session-expiry handling.
- [x] Unauthenticated users redirected; expired sessions handled centrally.
- [x] RBAC: permissions checked centrally; nav/routes/actions permission-aware;
      backend remains the authority.
- [x] Users: list, search, role filter, sorting, pagination, role assignment
      (create/edit/delete gracefully noted as backend-unsupported).
- [x] Roles: list/create/edit/delete + permission assignment; system roles
      protected in the UI.
- [x] Permissions: read-only, grouped by resource, reusable for future modules.
- [x] Dashboard: loads with loading/empty/error handling; metrics API-ready.
- [x] Settings: profile (read-only), appearance (theme + language), security
      (change password, logout everywhere).
- [x] i18n system with complete English; permission keys language-independent.
- [x] Themes: light/dark/system, persisted, applied across all surfaces.
- [x] Reusable DataTable (sort/paginate/filter/search/states/responsive).
- [x] Reusable forms with zod validation, field + server error handling.
- [x] API client request timeout (AbortController) with typed TIMEOUT error.
- [x] React error boundaries (app-level + routed page area).
- [x] Server requestId surfaced in error UI for support/log correlation.
- [x] Monorepo ESLint (flat config) — `npm run lint` passes with 0 errors.
- [x] Automated test foundation (Vitest + RTL) covering the §63 priority flows;
      48 tests pass.
