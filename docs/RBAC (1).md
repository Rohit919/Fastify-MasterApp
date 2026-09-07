# Role-Based Access Control (RBAC)

> Production-grade authorization architecture for **Fastify-MasterApp**, covering roles, permissions, resource authorization, administrative access, API enforcement, React Admin integration, caching, auditing, testing, and future multi-tenant authorization.

---

# 1. Purpose

This document defines the authorization model for Fastify-MasterApp.

The system uses **Role-Based Access Control (RBAC)** as the primary authorization mechanism.

The core model is:

```text
User
  ↓
Role
  ↓
Permission
  ↓
Resource / Action
```

Authentication answers:

> Who is this caller?

Authorization answers:

> Is this caller allowed to perform this action on this resource?

These concerns must remain separate.

---

# 2. Core Principle

> **Authentication identifies the actor. Authorization decides what the actor may do.**

A valid JWT does not imply permission.

```text
Valid JWT
   ↓
Authenticated
   ↓
Load authorization context
   ↓
Check permission
   ↓
Allow / Deny
```

Never use:

```text
if (user) {
  allow();
}
```

for protected business operations.

---

# 3. Goals

The RBAC architecture should provide:

1. Centralized authorization decisions.
2. Default-deny behavior.
3. Explicit permissions.
4. Role-based assignment.
5. Resource-level authorization where required.
6. Consistent API enforcement.
7. Consistent Admin UI enforcement.
8. Protection against IDOR.
9. Protection against privilege escalation.
10. Auditability.
11. Testability.
12. Cache-safe authorization.
13. Support for future multi-tenancy.
14. Clear operational administration.

---

# 4. Non-Goals

RBAC should not become:

- A collection of scattered `if` statements.
- A UI-only security mechanism.
- A substitute for authentication.
- A substitute for database constraints.
- A giant permission matrix with no ownership.
- A reason to put authorization logic in React only.
- A reason to put all authorization state into JWTs.
- A replacement for resource ownership checks.
- A reason to introduce a policy engine before requirements justify it.

---

# 5. Authorization Layers

Authorization should be enforced at multiple layers.

```text
HTTP Request
     ↓
Authentication
     ↓
Route Permission Check
     ↓
Application Service
     ↓
Resource / Ownership Check
     ↓
Repository
     ↓
Database Constraints
```

Different layers solve different problems.

### Route-level authorization

Answers:

```text
Can this role perform this action?
```

### Resource-level authorization

Answers:

```text
Can this actor perform this action on THIS resource?
```

### Database constraints

Answers:

```text
Can invalid data states exist?
```

All three can be necessary.

---

# 6. Default Deny

The system must follow:

> **If permission is not explicitly granted, deny access.**

Conceptually:

```ts
if (!hasPermission(user, permission)) {
  throw new ForbiddenError();
}
```

Never use:

```ts
if (permission !== false) {
  allow();
}
```

Unknown permissions should not silently become allowed.

---

# 7. Permission Model

Permissions should represent:

```text
resource.action
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

audit.read

reports.read
reports.create
reports.export

settings.read
settings.update
```

Avoid overly vague permissions:

```text
admin
manage_everything
superuser
```

Those may exist as operational concepts, but should not replace explicit permission modeling.

---

# 8. Permission Naming

Recommended format:

```text
<resource>.<action>
```

Examples:

```text
users.read
users.create
users.update
users.delete

todos.read
todos.create
todos.update
todos.delete

orders.read
orders.create
orders.update
orders.cancel

reports.read
reports.create
reports.export
```

Use business actions where appropriate:

```text
orders.refund
orders.cancel
users.suspend
users.verify
```

Do not force every operation into CRUD if the business action has different security semantics.

---

# 9. Permission Granularity

Permissions should be:

- Specific enough to be useful.
- Broad enough to avoid hundreds of meaningless permissions.
- Stable across UI changes.
- Independent of HTTP route names.

Good:

```text
users.read
```

Less desirable:

```text
get-users-page-1
```

Permission names represent business capabilities, not implementation details.

---

# 10. CRUD Permissions

Common pattern:

```text
read
create
update
delete
```

Example:

```text
products.read
products.create
products.update
products.delete
```

But some resources need domain-specific actions:

```text
orders.refund
orders.cancel
orders.approve
orders.fulfill
```

---

# 11. Permission Registry

Define permissions centrally.

Example:

```ts
export const PERMISSIONS = {
  USERS_READ: "users.read",
  USERS_CREATE: "users.create",
  USERS_UPDATE: "users.update",
  USERS_DELETE: "users.delete",

  ROLES_READ: "roles.read",
  ROLES_CREATE: "roles.create",
  ROLES_UPDATE: "roles.update",
  ROLES_DELETE: "roles.delete",

  AUDIT_READ: "audit.read",
} as const;
```

This avoids string duplication.

---

# 12. Permission Registry as a Contract

The registry should be treated as a controlled application contract.

Adding:

```text
users.export
```

means:

- API enforcement may change.
- Admin navigation may change.
- Role definitions may change.
- Tests may be required.
- Documentation may need updates.
- Audit requirements may change.

Do not add permissions casually.

---

# 13. Role Model

A role is a named collection of permissions.

Example:

```text
Role: Administrator

Permissions:
  users.read
  users.create
  users.update
  users.delete
  roles.read
  roles.create
  roles.update
  roles.delete
  audit.read
```

Another:

```text
Role: Support

Permissions:
  users.read
  users.update
  todos.read
```

---

# 14. Role Naming

Use stable business/operational names.

Examples:

```text
Administrator
Support
Manager
Analyst
Viewer
```

Avoid implementation names:

```text
role_1
admin_v2
frontend-user
api-role
```

unless those are explicitly internal identifiers.

---

# 15. Role IDs vs Role Names

Prefer stable IDs internally:

```text
role_01J...
```

and human-readable names:

```text
Administrator
```

Do not use display names as database foreign keys.

Role names can change.

IDs should remain stable.

---

# 16. User-Role Relationship

A user may have:

```text
User
 ├── Role A
 ├── Role B
 └── Role C
```

Whether multiple roles are allowed should be an explicit product decision.

If multiple roles are supported:

```text
effective permissions
=
union of permissions from assigned roles
```

unless the product later introduces explicit deny rules.

---

# 17. Multiple Roles

Example:

```text
User
 ├── Support
 └── Analyst
```

Effective permissions:

```text
users.read
users.update
reports.read
```

Avoid complex precedence rules initially.

Prefer:

```text
explicit grants
+
default deny
```

rather than:

```text
allow
deny
deny overrides
role priority
exception roles
```

unless requirements require it.

---

# 18. Explicit Deny

Do not introduce explicit deny permissions unless necessary.

Simple RBAC:

```text
permission granted → allow
permission absent  → deny
```

is easier to reason about.

Explicit deny systems create precedence questions:

```text
Role A → allow
Role B → deny
Role C → allow
```

If explicit deny becomes necessary, document its precedence rigorously.

---

# 19. Super Administrator

A system may require a break-glass or platform administrator.

Avoid scattering:

```ts
if (user.isSuperAdmin) {
  ...
}
```

throughout the codebase.

Instead centralize the rule:

```ts
authorization.can(
  actor,
  "users.delete",
);
```

If a platform-level bypass exists, its semantics should be centralized, audited, and heavily protected.

---

# 20. Break-Glass Access

Emergency access should be:

- Rare.
- Explicit.
- Time-bound where possible.
- Strongly authenticated.
- Audited.
- Restricted to trusted operators.

Do not use "super admin" as a normal shortcut for missing permissions.

---

# 21. Authentication vs Authorization

Authentication:

```text
JWT
 ↓
userId
 ↓
authenticated
```

