import { Type, type Static } from '@sinclair/typebox';

/**
 * Users contracts — shared between the API and the admin.
 */

export const UserProfile = Type.Object({
  id: Type.String(),
  email: Type.String(),
  name: Type.String(),
  role: Type.String(),
  createdAt: Type.String(),
  updatedAt: Type.String(),
});
export type UserProfile = Static<typeof UserProfile>;

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
