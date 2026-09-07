import type { PermissionDto } from '@app/api-contracts';

export interface PermissionGroup {
  resource: string;
  permissions: PermissionDto[];
}

/**
 * Group permission keys by their `resource` prefix (the part before the first
 * dot in `resource.action`). Used by the permissions page and the role editor
 * to present permissions in a scannable, grouped layout. This convention also
 * lets future logistics permissions (shipment.*, driver.*) slot in unchanged.
 */
export function groupPermissionsByResource(permissions: PermissionDto[]): PermissionGroup[] {
  const map = new Map<string, PermissionDto[]>();
  for (const p of permissions) {
    const resource = p.key.split('.')[0] ?? 'other';
    const list = map.get(resource) ?? [];
    list.push(p);
    map.set(resource, list);
  }
  return [...map.entries()]
    .map(([resource, perms]) => ({
      resource,
      permissions: perms.sort((a, b) => a.key.localeCompare(b.key)),
    }))
    .sort((a, b) => a.resource.localeCompare(b.resource));
}
