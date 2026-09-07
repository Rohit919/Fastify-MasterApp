# RBAC Developer Guide

How to work with the Role-Based Access Control system in Fastify-MasterApp:
adding permissions, roles, and protected endpoints. This complements the
design docs (`RBAC.md`, `RBAC (1).md`) with the concrete, code-level workflow.

> **Golden rule:** the API is the security boundary. Frontend `can()` checks are
> UX only. Every protected capability must be enforced server-side.

---

## 1. Where things live

```text
packages/api-contracts/src/rbac.ts      Permission catalog + role names + DTOs (shared)
apps/api/src/core/authorization/        AuthorizationService + requirePermission guards
apps/api/src/core/audit/                AuditService (records role/permission changes)
apps/api/src/modules/roles/             Admin RBAC API (roles, permissions, user roles)
prisma/schema.prisma                    Role/Permission/UserRole/RolePermission/AuditLog
prisma/seed.ts                          Idempotent permission + system-role seeding
apps/admin/src/modules/auth/            can(), usePermissions(), <PermissionGate>
```

The permission catalog in `rbac.ts` is the **single source of truth**. The API,
the seed, and the admin UI all import from it, so a permission can never drift
between layers.

---

## 2. Authorization model

```text
User → UserRole → Role → RolePermission → Permission
```

A user's **effective permissions** are the union of permissions across all
assigned roles. Resolution is default-deny: if a permission is not explicitly
granted, access is refused. Permission keys not present in the registry are
ignored even if they exist in the database.

---

## 3. How to add a new permission

1. **Add the key to the catalog** in `packages/api-contracts/src/rbac.ts`:

   ```ts
   export const PermissionKeys = {
     // ...
     ReportsExport: 'reports.export',
   } as const;
   ```

   Use the `<resource>.<action>` convention, lowercase, stable. `PermissionKey`
   and `ALL_PERMISSION_KEYS` update automatically.

2. **Describe it in the seed** — `prisma/seed.ts` has a
   `PERMISSION_DESCRIPTIONS: Record<PermissionKey, string>`. TypeScript will fail
   the build until you add an entry, which is intentional (it forces you to
   document the permission):

   ```ts
   'reports.export': 'Export reports to CSV/PDF',
   ```

3. **Grant it to the appropriate system roles** in `ROLE_DEFINITIONS` in the
   seed. `SUPER_ADMIN` receives every permission automatically.

4. **Enforce it on the route** (see §5).

5. **Re-run the seed** so the permission row and role links exist:

   ```bash
   npm run db:seed
   ```

6. **Add tests** (allow + deny) and, if the admin UI exposes the capability,
   gate the control with `can('reports.export')`.

---

## 4. How to add a new role

System roles are seeded and protected from destructive admin edits. Custom
roles are created at runtime by authorized admins.

**System role** (seeded):

1. Add the name to `SystemRoles` in `rbac.ts`.
2. Add a `ROLE_DEFINITIONS[SystemRoles.X]` entry in the seed with its permission
   list.
3. Re-run the seed.

**Custom role** (runtime): use the admin API — `POST /api/v1/admin/roles` with a
name and permission keys. Non-super-admins cannot create roles that grant
role-management permissions (delegation guard).

---

## 5. How to protect an endpoint

Attach `fastify.authenticate` as `preValidation` and a permission guard as
`preHandler`:

```ts
import { requirePermission } from '@core/authorization/index.js';
import { PermissionKeys } from '@app/api-contracts';

fastify.get(
  '/reports',
  {
    preValidation: [fastify.authenticate],
    preHandler: [requirePermission(PermissionKeys.ReportsRead)],
    schema: { /* ... */ },
  },
  handler,
);
```

Available guards (all default-deny, all return 401 unauthenticated / 403
unauthorized):

- `requirePermission(key)` — requires one permission.
- `requireAnyPermission([...])` — requires at least one.
- `requireAllPermissions([...])` — requires all.

### Resource ownership is separate

Route permissions answer *"can this role do this action at all?"* They do **not**
answer *"can this actor act on THIS specific record?"* For owned resources, add
a resource check after the permission guard (see `requireOwnership` and the
todos module for the pattern). Do not put resource-specific logic in the generic
permission guard.

---

## 6. Auditing privileged changes

Role/permission mutations already write audit rows inside the same database
transaction as the change (see `RolesService`). When you add a new privileged
mutation, record it too:

```ts
await this.audit.record(
  { ...AuditService.contextFrom(request), action: 'REPORT_EXPORTED', targetType: 'REPORT', targetId: id },
  tx, // pass the transaction client so audit + change commit together
);
```

Never put secrets (passwords, tokens) in audit metadata.

---

## 7. Exposing permissions to the frontend

`GET /api/v1/users/me` returns the caller's `roles` and `permissions`. The admin
app loads this once for the authenticated shell and stores it. Use:

```tsx
import { usePermissions } from '@/modules/auth/hooks/use-permissions';
const { can } = usePermissions();
{can('reports.export') && <ExportButton />}

// or declaratively
<PermissionGate permission="reports.export"><ExportButton /></PermissionGate>
```

A 403 from the API should show a "no permission" message; it must **not** log the
user out (they are authenticated, just not authorized).

---

## 8. Security invariants (non-negotiable)

1. API authorization is mandatory; frontend checks are never trusted.
2. Default-deny — unknown/absent permissions grant nothing.
3. Never trust a client-supplied `role` or `permissions` list.
4. Only `SUPER_ADMIN` may grant or remove `SUPER_ADMIN`.
5. The last `SUPER_ADMIN` cannot be removed.
6. System roles cannot be deleted; only a super admin edits them.
7. Privileged mutations are transactional and audited.
8. Fail closed if authorization state can't be established.

---

## 9. Permission risk classification

Use this to decide extra controls (rate limits, audit, future MFA/step-up).

| Permission | Risk | Notes |
|---|---|---|
| `dashboard.read`, `users.read`, `orders.read`, `todos.read`, `metrics.read`, `permissions.read`, `settings.read`, `users.roles.read`, `audit.read` | LOW | Read-only |
| `users.update`, `orders.update`, `orders.create`, `orders.cancel`, `todos.create`, `todos.update`, `todos.read_all` | MEDIUM | State-changing, non-privileged |
| `users.create`, `users.delete`, `orders.delete`, `todos.delete`, `settings.update` | HIGH | Destructive or config-changing |
| `roles.create`, `roles.update`, `roles.delete`, `users.roles.update` | CRITICAL | Privilege boundary — can change who can do what |

---

## 10. Testing checklist for authorization changes

For every protected endpoint, cover:

- anonymous → 401
- authenticated without the permission → 403
- authorized → success
- (for privileged mutations) privilege-escalation and last-admin guards
- a direct HTTP request is refused regardless of the UI

See `apps/api/src/modules/roles/__tests__/` for the reference patterns and
`apps/api/src/core/testing/test-app.ts` for the test harness (`buildTestApp`,
`signTestToken`, and the mock Prisma overrides used to grant roles/permissions).