Authorization:

```text
userId
 ↓
roles
 ↓
permissions
 ↓
resource policy
 ↓
allow/deny
```

A valid JWT only establishes identity.

---

# 22. JWT Authorization Claims

JWTs may include limited authorization context:

```json
{
  "sub": "usr_123",
  "roles": ["support"]
}
```

However, avoid putting a large permission list into long-lived access tokens.

Permissions can change before the token expires.

---

# 23. Stale Authorization

Suppose:

```text
09:00 user = Administrator
09:05 role removed
09:10 old JWT still valid
```

If permissions are embedded permanently in the token, the user may retain stale privileges.

Possible solutions:

- Short access-token lifetime.
- Authorization lookup.
- Permission-version claim.
- Session/version invalidation.
- Cache with short TTL.

Security-sensitive operations should not rely blindly on stale token claims.

---

# 24. Authorization Context

Recommended runtime context:

```ts
type AuthContext = {
  userId: string;
  roles: string[];
  permissions: string[];
};
```

The exact representation may use IDs and derived permissions.

Authorization services should own how this context is built.

---

# 25. Authorization Service

Centralize permission checks.

Example:

```ts
authorizationService.requirePermission(
  authContext,
  "users.read",
);
```

or:

```ts
authorizationService.can(
  authContext,
  "users.update",
);
```

Avoid direct database queries for roles throughout route handlers.

---

# 26. Fastify Integration

A protected route should conceptually be:

```ts
fastify.get(
  "/api/v1/users",
  {
    preHandler: [
      authenticate,
      requirePermission("users.read"),
    ],
  },
  userController.list,
);
```

This creates a consistent authorization boundary.

---

# 27. Authentication Middleware

Authentication should:

1. Verify JWT.
2. Validate claims.
3. Resolve user/session state as required.
4. Attach safe auth context to the request.

Example:

```ts
request.auth = {
  userId,
  sessionId,
};
```

Authorization can then resolve effective permissions.

---

# 28. Permission Middleware

Conceptual:

```ts
function requirePermission(permission: Permission) {
  return async (request, reply) => {
    await authorizationService.requirePermission(
      request.auth,
      permission,
    );
  };
}
```

The route declares its required capability.

---

# 29. Route-Level Example

```ts
fastify.delete(
  "/api/v1/users/:id",
  {
    preHandler: [
      authenticate,
      requirePermission("users.delete"),
    ],
  },
  deleteUserHandler,
);
```

This does not automatically prove the actor can delete **that specific user**.

Resource authorization is still required.

---

# 30. Resource-Level Authorization

Example:

```text
users.update
```

may grant the capability to update users.

But additional rules may apply:

```text
Can Support update this user?
Can Manager update this department?
Can user update themselves?
Can Admin modify another Admin?
```

These are resource/business policies.

---

# 31. IDOR Protection

Insecure:

```http
GET /api/v1/users/123
```

and:

```ts
const user = await userRepository.findById(params.id);
return user;
```

If any authenticated user can substitute another ID, this creates an IDOR vulnerability.

Authorization must verify:

```text
actor
+
permission
+
target resource
```

---

# 32. Secure Resource Query

Instead of:

```ts
findById(userId)
```

use an authorization-aware query where appropriate:

```ts
findAccessibleUser({
  actorId,
  targetUserId,
});
```

or:

```text
authorize(actor, "users.read", user)
```

before returning the resource.

---

# 33. Ownership

Some resources are user-owned.

Example:

```text
Todo
  ownerId
```

Policy:

```text
user can read own todo
```

could be:

```ts
todo.ownerId === auth.userId
```

This is not purely role-based authorization.

It is resource/ownership authorization.

---

# 34. RBAC + Ownership

A common policy is:

```text
Admin
  → all todos

Manager
  → team todos

User
  → own todos
```

The authorization system should support:

```text
role permission
+
resource policy
```

---

# 35. Organization Scope

Future multi-tenant/organization model:

```text
User
 ↓
Organization
 ↓
Role
 ↓
Permission
```

A permission should not automatically grant access across organizations.

Every resource query must apply tenant/organization scope.

---

# 36. Tenant-Aware Authorization

Conceptually:

```ts
authorize({
  actorId,
  tenantId,
  permission: "users.read",
  resource,
});
```

The service should verify:

```text
actor belongs to tenant
resource belongs to tenant
actor has permission in tenant
```

---

# 37. Hierarchical Roles

Avoid role hierarchies initially.

Example:

```text
Admin > Manager > Support > Viewer
```

can appear simple but introduces inheritance complexity.

Prefer explicit permissions.

If hierarchy becomes necessary, document:

- Inheritance.
- Override behavior.
- Cycle prevention.
- Permission calculation.
- Cache invalidation.

---

# 38. Permission Groups

If the permission list becomes large, group permissions conceptually:

```text
Users Management
  ├── users.read
  ├── users.create
  ├── users.update
  └── users.delete
```

Groups are primarily administrative UX constructs.

The actual authorization decision should still resolve to explicit permissions.

---

# 39. Database Model

Recommended conceptual model:

```text
users
  │
  ├── user_roles
  │       │
  │       ▼
  │     roles
  │       │
  │       ▼
  │   role_permissions
  │       │
  │       ▼
  │   permissions
```

Tables:

```text
users
roles
permissions
user_roles
role_permissions
```

---

# 40. Role Table

Conceptual:

```text
roles
-----
id
name
description
is_system
created_at
updated_at
```

Potential additional fields:

```text
tenant_id
status
```

if multi-tenancy requires them.

---

# 41. Permission Table

Conceptual:

```text
permissions
-----------
id
key
description
created_at
updated_at
```

Unique:

```text
UNIQUE(key)
```

Example:

```text
users.read
users.update
orders.refund
```

---

# 42. User Roles Table

Conceptual:

```text
user_roles
----------
user_id
role_id
created_at
```

Unique:

```text
UNIQUE(user_id, role_id)
```

This prevents duplicate assignments.

---

# 43. Role Permissions Table

Conceptual:

```text
role_permissions
----------------
role_id
permission_id
created_at
```

Unique:

```text
UNIQUE(role_id, permission_id)
```

---

# 44. Foreign Keys

Use database foreign keys:

```text
user_roles.user_id
    → users.id

user_roles.role_id
    → roles.id

role_permissions.role_id
    → roles.id

role_permissions.permission_id
    → permissions.id
```

Referential integrity should not rely solely on application code.

---

# 45. Delete Semantics

Role/permission deletion requires careful policy.

System roles should generally not be casually deleted.

Options:

```text
soft delete
```

or:

```text
disable
```

for business-managed roles.

Permissions may be effectively immutable after deployment.

---

# 46. System Roles

Examples:

```text
Administrator
Viewer
Support
```

System roles can be marked:

```text
is_system = true
```

The Admin UI may prevent destructive modification.

---

# 47. Managed Roles

Custom roles may be created by authorized administrators.

Example:

```text
Operations Manager
```

with selected permissions.

Custom role management requires strong authorization because a role is a privilege boundary.

---

# 48. Privilege Escalation

The most dangerous RBAC vulnerability is allowing an administrator to grant themselves or another account excessive permissions.

Example:

```text
Support user
   ↓
can edit role
   ↓
grants Administrator
   ↓
privilege escalation
```

Role management must itself be protected.

---

# 49. Role Management Permissions

Separate:

```text
roles.read
roles.create
roles.update
roles.delete
```

from:

```text
users.update
```

A user administrator should not automatically be allowed to modify roles.

---

# 50. Permission Management

If permissions are system-defined, ordinary admins should generally not be able to create arbitrary permissions.

Prefer:

```text
application-defined permission registry
```

and:

