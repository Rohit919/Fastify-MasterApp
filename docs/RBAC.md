# RBAC Plan

## Fastify-MasterApp — Role-Based Access Control

**Status:** Planned  
**Priority:** P0 — Security  
**Scope:** API + Admin frontend + shared API contracts

---

## 1. Goal

Implement a production-grade, permission-based Role-Based Access Control (RBAC) system for Fastify-MasterApp.

The system must:

- authenticate the caller;
- determine the caller's roles and permissions;
- enforce authorization on the API;
- expose effective permissions to the admin frontend;
- support multiple roles per user;
- avoid hard-coding role names into business logic;
- provide safe role/permission administration;
- support audit logging;
- fail closed when authorization data is unavailable or invalid.

**Security boundary:** The Fastify API is the source of truth. Frontend checks are only for UX.

---

## 2. Recommended Authorization Model

Use:

```text
User
  ↓
UserRole
  ↓
Role
  ↓
RolePermission
  ↓
Permission
```

A user can have multiple roles.

A role contains permissions.

A permission represents one specific capability.

Example:

```text
User: Alice
Roles:
  - Admin
  - Support

Effective permissions:
  - users.read
  - users.update
  - orders.read
  - orders.update
```

Do not make route authorization depend directly on:

```ts
user.role === "ADMIN"
```

Prefer:

```ts
requirePermission("users.delete")
```

This keeps authorization flexible as the application grows.

---

## 3. Permission Naming Convention

Use:

```text
<resource>.<action>
```

Examples:

```text
users.read
users.create
users.update
users.delete

roles.read
roles.create
roles.update
roles.delete

permissions.read

orders.read
orders.create
orders.update
orders.cancel
orders.delete

dashboard.read

audit.read

settings.read
settings.update
```

Keep permission names stable and lowercase.

Avoid ambiguous permissions such as:

```text
admin.access
manage_everything
canDoStuff
```

Prefer explicit capabilities.

---

## 4. Initial System Roles

Create a small default role set.

### SUPER_ADMIN

Full administrative access.

Use carefully. This role should be extremely restricted.

### ADMIN

General application administration.

Example:

```text
dashboard.*
users.*
orders.*
audit.read
settings.read
```

but normally not:

```text
roles.delete
permissions.*
```

unless explicitly required.

### MANAGER

Operational access without security administration.

Example:

```text
dashboard.read
users.read
orders.read
orders.update
```

### SUPPORT

Read-heavy support access.

Example:

```text
dashboard.read
users.read
orders.read
orders.update
```

These are defaults, not permanent rules. Production deployments should be able to customize roles.

---

## 5. Database Design

Recommended Prisma model:

```prisma
model Role {
  id          String           @id @default(cuid())
  name        String           @unique
  description String?
  isSystem    Boolean          @default(false)
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  users       UserRole[]
  permissions RolePermission[]
}

model Permission {
  id          String           @id @default(cuid())
  key         String           @unique
  description String?
  createdAt   DateTime         @default(now())

  roles       RolePermission[]
}

model UserRole {
  userId      String
  roleId      String
  assignedAt  DateTime         @default(now())
  assignedBy  String?

  user        User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  role        Role             @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@id([userId, roleId])
  @@index([roleId])
}

model RolePermission {
  roleId       String
  permissionId String

  role         Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@id([roleId, permissionId])
  @@index([permissionId])
}
```

Adapt relation names and existing `User` fields to the current Prisma schema rather than blindly copying this model.

---

## 6. System Roles vs Custom Roles

System roles should be protected from destructive operations.

For example:

```text
isSystem = true
```

Rules:

- system roles cannot be deleted;
- system roles cannot be renamed unless explicitly supported;
- permissions for SUPER_ADMIN should not be accidentally removed;
- role administration must itself require authorization;
- the API must validate every role mutation.

Custom roles can be created by authorized administrators.

---

## 7. Authorization Request Flow

