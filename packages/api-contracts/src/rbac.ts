import { Type, type Static } from '@sinclair/typebox';

/**
 * RBAC contracts — shared between the Fastify API and the React admin.
 *
 * The permission catalog is an application-defined registry. It is the single
 * source of truth for permission keys used by:
 *   - API route authorization (requirePermission)
 *   - the seed (which permissions get created and attached to system roles)
 *   - the admin UI (which buttons/nav to show via can())
 *
 * The database stores role/permission ASSIGNMENTS, never arbitrary keys — this
 * prevents clients from injecting permissions that don't exist in the registry.
 */

// ── Permission catalog ─────────────────────────────────────────────────────────
// Format: "<resource>.<action>", lowercase, stable. Add here first, then wire
// enforcement/seed/UI. Adding a permission is a deliberate contract change.
export const PermissionKeys = {
  // Dashboard
  DashboardRead: 'dashboard.read',

  // Users
  UsersRead: 'users.read',
  UsersCreate: 'users.create',
  UsersUpdate: 'users.update',
  UsersDelete: 'users.delete',

  // User ↔ role assignment (kept separate from users.update so a user admin is
  // not automatically allowed to change role assignments — privilege boundary)
  UsersRolesRead: 'users.roles.read',
  UsersRolesUpdate: 'users.roles.update',

  // Roles
  RolesRead: 'roles.read',
  RolesCreate: 'roles.create',
  RolesUpdate: 'roles.update',
  RolesDelete: 'roles.delete',

  // Permissions (read-only registry to admins)
  PermissionsRead: 'permissions.read',

  // Todos
  TodosRead: 'todos.read',
  TodosCreate: 'todos.create',
  TodosUpdate: 'todos.update',
  TodosDelete: 'todos.delete',
  TodosReadAll: 'todos.read_all',

  // Orders
  OrdersRead: 'orders.read',
  OrdersCreate: 'orders.create',
  OrdersUpdate: 'orders.update',
  OrdersCancel: 'orders.cancel',
  OrdersDelete: 'orders.delete',

  // Audit
  AuditRead: 'audit.read',

  // Operational metrics / diagnostics
  MetricsRead: 'metrics.read',

  // Settings
  SettingsRead: 'settings.read',
  SettingsUpdate: 'settings.update',
} as const;

export type PermissionKey = (typeof PermissionKeys)[keyof typeof PermissionKeys];

/** Every permission key as a flat, iterable list (used by the seed). */
export const ALL_PERMISSION_KEYS: PermissionKey[] = Object.values(PermissionKeys);

/** Runtime guard: is a string a known permission key? */
export function isPermissionKey(value: string): value is PermissionKey {
  return (ALL_PERMISSION_KEYS as string[]).includes(value);
}

// ── System roles ────────────────────────────────────────────────────────────────
// Stable role names. SUPER_ADMIN is the platform break-glass role and is
// specially protected (only a SUPER_ADMIN may grant/remove it).
export const SystemRoles = {
  SuperAdmin: 'SUPER_ADMIN',
  Admin: 'ADMIN',
  Manager: 'MANAGER',
  Support: 'SUPPORT',
  Viewer: 'VIEWER',
} as const;

export type SystemRoleName = (typeof SystemRoles)[keyof typeof SystemRoles];

// ── DTOs / API schemas ────────────────────────────────────────────────────────

export const PermissionDto = Type.Object({
  id: Type.String(),
  key: Type.String(),
  description: Type.Union([Type.String(), Type.Null()]),
});
export type PermissionDto = Static<typeof PermissionDto>;

export const RoleDto = Type.Object({
  id: Type.String(),
  name: Type.String(),
  description: Type.Union([Type.String(), Type.Null()]),
  isSystem: Type.Boolean(),
  permissions: Type.Array(Type.String()),
  createdAt: Type.String(),
  updatedAt: Type.String(),
});
export type RoleDto = Static<typeof RoleDto>;

export const RoleListResponse = Type.Object({
  success: Type.Literal(true),
  data: Type.Array(RoleDto),
});
export type RoleListResponse = Static<typeof RoleListResponse>;

export const RoleResponse = Type.Object({
  success: Type.Literal(true),
  data: RoleDto,
});
export type RoleResponse = Static<typeof RoleResponse>;

export const PermissionListResponse = Type.Object({
  success: Type.Literal(true),
  data: Type.Array(PermissionDto),
});
export type PermissionListResponse = Static<typeof PermissionListResponse>;

export const CreateRoleBody = Type.Object({
  name: Type.String({ minLength: 2, maxLength: 64 }),
  description: Type.Optional(Type.String({ maxLength: 500 })),
  // Permission keys to attach. Validated server-side against the registry.
  permissions: Type.Optional(Type.Array(Type.String(), { maxItems: 200 })),
});
export type CreateRoleBody = Static<typeof CreateRoleBody>;

export const UpdateRoleBody = Type.Object({
  description: Type.Optional(Type.String({ maxLength: 500 })),
  // When present, replaces the full permission set for the role.
  permissions: Type.Optional(Type.Array(Type.String(), { maxItems: 200 })),
});
export type UpdateRoleBody = Static<typeof UpdateRoleBody>;

export const UpdateRolePermissionsBody = Type.Object({
  permissions: Type.Array(Type.String(), { maxItems: 200 }),
});
export type UpdateRolePermissionsBody = Static<typeof UpdateRolePermissionsBody>;

export const SetUserRolesBody = Type.Object({
  // Role names to assign to the user. Replaces the user's current role set.
  roles: Type.Array(Type.String(), { maxItems: 50 }),
});
export type SetUserRolesBody = Static<typeof SetUserRolesBody>;

export const UserRolesResponse = Type.Object({
  success: Type.Literal(true),
  data: Type.Object({
    userId: Type.String(),
    roles: Type.Array(Type.String()),
  }),
});
export type UserRolesResponse = Static<typeof UserRolesResponse>;

// ── Effective authorization context (exposed to the frontend) ──────────────────
export const EffectivePermissions = Type.Object({
  userId: Type.String(),
  roles: Type.Array(Type.String()),
  permissions: Type.Array(Type.String()),
});
export type EffectivePermissions = Static<typeof EffectivePermissions>;

export const MeResponse = Type.Object({
  success: Type.Literal(true),
  data: Type.Object({
    id: Type.String(),
    email: Type.String(),
    name: Type.String(),
    role: Type.String(),
    createdAt: Type.String(),
    updatedAt: Type.String(),
    roles: Type.Array(Type.String()),
    permissions: Type.Array(Type.String()),
  }),
});
export type MeResponse = Static<typeof MeResponse>;