```text
database stores assignments
```

This prevents arbitrary permission injection.

---

# 51. Assigning Roles

Role assignment should require an explicit permission.

Example:

```text
users.roles.assign
```

or:

```text
roles.assign
```

This action should be audited.

---

# 52. Removing Roles

Likewise:

```text
roles.remove
```

or:

```text
users.roles.remove
```

The permission model should be consistent.

---

# 53. Admin Self-Escalation Protection

An administrator should not necessarily be allowed to:

```text
grant themselves Administrator
remove the only Administrator
disable the last security administrator
```

Protect critical invariants.

Possible rules:

```text
cannot modify own privileged role
```

or:

```text
requires another privileged administrator
```

or:

```text
break-glass workflow
```

Choose based on product requirements.

---

# 54. Last Administrator Protection

Prevent:

```text
Administrator A
   ↓
removes Administrator B
   ↓
no administrators remain
```

unless explicitly allowed through a recovery process.

Enforce this at the service/database transaction boundary.

---

# 55. Role Change Transactions

Role assignments should be transactional.

Example:

```text
BEGIN
  remove old role
  add new role
  create audit record
  create authorization-cache invalidation event
COMMIT
```

This avoids partial authorization state.

---

# 56. Permission Cache

Authorization lookups may become expensive.

A derived cache can store:

```text
user → effective permissions
```

Example:

```text
authz:user:usr_123
```

But cache must be treated as derived state.

---

# 57. Cache Invalidation

When:

```text
role assigned
role removed
role permissions changed
```

invalidate authorization cache.

Events can help:

```text
role.assigned
   ↓
authz cache invalidation
```

---

# 58. Security-Sensitive Cache

Authorization caches require stricter rules than ordinary application caches.

Potential failure:

```text
permission removed
   ↓
cache stale
   ↓
old permission remains active
```

Mitigations:

- Short TTL.
- Explicit invalidation.
- Permission version.
- Session revocation.
- Fail-safe behavior for critical operations.

---

# 59. Permission Version

A user can have:

```text
permissionVersion = 42
```

When authorization changes:

```text
permissionVersion = 43
```

A token/cache can carry the version.

Mismatch:

```text
token version 42
database version 43
```

can force authorization refresh.

---

# 60. JWT + RBAC Strategy

Recommended balance:

```text
JWT:
  user identity
  session identity
  minimal stable claims

Server:
  effective authorization
```

This avoids giant JWTs and reduces stale permission risk.

---

# 61. Authorization Lookup Strategies

### Strategy A — Database on every request

Pros:

- Fresh.
- Simple semantics.

Cons:

- More DB load.

### Strategy B — Redis cache

Pros:

- Fast.
- Distributed.

Cons:

- Invalidation complexity.

### Strategy C — JWT permissions

Pros:

- Very fast.
- No lookup.

Cons:

- Stale permissions.

Recommended:

```text
short-lived access token
+
server-side authorization cache
+
explicit invalidation
```

for larger deployments.

---

# 62. Authorization Failures

Use:

```http
401 Unauthorized
```

when the caller is not authenticated.

Use:

```http
403 Forbidden
```

when authenticated but not authorized.

Do not return `401` for every permission failure.

---

# 63. Resource Not Found vs Forbidden

Sometimes returning `403` reveals that a resource exists.

For sensitive resources, the service may intentionally return:

```http
404 Not Found
```

when the actor is not allowed to know whether the resource exists.

This should be a deliberate resource-specific policy.

---

# 64. Error Messages

Avoid:

```text
You need Administrator role to access user 123.
```

when that reveals sensitive authorization structure.

Prefer:

```text
You do not have permission to perform this action.
```

Detailed authorization reasons belong in secure server logs where appropriate.

---

# 65. Authorization Logging

Log meaningful denied operations:

```text
authorization.denied
```

with:

```text
userId
permission
resourceType
requestId
route
reasonCode
```

Do not log sensitive resource contents.

---

# 66. Audit Logging

High-value authorization changes should create audit events.

Examples:

```text
role.created
role.updated
role.deleted

role.assigned
role.removed

permission.granted
permission.revoked
```

Also audit:

```text
break-glass access
privileged role changes
bulk role assignments
```

---

# 67. Audit vs Debug Logging

Audit:

```text
Administrator granted Support role to user X
```

Debug log:

```text
authorization lookup took 4ms
```

Do not substitute debug logs for audit records.

---

# 68. Authorization Metrics

Useful metrics:

```text
authorization_checks_total
authorization_denied_total
authorization_cache_hits_total
authorization_cache_misses_total
authorization_lookup_duration_seconds
privileged_role_changes_total
```

Avoid high-cardinality labels such as user IDs.

---

# 69. Permission Check Performance

Authorization should not cause N+1 queries.

Bad:

```text
list 100 users
 ↓
load roles for each user
 ↓
load permissions for each role
```

Prefer:

```text
one optimized authorization lookup
```

or a properly cached permission set.

---

# 70. Bulk Authorization

Bulk operations need special care.

Example:

```text
Delete 500 users
```

Do not authorize only the first resource.

Possible approaches:

- Authorize the entire operation scope.
- Filter accessible resources.
- Enforce policy for each resource.
- Reject mixed-authority batches.

The behavior should be explicit.

---

# 71. Bulk Role Assignment

Bulk role assignment is highly privileged.

Example:

```text
Assign Support to 1,000 users
```

Requirements:

- Permission check.
- Resource scope check.
- Transaction/batching strategy.
- Rate limiting.
- Audit record.
- Progress tracking.
- Background processing where large.

---

# 72. Background Job Authorization

Workers do not use the original browser JWT.

Persist:

```text
requestedBy
```

and, where required:

```text
tenantId
resourceScope
operation
```

The API must authorize the request before creating the job.

The worker then executes only the approved operation.

---

# 73. Sensitive Background Operations

For especially sensitive operations:

```text
job
 ↓
service
 ↓
validate current resource state
 ↓
perform operation
```

Do not blindly trust stale authorization assumptions from job creation.

---

# 74. Event-Driven RBAC Changes

Authorization changes can emit events:

```text
role.assigned
role.removed
role.permissions.updated
```

Consumers may:

- Invalidate caches.
- Update search.
- Notify administrators.
- Record analytics.

Critical authorization state itself remains transactional in PostgreSQL.

---

# 75. RBAC and Events

Do not rely on asynchronous events to make a permission change durable.

Bad:

```text
role removed
   ↓
event
   ↓
consumer updates database
```

Better:

```text
transaction
 ├── update role assignment
 ├── audit record
 └── outbox event
```

The permission change is durable immediately.

---

# 76. RBAC and Caching

Cache:

```text
derived permissions
```

not:

```text
authoritative role assignments
```

If Redis is lost, the application must be able to reconstruct authorization from PostgreSQL.

---

# 77. RBAC and Multi-Tenancy

Future model:

```text
tenant
  │
  ├── users
  ├── roles
  └── permissions
```

Roles may be:

```text
global
tenant-scoped
```

Document scope explicitly.

Example:

```text
Administrator
scope = tenant_123
```

does not imply:

```text
Administrator
scope = tenant_456
```

---

# 78. Global Roles

Platform operators may need global access.

Example:

```text
PlatformAdministrator
```

This should be separate from tenant-level roles.

Global access is a highly sensitive capability.

---

# 79. Tenant Role Assignment

For tenant-scoped roles:

```text
user
+
tenant
+
role
```

may be represented by:

```text
user_roles
tenant_id
```

Authorization must evaluate all three dimensions.

---

# 80. Attribute-Based Rules

Some rules depend on attributes:

```text
Manager can edit users in their department.
```

This is beyond simple RBAC.

Model:

```text
RBAC
+
resource policy
```

rather than multiplying roles:

```text
Manager-Sales
Manager-Engineering
Manager-HR
...
```

---

# 81. Policy Layer

A future policy abstraction could be:

```ts
policy.canUpdateUser({
  actor,
  target,
});
```

or:

```ts
authorizationService.authorize({
  actor,
  action: "users.update",
  resource: target,
});
```

Keep policies close to the business domain.

---

# 82. Policy Engine

Do not introduce an external policy engine immediately.

Consider one only when:

- Authorization rules become highly dynamic.
- Multiple applications share policies.
- Policies need centralized administration.
- ABAC becomes substantial.
- Tenant-specific policies become complex.
- Auditable policy evaluation becomes a requirement.

Until then:

```text
RBAC + domain policies
```

is preferable.

---

# 83. Permission Matrix

Maintain a conceptual matrix.

| Role | users.read | users.update | users.delete | roles.update | audit.read |
|---|---:|---:|---:|---:|---:|
| Administrator | ✓ | ✓ | ✓ | ✓ | ✓ |
| Manager | ✓ | ✓ | limited | ✗ | ✓/limited |
| Support | ✓ | ✓ | ✗ | ✗ | ✗ |
| Viewer | ✓ | ✗ | ✗ | ✗ | ✗ |

This is documentation, not necessarily the runtime authorization source.

---

# 84. Permission Matrix Rules

A matrix should identify:

- Normal roles.
- High-risk permissions.
- Resource scope.
- Tenant scope.
- Special conditions.

Avoid treating a matrix as the only source of truth if permissions are dynamically stored.

---

# 85. High-Risk Permissions

Identify dangerous capabilities:

```text
users.delete
roles.update
roles.delete
users.roles.assign
users.suspend
orders.refund
settings.update
audit.export
events.replay
queues.remove
```

These deserve stronger controls.

---

# 86. High-Risk Authorization

For critical operations, consider:

- Re-authentication.
- MFA.
- Step-up authentication.
- Dual approval.
- Reason/comment.
- Confirmation.
- Audit.
- Rate limiting.

The exact controls depend on risk.

---

# 87. Step-Up Authentication

Example:

```text
Admin logged in
   ↓
tries to change Administrator role
   ↓
require recent authentication/MFA
   ↓
authorize
```

A valid session may not be sufficient for highly sensitive operations.

---

# 88. Role Management UI

Admin UI should provide:

```text
Roles
 ├── List
 ├── Create
 ├── View
 ├── Edit
 └── Delete
```

Permission-aware controls:

```text
Can create role?
Can edit role?
Can delete role?
```

But UI restrictions are convenience only.

The API remains authoritative.

---

# 89. Permission Management UI

Display:

```text
Users
  □ Read
  □ Create
  □ Update
  □ Delete

Reports
  □ Read
  □ Create
  □ Export
```

Use stable permission keys internally.

---

# 90. Admin Navigation

Navigation should be permission-aware.

Example:

```text
Dashboard
Users
Roles        ← roles.read
Audit Logs   ← audit.read
Reports      ← reports.read
Settings     ← settings.read
```

Hide unavailable sections where useful.

But hidden navigation does not provide security.

---

# 91. UI Button Permissions

Example:

```tsx
{can("users.create") && (
  <CreateUserButton />
)}
```

Use this to improve UX.

The API must still enforce:

```text
users.create
```

---

# 92. Frontend Permission Store

The Admin app may maintain:

```ts
permissions: Set<string>
```

Example:

```ts
permissions.has("users.update")
```

Avoid duplicating authorization logic across components.

Provide a centralized helper:

```ts
can(permission)
```

---

# 93. Frontend Resource Policies

For resource-specific UI:

```ts
can("users.update") &&
canEditTarget(user)
```

The second rule may depend on:

- Current user.
- Target user.
- Tenant.
- Resource state.

Again, frontend checks improve UX; server checks enforce security.

---

# 94. Route Guards

Admin routes can be guarded:

```text
/users
  requires users.read

/roles
  requires roles.read

/audit
  requires audit.read
```

Unauthorized users should receive a consistent forbidden page.

---

# 95. Frontend 401 Handling

If API returns:

```http
401
```

the Admin client should:

1. Attempt safe token refresh if appropriate.
2. Avoid refresh loops.
3. Clear invalid session state.
4. Redirect to login.

---

# 96. Frontend 403 Handling

If API returns:

```http
403
```

do not log the user out.

The user is authenticated but lacks permission.

Show:

```text
You do not have permission to perform this action.
```

---

# 97. API Client Authorization

The typed API client should not attempt to enforce all permissions.

It can expose:

```ts
can()
```

for UI behavior.

The backend remains authoritative.

---

# 98. Permission Loading

The Admin app may receive authorization context after login:

```json
{
  "user": {
    "id": "usr_123"
  },
  "permissions": [
    "users.read",
    "users.update"
  ]
}
```

Alternatively, load:

```text
GET /api/v1/auth/me
```

or:

```text
GET /api/v1/me/permissions
```

Choose one consistent strategy.

---

# 99. Avoid Permission Duplication

Do not hardcode the same permission matrix separately in:

```text
backend
frontend
documentation
```

The backend remains authoritative.

Where practical, generate frontend permission types/constants from shared contracts.

---

# 100. Permission Contract

A shared package may expose:

```ts
export const PermissionSchema = Type.Union([
  Type.Literal("users.read"),
  Type.Literal("users.create"),
  Type.Literal("users.update"),
  Type.Literal("users.delete"),
]);
```

However, avoid creating an enormous cross-application contract if permissions are purely backend-internal.

Share only what the Admin client needs.

---

# 101. Authorization Context Refresh

Permission changes should become effective predictably.

Potential strategies:

```text
role changed
   ↓
invalidate authz cache
   ↓
next API request resolves new permissions
```

For active sessions, short access-token lifetimes reduce stale authorization windows.

Critical permissions may require immediate session revocation.

---

# 102. Session Revocation

When an account loses critical privileges:

```text
role removed
   ↓
revoke active sessions if policy requires
```

This is especially useful for:

- Administrator downgrade.
- Account suspension.
- Security incident.
- Credential compromise.

---

# 103. Authorization Cache Failure

If Redis authorization cache fails:

```text
Redis unavailable
```

fallback should be:

```text
PostgreSQL lookup
```

when feasible.

Do not default to:

```text
allow
```

because cache is unavailable.

Security-sensitive failure mode:

> **Fail closed, not open.**

---

# 104. Fail-Closed Principle

If authorization cannot be established:

```text
deny
```

not:

```text
allow
```

Exception:

Low-risk UX behavior may degrade gracefully in the frontend, but the backend must remain secure.

---

# 105. Database Authorization Constraints

Application authorization does not replace database constraints.

Example:

```text
UNIQUE(user_id, role_id)
```

prevents duplicate assignments.

Authorization determines whether the actor may create the assignment.

Both are required.

---

# 106. Race Conditions

Authorization-sensitive operations can race.

Example:

```text
Request A:
  actor is Admin

Request B:
  Admin role removed

Request A:
  performs privileged mutation
```

For critical operations, authorization and mutation may need to be evaluated in the same transaction or with appropriate version/state checks.

---

# 107. Role Update Concurrency

Two administrators may edit the same role.

Use:

- Optimistic concurrency.
- Version fields.
- Updated-at checks.
- Transactional updates.

Avoid silent last-write-wins for sensitive role configuration unless acceptable.

---

# 108. Permission Assignment Concurrency

Role permissions should use:

```text
transaction
+
unique constraints
```

to prevent inconsistent duplicate assignments.

Bulk permission replacement should be atomic where possible.

---