Every protected request should follow:

```text
HTTP Request
    ↓
Authentication
    ↓
Load user identity
    ↓
Load roles/permissions
    ↓
Authorization check
    ↓
Route handler
    ↓
Database/business logic
```

More specifically:

```text
Request
  ↓
authenticate()
  ↓
request.user
  ↓
requirePermission("orders.update")
  ↓
permission service
  ↓
allow / deny
  ↓
handler
```

Do not perform authorization after business logic has already started.

---

## 8. Fastify Authorization API

Create a reusable authorization layer.

Suggested structure:

```text
apps/api/src/
└── core/
    └── authorization/
        ├── authorization.types.ts
        ├── authorization.service.ts
        ├── authorization.errors.ts
        ├── authorization.decorator.ts
        ├── authorization.hooks.ts
        └── index.ts
```

The public API should be simple:

```ts
requirePermission("users.read")
```

and optionally:

```ts
requireAnyPermission([
  "users.read",
  "users.manage",
])
```

and:

```ts
requireAllPermissions([
  "orders.read",
  "orders.update",
])
```

Start with `requirePermission()` and only add additional abstractions when real requirements appear.

---

## 9. Fastify Route Usage

Example:

```ts
fastify.get(
  "/users",
  {
    preHandler: [
      authenticate,
      requirePermission("users.read"),
    ],
  },
  listUsers,
);
```

Example mutation:

```ts
fastify.delete(
  "/users/:id",
  {
    preHandler: [
      authenticate,
      requirePermission("users.delete"),
    ],
  },
  deleteUser,
);
```

The handler should not need to repeat permission logic.

---

## 10. Request User Context

After authentication, the request should have a typed identity.

Example:

```ts
request.user = {
  id: user.id,
  sessionId: session.id,
};
```

Authorization should resolve permissions using the authenticated user ID.

Avoid putting a huge permission list into the access JWT by default.

Why?

Because permissions can change while a token is still valid.

A short-lived access token can carry identity/session information, while authorization data can be resolved server-side.

If permission caching is later introduced, define explicit invalidation rules.

---

## 11. Permission Resolution

Conceptually:

```sql
SELECT DISTINCT permission.key
FROM UserRole
JOIN RolePermission
JOIN Permission
WHERE UserRole.userId = ?
```

The authorization service should expose something like:

```ts
getUserPermissions(userId)
```

and:

```ts
hasPermission(userId, permission)
```

For a single request, avoid unnecessary repeated database queries.

Prefer loading effective permissions once and reusing them during that request.

---

## 12. Caching Strategy

Do not introduce Redis immediately unless there is a measured need.

Start with:

```text
Request
  ↓
DB permission lookup
  ↓
in-request cache
```

Later:

```text
Request
  ↓
Redis
  ↓
permission set
```

If Redis caching is added, invalidate the user's authorization cache when:

- a role is assigned;
- a role is removed;
- role permissions change;
- a user's relevant role changes;
- a permission is changed.

Security correctness is more important than cache performance.

If the authorization cache cannot be trusted, fail closed or fall back to the authoritative database according to the chosen availability policy.

---

## 13. Admin API

Recommended endpoints:

```text
GET    /admin/roles
POST   /admin/roles
GET    /admin/roles/:id
PATCH  /admin/roles/:id
DELETE /admin/roles/:id

GET    /admin/permissions

GET    /admin/users/:id/roles
PUT    /admin/users/:id/roles
```

Optional later:

```text
GET /admin/roles/:id/permissions
PUT /admin/roles/:id/permissions
```

All of these endpoints must themselves be protected.

Example:

```text
roles.read
roles.create
roles.update
roles.delete
permissions.read
users.roles.read
users.roles.update
```

---

## 14. Prevent Privilege Escalation

This is one of the most important parts of the implementation.

A user who can manage users must not automatically be able to grant themselves or another user SUPER_ADMIN.

For example, do not allow:

