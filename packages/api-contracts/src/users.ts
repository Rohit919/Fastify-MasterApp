import { Type, type Static } from '@sinclair/typebox';
import {
  DataEnvelope,
  PaginatedEnvelope,
  PaginationQuery,
  UserRole,
} from './common.js';

/**
 * Users contracts — shared between the API and the admin.
 */

// ── Resource representations (API-safe; never expose passwordHash etc.) ──────
export const UserProfile = Type.Object({
  id: Type.String(),
  email: Type.String(),
  name: Type.String(),
  role: Type.String(),
  createdAt: Type.String(),
  updatedAt: Type.String(),
});
export type UserProfile = Static<typeof UserProfile>;

/** Trimmed representation for collection endpoints (API_CONVENTIONS §21). */
export const UserListItem = Type.Object({
  id: Type.String(),
  email: Type.String(),
  name: Type.String(),
  role: Type.String(),
  createdAt: Type.String(),
});
export type UserListItem = Static<typeof UserListItem>;

// ── Legacy `{ success, data }` envelopes (kept for /me + existing admin) ─────
export const UserProfileResponse = Type.Object({
  success: Type.Literal(true),
  data: UserProfile,
});
export type UserProfileResponse = Static<typeof UserProfileResponse>;

export const UserListResponse = Type.Object({
  success: Type.Literal(true),
  data: Type.Array(UserProfile),
});
export type UserListResponse = Static<typeof UserListResponse>;

// ── Canonical envelopes (API_CONVENTIONS §9–§12) ─────────────────────────────
/** Single user resource: `{ data }`. */
export const UserResponse = DataEnvelope(UserProfile);
export type UserResponse = Static<typeof UserResponse>;

/** Paginated user collection: `{ data: UserListItem[], meta }`. */
export const UsersListResponse = PaginatedEnvelope(UserListItem);
export type UsersListResponse = Static<typeof UsersListResponse>;

/**
 * GET /users query contract: pagination + search + role filter + sorting.
 * `sortBy` is whitelisted (API_CONVENTIONS §17); never pass arbitrary columns
 * to the database.
 */
export const ListUsersQuery = Type.Composite([
  PaginationQuery,
  Type.Object({
    search: Type.Optional(Type.String({ maxLength: 200, description: 'Matches name or email' })),
    role: Type.Optional(UserRole),
    sortBy: Type.Optional(
      Type.Union([Type.Literal('createdAt'), Type.Literal('name'), Type.Literal('email')], {
        default: 'createdAt',
      })
    ),
    sortOrder: Type.Optional(
      Type.Union([Type.Literal('asc'), Type.Literal('desc')], { default: 'desc' })
    ),
  }),
]);
export type ListUsersQuery = Static<typeof ListUsersQuery>;