# 109. Role Deletion Safety

Before deleting a role:

```text
check assigned users
```

Possible policies:

- Reject deletion while assigned.
- Reassign users.
- Archive/disable role.
- Require explicit migration.

Never silently leave users with broken authorization references.

---

# 110. Permission Deletion Safety

If permissions are application-defined, prefer not deleting them casually.

A removed permission may still exist in:

- Old role assignments.
- Cached authorization.
- Older code.
- Admin UI.
- Audit records.

Deprecate first when possible.

---

# 111. Permission Deprecation

Recommended:

```text
active
 ↓
deprecated
 ↓
unused
 ↓
removed
```

Track usage before removing a permission.

---

# 112. Authorization Testing Strategy

Test authorization at multiple layers:

```text
Unit
Integration
E2E
Security
```

Do not rely only on frontend tests.

---

# 113. Permission Unit Tests

Test:

```ts
expect(can(user, "users.read")).toBe(true);
expect(can(user, "users.delete")).toBe(false);
```

Also test:

```text
unknown permission → deny
missing role → deny
empty permissions → deny
```

---

# 114. Route Authorization Tests

For each protected endpoint:

```text
anonymous → 401
authenticated without permission → 403
authorized role → success
```

This should become a standard integration-test matrix.

---

# 115. IDOR Tests

Example:

```text
User A
  owns resource A

User B
  requests resource A
```

Expected:

```text
deny
```

Test:

- GET.
- PATCH.
- DELETE.
- Nested resources.
- Bulk operations.
- Export endpoints.

---

# 116. Privilege Escalation Tests

Test that a low-privilege user cannot:

- Assign themselves Administrator.
- Create an Administrator role.
- Grant privileged permissions.
- Modify privileged roles.
- Remove security controls.
- Replay sensitive events.
- Manage queues.

---

# 117. Role Matrix Tests

Generate tests from a permission matrix where practical.

Example:

```text
Administrator → users.delete → allow
Support       → users.delete → deny
Viewer        → users.delete → deny
```

This reduces authorization regressions.

---

# 118. Multi-Role Tests

Test:

```text
Role A + Role B
```

and verify effective permissions.

Example:

```text
Support + Analyst
```

should receive the expected union.

---

# 119. Tenant Isolation Tests

When multi-tenancy exists:

```text
Tenant A user
  ↓
Tenant B resource
  ↓
deny
```

Test every resource path.

Cross-tenant IDOR is a critical security issue.

---

# 120. Cache Authorization Tests

Test:

```text
permission granted
 ↓
cache

permission revoked
 ↓
invalidate

request
 ↓
new permission state
```

Also test:

```text
Redis unavailable
 ↓
fallback
 ↓
secure authorization decision
```

---

# 121. Role Change E2E Test

Example:

```text
Admin grants Support role
        ↓
User permissions refresh
        ↓
Support endpoint becomes available
```

Then:

```text
Admin removes Support role
        ↓
authorization refresh
        ↓
endpoint denied
```

---

# 122. Session Revocation Test

For critical role changes:

```text
Admin
 ↓
downgrades privileged user
 ↓
session revoked
 ↓
old token rejected
```

This should be tested if implemented.

---

# 123. Authorization Fuzzing

For sensitive APIs, fuzz:

- Unknown permission names.
- Malformed role IDs.
- Duplicate role assignments.
- Invalid tenant IDs.
- Unexpected resource IDs.
- Missing auth context.

Expected result:

```text
safe rejection
```

---

# 124. Security Regression Tests

Maintain regression tests for:

- IDOR.
- Privilege escalation.
- Horizontal privilege escalation.
- Vertical privilege escalation.
- Tenant escape.
- Stale authorization cache.
- JWT role tampering.
- Missing permission checks.
- Admin endpoint exposure.

---

# 125. Horizontal vs Vertical Escalation

### Horizontal

User A accesses User B's resources.

```text
same privilege level
wrong resource
```

### Vertical

Support user accesses Administrator functionality.

```text
lower privilege
higher privilege
```

Both must be tested.

---

# 126. JWT Tampering

Never trust client-supplied:

```text
role
permissions
isAdmin
```

unless they are cryptographically signed and validated.

Even signed authorization claims should be treated according to their freshness semantics.

Never decode JWT and trust it without verifying its signature and expected claims.

---

# 127. Client-Side Role Tampering

Never use:

```ts
localStorage.isAdmin
```

for backend authorization.

A malicious user controls browser state.

The server must derive authorization from trusted server-side state.

---

# 128. Route Coverage

Every protected route should declare authorization explicitly.

Review routes for:

```text
authenticate
+
permission
+
resource policy
```

Do not rely on developers remembering a hidden global convention.

---

# 129. Public Routes

Public endpoints should be explicitly identified.

Examples:

```text
GET /health
GET /ready
POST /auth/register
POST /auth/login
POST /auth/refresh
```

Protected endpoints should default to authentication.

---

# 130. Secure-by-Default Route Registration

Where practical, structure route modules so protected routes require explicit authentication.

Avoid accidentally registering a sensitive route without middleware.

---

# 131. Nested Resources

Example:

```http
GET /api/v1/users/:userId/todos
```

Authorization must validate:

```text
actor
+
userId
+
permission
```

Do not assume:

```text
has users.read
```

means:

```text
can access any user's todos
```

---

# 132. Search Authorization

Search endpoints are particularly sensitive.

Example:

```http
GET /api/v1/users?search=...
```

must apply authorization scope before returning results.

Do not fetch all records and filter authorization afterward.

Prefer:

```text
authorized query
```

at the database layer.

---

# 133. Pagination Authorization

Authorization filters must apply before pagination.

Bad:

```text
fetch first 20
 ↓
filter unauthorized
```

This can produce:

- Missing authorized records.
- Incorrect counts.
- Information leaks.

Better:

```text
authorized query
 ↓
filter
 ↓
pagination
```

---

# 134. Sorting and Authorization

Sorting should not expose fields the actor cannot access.

Example:

```text
sort=salary
```

may be restricted even if:

```text
users.read
```

is allowed.

Sensitive fields require separate authorization/data projection.

---

# 135. Field-Level Authorization

Some resources may require field-level restrictions.

Example:

```text
Support can view:
name
email
status

Support cannot view:
salary
security settings
internal notes
```

Options:

- DTO projections.
- Field policies.
- Separate endpoints.
- Role-based serializers.

Never fetch sensitive data and merely hide it in React.

---

# 136. Response Projection

Prefer:

```ts
toUserResponse(user, authContext)
```

or explicit repository projections.

This reduces accidental sensitive-data exposure.

---

# 137. Update Field Authorization

A role may be allowed to update a user but not every field.

Example:

```text
Support:
  can update name
  can update phone

Support:
  cannot update roles
  cannot update password policy
```

Use explicit field/business rules.

---

# 138. Mass Assignment Protection

Never blindly apply request body:

```ts
await prisma.user.update({
  data: request.body,
});
```

A malicious client may submit:

```json
{
  "isAdmin": true,
  "roleIds": ["administrator"]
}
```

Use explicit DTO mapping.

---

# 139. Role Assignment API

Example:

```http
POST /api/v1/users/:id/roles
```

Authorization:

```text
users.roles.assign
```

plus:

```text
target resource policy
```

plus:

```text
role scope rules
```

plus:

```text
privilege escalation protection
```

---

# 140. Role Management API

Possible endpoints:

```text
GET    /api/v1/roles
POST   /api/v1/roles
GET    /api/v1/roles/:id
PATCH  /api/v1/roles/:id
DELETE /api/v1/roles/:id

GET    /api/v1/roles/:id/permissions
PUT    /api/v1/roles/:id/permissions
```