```text
ADMIN
  ↓
assign SUPER_ADMIN
  ↓
SUPER_ADMIN
```

unless that capability is explicitly authorized.

Recommended rule:

```text
Only SUPER_ADMIN can grant/remove SUPER_ADMIN.
```

Similarly, role management should prevent an administrator from creating a role that grants permissions they are not allowed to delegate, unless delegation is explicitly designed.

---

## 15. Self-Protection Rules

Prevent dangerous operations such as:

```text
Delete yourself
Remove your final administrative role
Disable the only SUPER_ADMIN
Remove your own authorization required for the current operation
```

The exact policy can vary, but dangerous mutations should be explicitly checked.

For example:

```text
Cannot delete the last active SUPER_ADMIN.
```

This should be enforced server-side in a transaction.

---

## 16. Transactions

Role mutations that affect multiple records should use database transactions.

Example:

```text
Update user roles
  ↓
Remove old role assignments
  ↓
Create new assignments
  ↓
Write audit event
  ↓
Commit
```

Do not leave the system in a partially updated state.

For sensitive operations:

```ts
await prisma.$transaction(...)
```

should be the default pattern.

---

## 17. Authorization vs Ownership

RBAC alone is not enough for every application.

Example:

```text
users.update
```

may mean:

> Can this user update users at all?

But you may also need:

> Can this administrator update THIS user?

That is an ownership/resource-level authorization problem.

Keep the distinction clear:

```text
RBAC
  → What capability does the user have?

Resource authorization
  → Can they perform it on this particular resource?
```

For example:

```ts
requirePermission("orders.update")
```

followed by:

```ts
assertCanUpdateOrder(request.user, order)
```

Do not put resource-specific rules into the generic RBAC middleware.

---

## 18. Frontend Authorization

The Admin frontend should receive the current user's effective permissions.

Example:

```json
{
  "user": {
    "id": "123",
    "name": "Admin"
  },
  "roles": [
    "ADMIN"
  ],
  "permissions": [
    "dashboard.read",
    "users.read",
    "users.update",
    "orders.read"
  ]
}
```

Create a reusable helper:

```ts
can("users.delete")
```

Then:

```tsx
{can("users.delete") && (
  <DeleteUserButton />
)}
```

This improves UX.

But remember:

```text
Frontend permission check ≠ security
```

The API must always enforce the permission.

---

## 19. Admin UI

Recommended navigation:

```text
Dashboard

Users
  ├── All Users
  └── Roles

Orders

Audit Logs

Settings
```

Visibility should depend on permissions.

Examples:

```text
users.read
roles.read
orders.read
audit.read
settings.read
```

Buttons should also respect permissions:

```text
Create → users.create
Edit   → users.update
Delete → users.delete
```

Do not scatter raw permission strings throughout components.

Prefer a central permission constants/type definition.

---

## 20. Shared Contracts

Put permission keys and relevant API schemas in:

```text
packages/api-contracts
```

For example:

```ts
export const PermissionKeys = {
  UsersRead: "users.read",
  UsersCreate: "users.create",
  UsersUpdate: "users.update",
  UsersDelete: "users.delete",
  RolesRead: "roles.read",
  RolesCreate: "roles.create",
  RolesUpdate: "roles.update",
  RolesDelete: "roles.delete",
} as const;
```

The API and Admin frontend should consume the same contract package.

This reduces typo-based authorization bugs.

---

## 21. Error Handling

Use:

```text
401 Unauthorized
```

when the request is not authenticated.

Use:

```text
403 Forbidden
```

when the caller is authenticated but lacks the required permission.

Example:

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to perform this action."
  }
}
```

Do not reveal unnecessary authorization details.

Avoid responses such as:

```text
You need SUPER_ADMIN because your role is SUPPORT.
```

A generic denial is safer.

---

## 22. Audit Logging

RBAC administration should produce audit events.

At minimum log:

```text
ROLE_CREATED
ROLE_UPDATED
ROLE_DELETED

