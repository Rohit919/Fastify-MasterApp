/**
 * Central permission matrix: resource → action → roles allowed.
 * The single source of truth for RBAC. Ownership (can a `user` touch THIS
 * specific row?) is enforced separately by requireOwnership.
 */
export const PERMISSIONS = {
  todo: {
    create: ['user', 'admin'],
    read: ['user', 'admin'], // + ownership check for 'user'
    update: ['user', 'admin'], // + ownership check for 'user'
    delete: ['user', 'admin'], // + ownership check for 'user'
    readAll: ['admin'], // list across all users
  },
  user: {
    read: ['user', 'admin'], // self for 'user'; anyone for 'admin'
    update: ['user', 'admin'], // + ownership check for 'user'
    delete: ['admin'],
    list: ['admin'],
  },
} as const;

export type Resource = keyof typeof PERMISSIONS;
export type Action<R extends Resource> = keyof (typeof PERMISSIONS)[R];

export function rolesFor<R extends Resource>(
  resource: R,
  action: Action<R>
): readonly string[] {
  return PERMISSIONS[resource][action] as readonly string[];
}