Every endpoint requires explicit authorization.

---

# 141. Permission API

Possible:

```text
GET /api/v1/permissions
```

This may be read-only and intended for role management UI.

Permission creation should normally remain an application/deployment concern.

---

# 142. User Authorization API

Possible:

```text
GET /api/v1/me
GET /api/v1/me/permissions
GET /api/v1/me/roles
```

These endpoints should return only safe authorization context.

---

# 143. Admin Authorization API

The Admin app may need:

```json
{
  "user": {
    "id": "usr_123"
  },
  "roles": [
    "support"
  ],
  "permissions": [
    "users.read",
    "users.update"
  ]
}
```

Avoid returning sensitive role internals.

---

# 144. Authorization Contract Example

```ts
type AuthorizationDecision = {
  allowed: boolean;
  reasonCode?: string;
};
```

Internally, the service can preserve detailed reason codes.

Public APIs should return safe messages.

---

# 145. Reason Codes

Useful internal codes:

```text
AUTHZ_MISSING_PERMISSION
AUTHZ_RESOURCE_FORBIDDEN
AUTHZ_TENANT_MISMATCH
AUTHZ_ACCOUNT_SUSPENDED
AUTHZ_PRIVILEGE_ESCALATION
AUTHZ_STEP_UP_REQUIRED
```

Do not expose unnecessary policy internals to clients.

---

# 146. Policy Evaluation Order

Recommended:

```text
1. Authenticate
2. Check account/session state
3. Check global permission
4. Check tenant scope
5. Load target resource
6. Check resource policy
7. Check sensitive field/action constraints
8. Execute operation
```

The exact order may vary by endpoint.

---

# 147. Authorization and Transactions

For high-impact mutations:

```text
BEGIN
  verify relevant state
  perform authorization-sensitive mutation
  write audit event
  write outbox event
COMMIT
```

This reduces race-condition windows.

---

# 148. Authorization and Database Queries

Prefer authorization-aware queries.

Example:

```ts
const user = await prisma.user.findFirst({
  where: {
    id: targetUserId,
    tenantId: auth.tenantId,
  },
});
```

Then apply permission/resource rules.

Do not query unrestricted data and filter afterward.

---

# 149. Repository Boundary

Repositories should not generally decide whether a user is an Administrator.

Application services should coordinate:

```text
route
 ↓
authorization
 ↓
service
 ↓
repository
```

Repositories focus on data access.

Authorization policy belongs at the application/domain boundary.

---

# 150. Authorization in Services

Do not rely exclusively on routes.

Sensitive business services may be invoked by:

- HTTP routes.
- Workers.
- CLI scripts.
- Tests.
- Future integrations.

The service should enforce important business invariants.

However, avoid duplicating identical route permission checks inside every service without a clear policy model.

---

# 151. Service Authorization Pattern

Conceptual:

```ts
await authorizationService.authorize({
  actor,
  action: "orders.refund",
  resource: order,
});

await orderService.refund(order);
```

This keeps authorization explicit.

---

# 152. Background Service Identity

Workers may operate as:

```text
service identity
```

rather than user identity.

Example:

```text
report-worker
```

has only the database/integration permissions needed for report generation.

Do not grant every worker administrator-level access.

---

# 153. Worker Actor Context

When a job originated from an Admin action:

```text
requestedBy = usr_123
```

should be retained for audit and business context.

Do not turn:

```text
requestedBy
```

into:

```text
worker is now usr_123
```

The worker remains a service process.

---

# 154. CLI and Scripts

Administrative scripts should use explicit privileged credentials/service identity.

Do not bypass RBAC simply because code runs locally.

Production scripts should be:

- Authenticated.
- Authorized.
- Audited where appropriate.
- Protected by operational controls.

---

# 155. Testing Fixtures

Create standard fixtures:

```text
administrator
manager
support
viewer
regular-user
```

and:

```text
user-owned-resource
manager-owned-resource
other-tenant-resource
```

This makes authorization tests consistent.

---

# 156. Authorization Test Matrix

For each protected action:

```text
Anonymous
Authenticated/no role
Viewer
Support
Manager
Administrator
Resource owner
Non-owner
Wrong tenant
Suspended user
```

Expected decisions should be explicit.

---

# 157. Golden Security Rule

For every protected endpoint ask:

```text
Who is the actor?
What permission is required?
What resource is being accessed?
What scope applies?
Can the actor manipulate the resource ID?
Can the actor modify sensitive fields?
Can the actor escalate privilege?
```

If these questions are unanswered, the endpoint is not authorization-complete.

---

# 158. RBAC Operational Runbook

When a user reports missing access:

1. Confirm authentication.
2. Confirm account status.
3. Check assigned roles.
4. Check role permissions.
5. Check tenant scope.
6. Check resource policy.
7. Check authorization cache.
8. Check recent role changes.
9. Check session/token age.
10. Review authorization logs.
11. Reproduce with a controlled test account.

Do not immediately grant Administrator access as a troubleshooting shortcut.

---

# 159. Privilege Escalation Incident

If unauthorized privilege is suspected:

1. Revoke affected sessions.
2. Disable compromised account if necessary.
3. Review role changes.
4. Review audit logs.
5. Identify actor/request IDs.
6. Revert unauthorized role assignments.
7. Rotate credentials if compromised.
8. Check for downstream actions.
9. Preserve evidence.
10. Document incident.
11. Add regression tests.

---

# 160. RBAC Backup and Recovery

Back up:

```text
roles
permissions
user_roles
role_permissions
audit records
```

Role configuration is security-critical application state.

After restore, verify:

- Role assignments.
- System roles.
- Permission registry compatibility.
- Privileged accounts.
- Authorization cache invalidation.

---

# 161. Seed Data

System permissions and roles should be seeded deterministically.

Example:

```text
users.read
users.create
users.update
users.delete
```

Use stable keys.

Do not create duplicate permissions on every deployment.

---

# 162. Permission Seeding

Use:

```text
upsert by permission key
```

rather than:

```text
insert blindly
```

This makes deployments repeatable.

---

# 163. System Role Seeding

System roles should be provisioned through controlled migrations/seeds.

Example:

```text
Administrator
Viewer
```

Document their expected permissions.

---

# 164. Custom Role Migration

If a permission is renamed:

```text
users.manage
```

to:

```text
users.update
```

migrate role assignments before removing the old permission.

Use compatibility periods for important changes.

---

# 165. RBAC and API Versioning

If API v2 changes endpoint semantics, permissions should usually remain business-oriented.

Example:

```text
users.update
```

should remain valid across:

```text
/api/v1/users
/api/v2/users
```

unless the business capability itself changes.

---

# 166. RBAC and Error Handling

Authorization failures should use the standardized API error contract.