ROLE_ASSIGNED
ROLE_REMOVED

ROLE_PERMISSIONS_UPDATED
```

Include:

```text
actorId
action
targetType
targetId
metadata
requestId
ip
userAgent
createdAt
```

Example:

```json
{
  "action": "ROLE_ASSIGNED",
  "actorId": "admin-123",
  "targetType": "USER",
  "targetId": "user-456",
  "metadata": {
    "role": "MANAGER"
  }
}
```

Never log passwords, access tokens, refresh tokens, or other secrets.

---

## 23. Bootstrap / Seed Strategy

The initial permissions and system roles should be created through an idempotent seed.

Example:

```text
1. Create permissions
2. Create system roles
3. Attach permissions to system roles
4. Optionally create initial administrator
```

The seed must be safe to run more than once.

Use stable permission keys rather than generated IDs when determining whether a permission already exists.

---

## 24. Migration Plan

Implement RBAC incrementally.

### Phase 1 — Schema

Create:

```text
Role
Permission
UserRole
RolePermission
```

Add migrations.

### Phase 2 — Permission catalog

Define the initial permission list.

Example:

```text
dashboard.read
users.read
users.create
users.update
users.delete
roles.read
roles.create
roles.update
roles.delete
permissions.read
audit.read
settings.read
settings.update
```

### Phase 3 — Seed

Create system roles and permissions.

### Phase 4 — Authorization service

Implement:

```text
getUserRoles()
getUserPermissions()
hasPermission()
requirePermission()
```

### Phase 5 — Protect existing routes

Start with sensitive routes.

Example order:

```text
user management
role management
settings
audit
orders
```

Do not leave sensitive endpoints unprotected while assuming the frontend will hide them.

### Phase 6 — Admin frontend

Add:

```text
permission-aware navigation
permission-aware buttons
role management
permission assignment
user role assignment
```

### Phase 7 — Audit

Record role and permission changes.

### Phase 8 — Tests

Add authorization tests and privilege-escalation tests.

### Phase 9 — Optional caching

Only after measuring database pressure.

---

## 25. Testing Strategy

RBAC needs security-focused tests.

### Authentication

Test:

```text
No token → 401
Invalid token → 401
Expired token → 401
Valid token → continues
```

### Authorization

Test:

```text
Missing permission → 403
Required permission → success
```

### Multiple roles

Test:

```text
Role A → users.read
Role B → orders.read

User has A + B

Effective permissions:
users.read
orders.read
```

### Revocation

Test:

```text
Remove role
↓
permission disappears
↓
protected endpoint returns 403
```

### Privilege escalation

Test:

```text
ADMIN cannot grant SUPER_ADMIN
ADMIN cannot grant unauthorized permissions
```

### Self-protection

Test:

```text
Cannot remove last SUPER_ADMIN
Cannot perform prohibited self-demotion
```

### API bypass

Test that hiding an Admin UI button does not matter:

```text
Direct HTTP request
↓
API authorization
↓
403
```

---

## 26. Security Rules

These rules are non-negotiable:

1. API authorization is mandatory.
2. Frontend checks are never trusted.
3. Default-deny when no permission is found.
4. Unknown permissions must not grant access.
5. Missing authorization data must not silently grant access.
6. SUPER_ADMIN must be protected.
7. Role changes must be audited.
8. Sensitive role mutations should use transactions.
9. Never put secrets in authorization metadata.
10. Never trust a client-provided role or permission list.
11. Do not accept `role` or `permissions` directly from the client as authoritative identity data.
12. Validate every role/permission mutation.
13. Prevent privilege escalation.
14. Keep authorization logic centralized.
15. Keep resource-level authorization separate from RBAC.

---

## 27. Suggested API Types

Conceptually:

```ts
export type PermissionKey =
  | "dashboard.read"
  | "users.read"
  | "users.create"
  | "users.update"
  | "users.delete"
  | "roles.read"
  | "roles.create"
  | "roles.update"
  | "roles.delete"
  | "permissions.read"
  | "audit.read"
  | "settings.read"
  | "settings.update";