Example:

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to perform this action."
  }
}
```

Keep internal reason codes separate where necessary.

---

# 167. RBAC and Rate Limiting

Privileged endpoints should have appropriate rate limits.

Examples:

```text
role assignment
bulk role update
permission changes
```

Rate limiting does not replace authorization.

It adds abuse protection.

---

# 168. RBAC and Audit Logging

Every high-risk authorization mutation should produce an audit record.

Example:

```text
actor: usr_admin
action: role.assigned
target: usr_456
role: support
requestId: req_123
```

Do not store secrets in audit metadata.

---

# 169. RBAC and Incident Response

Authorization changes are high-value incident evidence.

During investigation, correlate:

```text
audit event
+
request ID
+
user
+
role
+
permission
+
deployment
+
session
```

This helps identify unauthorized privilege changes.

---

# 170. Documentation Requirements

Every permission should have:

```text
key
description
risk
owner
```

Example:

```text
users.delete
Description: Permanently delete users where business policy allows.
Risk: High
Owner: Users module
```

---

# 171. Permission Risk Classification

Recommended:

```text
LOW
MEDIUM
HIGH
CRITICAL
```

Examples:

```text
users.read      → LOW
users.update    → MEDIUM
users.delete    → HIGH
roles.update    → CRITICAL
events.replay   → CRITICAL
```

Risk classification can drive:

- MFA.
- Approval.
- Audit.
- Rate limits.
- Alerts.

---

# 172. Authorization Review Checklist

For every new permission:

- [ ] Name follows convention.
- [ ] Business capability is clear.
- [ ] Owner is identified.
- [ ] Risk is classified.
- [ ] API routes are identified.
- [ ] Resource policy is identified.
- [ ] Admin UI impact is identified.
- [ ] Audit requirements are identified.
- [ ] Tests exist.
- [ ] Documentation is updated.

---

# 173. New Protected Endpoint Workflow

When adding an endpoint:

```text
1. Define business action.
2. Define permission.
3. Add authentication.
4. Add permission middleware.
5. Define resource policy.
6. Apply tenant/ownership scope.
7. Validate input.
8. Project safe output.
9. Add audit where required.
10. Add tests.
11. Document OpenAPI.
12. Update Admin UI permissions.
```

---

# 174. New Role Workflow

```text
1. Define role purpose.
2. Select explicit permissions.
3. Define scope.
4. Identify sensitive capabilities.
5. Add seed/configuration if system role.
6. Add Admin UI support.
7. Add tests.
8. Document.
9. Audit assignments.
```

---

# 175. New Permission Workflow

```text
1. Identify business capability.
2. Choose stable key.
3. Add permission registry entry.
4. Add database seed/migration if required.
5. Add API enforcement.
6. Add Admin UI behavior.
7. Add tests.
8. Classify risk.
9. Update documentation.
```

---

# 176. Common Anti-Patterns

## Anti-pattern 1: UI-only authorization

```text
Hide button
```

does not secure the API.

---

## Anti-pattern 2: isAdmin everywhere

```ts
if (user.isAdmin) {
  ...
}
```

creates authorization sprawl.

---

## Anti-pattern 3: Trusting role from request

```json
{
  "role": "admin"
}
```

must never grant privilege.

---

## Anti-pattern 4: Trusting localStorage

Browser-controlled state is not trusted.

---

## Anti-pattern 5: Giant JWT permission list

Creates stale and oversized credentials.

---

## Anti-pattern 6: Query then filter

Fetching unauthorized records before filtering can leak information.

---

## Anti-pattern 7: No resource check

```text
users.update
```

does not automatically authorize every user ID.

---

## Anti-pattern 8: Role hierarchy everywhere

Creates difficult-to-audit inheritance rules.

---

## Anti-pattern 9: Admin can grant everything

Role management itself requires authorization.

---

## Anti-pattern 10: Fail open

If Redis/auth lookup fails:

```text
allow
```

is unacceptable.

---

# 177. Recommended Fastify Architecture

```text
apps/api/src/
  auth/
    authentication/
    authorization/
      authorization.service.ts
      permissions.ts
      roles.ts
      policies/

  modules/
    users/
      routes/
      services/
      repositories/
      policies/

    roles/
      routes/
      services/
      repositories/

    audit/
      ...

  plugins/
    auth.ts
    authorization.ts
```

The exact folders can evolve, but authorization responsibilities should remain centralized and discoverable.

---

# 178. Recommended Admin Architecture

```text
apps/admin/src/
  auth/
    session/
    permissions/
    guards/

  components/
    PermissionGate.tsx

  routes/
    protected/

  features/
    users/
    roles/
    audit/
```

Provide a reusable:

```tsx
<PermissionGate permission="users.create">
  ...
</PermissionGate>
```

for UI behavior.

---

# 179. PermissionGate Example

Conceptual:

```tsx
<PermissionGate permission="roles.update">
  <EditRoleButton />
</PermissionGate>
```

For multiple permissions:

```tsx
<PermissionGate
  permissions={[
    "users.read",
    "users.update",
  ]}
  mode="all"
>
  ...
</PermissionGate>
```

Again, this is UX protection, not backend security.

---

# 180. Authorization Hook

Conceptual:

```ts
const { can } = useAuthorization();

if (can("users.delete")) {
  // render action
}
```

Keep this logic centralized.

---

# 181. Permission-Aware Routing

Conceptual:

```ts
{
  path: "/roles",
  requiredPermission: "roles.read",
}
```

A route guard can prevent unnecessary navigation.

The API remains authoritative.

---

# 182. Authorization Loading State

When permissions are not loaded yet:

```text
Loading authorization context...
```

Do not briefly render privileged controls and then hide them.

Prefer safe loading behavior.

---

# 183. Authorization Cache in React

TanStack Query can cache:

```text
current user
roles
permissions
```

Invalidate after:

- Login.
- Logout.
- Role changes.
- Session refresh.
- Account changes.

Do not persist sensitive authorization state indefinitely.

---

# 184. Stale Frontend Permissions

Frontend permissions may become stale.

If the UI shows a button but the backend denies:

```text
403
```

handle it gracefully.

Do not assume frontend state is authoritative.

---

# 185. Authorization UX

For denied operations:

```text
You don't have permission to perform this action.
```

For resource-specific restrictions:

```text
You don't have access to this resource.
```

Avoid exposing internal role hierarchy.

---

# 186. Accessibility

Permission-aware UI must not create broken navigation.

Ensure:

- Hidden actions are not keyboard-reachable.
- Disabled actions have accessible labels if shown.
- Forbidden pages have meaningful headings.
- Loading authorization states are accessible.

---

# 187. Authorization Performance Budget

Authorization should be cheap relative to business operations.

Target architecture:

```text
request
 ↓
auth
 ↓
permission lookup/cache
 ↓
resource policy
 ↓
business operation
```

Avoid multiple independent permission database queries per request.

---

# 188. Permission Cache Key

Example:

```text
authz:v1:user:usr_123
```

Include versioning.

For tenants:

```text
authz:v1:tenant:tenant_123:user:usr_123
```

Avoid ambiguous keys.

---

# 189. Cache TTL

Authorization cache TTL should be short enough to limit stale privilege windows.

Critical authorization changes should use explicit invalidation rather than relying solely on TTL.

---

# 190. Cache Stampede

If many requests miss authorization cache simultaneously:

```text
1000 requests
 ↓
1000 DB permission lookups
```

Use:

- Single-flight.
- Short-lived locks.
- Warm-up where appropriate.

Do not sacrifice fail-closed behavior for cache optimization.

---

# 191. Authorization Cache Invalidation Event

Conceptual:

```text
role.assigned
    ↓
authz.invalidate(userId)
```

For role permission changes:

```text
role.permissions.updated
    ↓
find affected users
    ↓
invalidate authorization caches
```

For large user populations, use versioning rather than invalidating millions of keys individually.

---

# 192. Authorization Versioning

A scalable model:

```text
roleVersion = 17
```

Cache:

```text
user permissions + roleVersion
```

When role changes:

```text
roleVersion++
```

Consumers detect mismatch and rebuild authorization context.

---

# 193. Global Permission Version

For system-wide permission changes:

```text
authorizationPolicyVersion
```

can invalidate broad cached authorization state.

Use carefully to avoid turning every deployment into a cache miss storm.

---

# 194. Security-Critical Cache Invalidation

For critical changes:

```text
role removed
administrator disabled
account suspended
```

consider:

```text
cache invalidation
+
session revocation
```

depending on threat model.

---

# 195. Authorization Reconciliation

Periodic checks can detect anomalies:

```text
users with unknown roles
roles with unknown permissions
duplicate assignments
disabled users with active sessions
```

This is especially useful after migrations or incidents.

---

# 196. RBAC Health Checks

Do not expose sensitive authorization details through public health endpoints.

Internal operational checks may verify:

```text
permission registry loaded
database reachable
role tables accessible
```

Keep health endpoints safe.

---

# 197. Production RBAC Checklist

### Authentication

- [ ] JWT verification works.
- [ ] Session state is validated.
- [ ] Suspended users are denied.

### Authorization

- [ ] Default deny.
- [ ] Permission checks centralized.
- [ ] Resource checks implemented.
- [ ] Tenant scope enforced.
- [ ] Sensitive fields protected.

### Administration

- [ ] Role management protected.
- [ ] Permission management protected.
- [ ] Privilege escalation prevented.
- [ ] Last-admin protection exists where required.
- [ ] High-risk actions audited.

### Caching

- [ ] Authorization cache is derived.
- [ ] Invalidation works.
- [ ] Redis failure fails safely.
- [ ] Stale privilege windows are understood.

### Testing

- [ ] 401 tests.
- [ ] 403 tests.
- [ ] RBAC matrix tests.
- [ ] IDOR tests.
- [ ] Privilege escalation tests.
- [ ] Tenant isolation tests.
- [ ] Cache invalidation tests.

---

# 198. Security Review Checklist

Before production, verify:

```text
Can a normal user:
  □ call admin APIs?
  □ change their own role?
  □ assign roles?
  □ grant permissions?
  □ access another user's resource?
  □ access another tenant?
  □ modify protected fields?
  □ replay privileged events?
  □ manage queues?
  □ export sensitive data?
```

Every answer should be explicitly controlled.

---

# 199. Architecture Decision

The recommended authorization architecture is:

```text
Authentication
     ↓
Central Authorization Service
     ↓
RBAC permissions
     ↓
Resource/ownership policy
     ↓
Tenant scope
     ↓
Business service
     ↓
Database constraints
```

This provides layered protection without requiring a heavyweight policy engine.

---

# 200. Future Evolution

The architecture can evolve toward:

```text
RBAC
  ↓
RBAC + Ownership
  ↓
RBAC + Resource Policies
  ↓
RBAC + ABAC
  ↓
Central Policy Service
```

Move to the next level only when complexity justifies it.

---

# 201. Recommended Initial Roles

For Fastify-MasterApp:

```text
Administrator
Support
Manager
Viewer
```

Potential future roles:

```text
Auditor
Operations
Finance
Developer
Platform Administrator
```

Actual roles should reflect product responsibilities rather than technical convenience.

---

# 202. Recommended Initial Permissions

Start with a focused set:

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

audit.read

reports.read
reports.create
reports.export

settings.read
settings.update
```

Add domain-specific permissions as features mature.

---

# 203. Suggested High-Risk Permissions

Treat these as high risk:

```text
users.delete
roles.create
roles.update
roles.delete
users.roles.assign
settings.update
audit.export
events.replay
queues.pause
queues.remove
```

Consider step-up authentication/MFA for critical actions.

---

# 204. Permission Lifecycle

```text
Proposed
   ↓
Implemented
   ↓
Assigned
   ↓
Used
   ↓
Deprecated
   ↓
Removed
```

Track permission usage before removing mature permissions.

---

# 205. Final Golden Rules

1. **Authentication and authorization are separate.**
2. **Default deny.**
3. **Never trust frontend authorization.**
4. **Never trust client-supplied roles or permissions.**
5. **A valid JWT does not mean the user is authorized.**
6. **Use explicit business permissions.**
7. **Protect resources, not just routes.**
8. **Prevent IDOR.**
9. **Prevent horizontal privilege escalation.**
10. **Prevent vertical privilege escalation.**
11. **Protect role management itself.**
12. **Do not use `isAdmin` throughout the codebase.**
13. **Keep authorization centralized and discoverable.**
14. **Use database constraints for authorization-related invariants.**
15. **Apply tenant scope before querying data.**
16. **Do not fetch unauthorized records and filter afterward.**
17. **Protect sensitive fields separately when required.**
18. **Do not put large permission lists into long-lived JWTs.**
19. **Treat authorization caches as derived state.**
20. **Fail closed when authorization cannot be established.**
21. **Invalidate authorization caches after role changes.**
22. **Audit privileged role and permission changes.**
23. **Test every protected endpoint with both allowed and denied actors.**
24. **Test IDOR and privilege escalation explicitly.**
25. **Do not let background workers inherit browser credentials.**
26. **Keep actor identity separate from worker service identity.**
27. **Use step-up authentication for critical actions when justified.**
28. **Keep system permissions controlled by application code.**
29. **Do not introduce a policy engine until complexity requires it.**
30. **Authorization should be explicit, testable, observable, and fail-safe.**

---

# 206. Definition of Done

RBAC is production-ready when:

### Model

- [ ] Roles exist.
- [ ] Permissions exist.
- [ ] User-role assignments exist.
- [ ] Role-permission assignments exist.
- [ ] Unique constraints exist.
- [ ] Foreign keys exist.

### API

- [ ] Authentication is required.
- [ ] Permissions are checked.
- [ ] Resource authorization exists.
- [ ] Tenant scope exists where required.
- [ ] Sensitive fields are protected.
- [ ] `401` and `403` behavior is consistent.

### Security

- [ ] Default deny.
- [ ] IDOR protection.
- [ ] Privilege escalation protection.
- [ ] Mass assignment protection.
- [ ] Last-admin protection where required.
- [ ] High-risk operations have appropriate controls.
- [ ] Client-side state is never trusted.

### Admin

- [ ] Permission-aware navigation.
- [ ] Permission-aware actions.
- [ ] Role management.
- [ ] Safe role editing.
- [ ] Forbidden-state UX.
- [ ] Frontend authorization state refresh.

### Operations

- [ ] Authorization logging.
- [ ] Audit logging.
- [ ] Authorization metrics.
- [ ] Cache invalidation.
- [ ] Redis failure fallback.
- [ ] Incident procedures.

### Testing

- [ ] Unit tests.
- [ ] Route tests.
- [ ] RBAC matrix tests.
- [ ] IDOR tests.
- [ ] Privilege escalation tests.
- [ ] Tenant isolation tests where applicable.
- [ ] Cache invalidation tests.
- [ ] Critical E2E tests.

---

# 207. Final Architecture Summary

Fastify-MasterApp should use:

```text
                       ┌──────────────────┐
                       │    React Admin   │
                       └────────┬─────────┘
                                │
                         UX permission checks
                                │
                                ▼
                       ┌──────────────────┐
                       │   Fastify API   │
                       └────────┬─────────┘
                                │
                                ▼
                         Authentication
                                │
                                ▼
                    Central Authorization
                           Service
                                │
                ┌───────────────┼────────────────┐
                ▼               ▼                ▼
              RBAC          Resource Policy   Tenant Scope
                │               │                │
                └───────────────┼────────────────┘
                                ▼
                       Application Service
                                │
                                ▼
                           Repository
                                │
                                ▼
                           PostgreSQL

             ┌─────────────────────────────────────┐
             │ Derived Authorization Cache (Redis) │
             └─────────────────────────────────────┘
                              ▲
                              │
                     Role/permission events
                              │
                         Transactional
                            Outbox
```

The desired end state is not merely "users have roles."

It is:

```text
Explicit permissions
       +
Default deny
       +
Resource authorization
       +
Tenant isolation
       +
Safe administration
       +
Fail-closed behavior
       +
Auditing
       +
Testing
       +
Operational visibility
```

That gives Fastify-MasterApp a strong authorization foundation while preserving the modular-monolith architecture and leaving room for more advanced policy models later.