```

Authorization context:

```ts
export interface AuthorizationContext {
  userId: string;
  roles: string[];
  permissions: PermissionKey[];
}
```

Service:

```ts
interface AuthorizationService {
  getContext(userId: string): Promise<AuthorizationContext>;
  hasPermission(
    userId: string,
    permission: PermissionKey,
  ): Promise<boolean>;
}
```

Keep the actual implementation behind this interface.

---

## 28. Suggested Module Structure

```text
apps/api/src/modules/
├── auth/
├── users/
├── roles/
│   ├── roles.routes.ts
│   ├── roles.schemas.ts
│   ├── roles.service.ts
│   ├── roles.repository.ts
│   └── __tests__/
├── permissions/
│   ├── permissions.routes.ts
│   ├── permissions.schemas.ts
│   └── ...
└── audit/
    ├── audit.routes.ts
    ├── audit.service.ts
    └── ...
```

Cross-cutting authorization:

```text
apps/api/src/core/authorization/
```

This prevents role management from becoming mixed with generic security infrastructure.

---

## 29. Definition of Done

RBAC is ready for production when:

- [ ] Database models are migrated.
- [ ] Permission catalog is defined.
- [ ] System roles are seeded.
- [ ] User-role assignment works.
- [ ] Role-permission assignment works.
- [ ] Authorization service exists.
- [ ] Protected API routes use permission checks.
- [ ] API returns correct 401/403 responses.
- [ ] Admin UI consumes effective permissions.
- [ ] Navigation is permission-aware.
- [ ] Actions/buttons are permission-aware.
- [ ] SUPER_ADMIN escalation is protected.
- [ ] Last-admin protection exists.
- [ ] Role changes are audited.
- [ ] Authorization tests cover allow/deny paths.
- [ ] Privilege-escalation tests pass.
- [ ] No client-provided role/permission data is trusted.
- [ ] Documentation explains how to add new permissions.
- [ ] CI runs RBAC/security tests.

---

## 30. Recommended Implementation Order for Fastify-MasterApp

The safest order is:

```text
                    RBAC
                      │
          ┌───────────┴───────────┐
          ↓                       ↓
       Database               Permission
        Schema                 Catalog
          │                       │
          └───────────┬───────────┘
                      ↓
             Authorization Service
                      ↓
              Fastify Middleware
                      ↓
             Protect API Routes
                      ↓
              Admin API Endpoints
                      ↓
               Admin UI Guards
                      ↓
                Audit Logging
                      ↓
                  Testing
                      ↓
              Optional Redis Cache
```

Do not start with the frontend.

The API security model must exist first.

---

## 31. Future Extensions

Do not implement these in the first RBAC version unless the product actually needs them:

### Attribute-Based Access Control

Example:

```text
Manager can update orders
ONLY when order.region === manager.region
```

### Multi-tenant authorization

Example:

```text
Organization A admin
cannot access
Organization B data
```

### Permission delegation

Example:

```text
Admin can grant only permissions they themselves possess.
```

### Temporary permissions

Example:

```text
Permission expires after 24 hours.
```

### Approval workflows

Example:

```text
Role change
  ↓
Requires second administrator approval
```

These are useful later, but they add substantial complexity.

---

# Final Architecture Principle

The RBAC system should answer one question:

> **"Is this authenticated user allowed to perform this action?"**

Keep it explicit:

```text
Authentication
    ↓
Who are you?
    ↓
RBAC
    ↓
What can you do?
    ↓
Resource authorization
    ↓
Can you do it to THIS resource?
    ↓
Business logic
```

This gives Fastify-MasterApp a clean security boundary while keeping the Admin frontend simple and permission-aware.
