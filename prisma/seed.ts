/**
 * Database seed — idempotent.
 *
 * Bootstraps RBAC (permission catalog + system roles) and an initial
 * administrator account so a fresh deployment has a way in.
 *
 * Safe to run multiple times:
 *  - permissions/roles are upserted by their stable key/name;
 *  - role→permission links are reconciled (missing ones added);
 *  - the admin is upserted by email and never downgraded.
 *
 * SECURITY:
 *  - Credentials come from environment variables, never hard-coded.
 *  - The seed refuses to run in production unless SEED_ALLOW_PRODUCTION=true.
 *  - The admin password must be provided; there is no default password.
 *
 * Usage:
 *   SEED_ADMIN_EMAIL=admin@example.com \
 *   SEED_ADMIN_PASSWORD='a-strong-password' \
 *   SEED_ADMIN_NAME='Platform Admin' \
 *   npm run db:seed
 */
import { PrismaClient } from "../apps/api/src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import {
  ALL_PERMISSION_KEYS,
  PermissionKeys,
  SystemRoles,
  type PermissionKey,
  type SystemRoleName,
} from "../packages/api-contracts/src/index.js";

const connectionString =
  process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString)
  throw new Error("DATABASE_DIRECT_URL or DATABASE_URL is required");
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const SALT_ROUNDS = 10;

// Human-readable description for each permission (documentation for admins).
const PERMISSION_DESCRIPTIONS: Record<PermissionKey, string> = {
  "dashboard.read": "View the dashboard",
  "users.read": "View users",
  "users.create": "Create users",
  "users.update": "Update users",
  "users.delete": "Delete users",
  "users.roles.read": "View a user's role assignments",
  "users.roles.update": "Change a user's role assignments",
  "roles.read": "View roles",
  "roles.create": "Create roles",
  "roles.update": "Update roles and their permissions",
  "roles.delete": "Delete roles",
  "permissions.read": "View the permission registry",
  "todos.read": "View todos",
  "todos.create": "Create todos",
  "todos.update": "Update todos",
  "todos.delete": "Delete todos",
  "todos.read_all": "View all users' todos",
  "orders.read": "View owned orders",
  "orders.read_all": "View orders belonging to all users",
  "orders.create": "Create orders",
  "orders.update": "Update orders",
  "orders.cancel": "Cancel orders",
  "orders.delete": "Delete orders",
  "audit.read": "View audit logs",
  "metrics.read": "View operational metrics and diagnostics",
  "settings.read": "View settings",
  "settings.update": "Update settings",
};

// ── System role definitions ──────────────────────────────────────────────────
// SUPER_ADMIN implicitly holds every permission (assigned the full catalog).
const ROLE_DEFINITIONS: Record<
  SystemRoleName,
  { description: string; permissions: PermissionKey[] }
> = {
  [SystemRoles.SuperAdmin]: {
    description: "Full platform access. Break-glass role — assign sparingly.",
    permissions: [...ALL_PERMISSION_KEYS],
  },
  [SystemRoles.Admin]: {
    description: "General application administration.",
    permissions: [
      PermissionKeys.DashboardRead,
      PermissionKeys.UsersRead,
      PermissionKeys.UsersCreate,
      PermissionKeys.UsersUpdate,
      PermissionKeys.UsersDelete,
      PermissionKeys.UsersRolesRead,
      PermissionKeys.UsersRolesUpdate,
      PermissionKeys.RolesRead,
      PermissionKeys.PermissionsRead,
      PermissionKeys.TodosRead,
      PermissionKeys.TodosReadAll,
      PermissionKeys.OrdersRead,
      PermissionKeys.OrdersReadAll,
      PermissionKeys.OrdersCreate,
      PermissionKeys.OrdersUpdate,
      PermissionKeys.OrdersCancel,
      PermissionKeys.AuditRead,
      PermissionKeys.MetricsRead,
      PermissionKeys.SettingsRead,
    ],
  },
  [SystemRoles.Manager]: {
    description: "Operational access without security administration.",
    permissions: [
      PermissionKeys.DashboardRead,
      PermissionKeys.UsersRead,
      PermissionKeys.OrdersRead,
      PermissionKeys.OrdersUpdate,
      PermissionKeys.OrdersCancel,
      PermissionKeys.TodosRead,
    ],
  },
  [SystemRoles.Support]: {
    description: "Read-heavy support access.",
    permissions: [
      PermissionKeys.DashboardRead,
      PermissionKeys.UsersRead,
      PermissionKeys.OrdersRead,
      PermissionKeys.OrdersUpdate,
    ],
  },
  [SystemRoles.Viewer]: {
    description: "Read-only administrative access.",
    permissions: [
      PermissionKeys.DashboardRead,
      PermissionKeys.UsersRead,
      PermissionKeys.OrdersRead,
    ],
  },
  [SystemRoles.User]: {
    description: "Default end-user access to owned resources.",
    permissions: [
      PermissionKeys.TodosRead,
      PermissionKeys.TodosCreate,
      PermissionKeys.TodosUpdate,
      PermissionKeys.TodosDelete,
      PermissionKeys.OrdersRead,
      PermissionKeys.OrdersCreate,
      PermissionKeys.OrdersCancel,
    ],
  },
};

async function seedPermissions(): Promise<Map<string, string>> {
  const idByKey = new Map<string, string>();
  for (const key of ALL_PERMISSION_KEYS) {
    const perm = await prisma.permission.upsert({
      where: { key },
      update: { description: PERMISSION_DESCRIPTIONS[key] },
      create: { key, description: PERMISSION_DESCRIPTIONS[key] },
    });
    idByKey.set(key, perm.id);
  }
  console.log(`✓ Permissions synced: ${idByKey.size}`);
  return idByKey;
}

async function seedRoles(permIdByKey: Map<string, string>): Promise<void> {
  for (const [name, def] of Object.entries(ROLE_DEFINITIONS) as [
    SystemRoleName,
    (typeof ROLE_DEFINITIONS)[SystemRoleName],
  ][]) {
    const role = await prisma.role.upsert({
      where: { name },
      update: { description: def.description, isSystem: true },
      create: { name, description: def.description, isSystem: true },
    });

    // Reconcile role→permission links: add any that are missing. We don't strip
    // extras here so an operator can grant additional permissions to a system
    // role without the seed clobbering them.
    const existing = await prisma.rolePermission.findMany({
      where: { roleId: role.id },
      select: { permissionId: true },
    });
    const existingIds = new Set(existing.map((e) => e.permissionId));

    const toCreate = def.permissions
      .map((key) => permIdByKey.get(key))
      .filter((id): id is string => Boolean(id) && !existingIds.has(id));

    if (toCreate.length > 0) {
      await prisma.rolePermission.createMany({
        data: toCreate.map((permissionId) => ({
          roleId: role.id,
          permissionId,
        })),
        skipDuplicates: true,
      });
    }
    console.log(`✓ Role synced: ${name} (+${toCreate.length} permissions)`);
  }
}

async function seedAdmin(): Promise<void> {
  const isProd = process.env.NODE_ENV === "production";
  if (isProd && process.env.SEED_ALLOW_PRODUCTION !== "true") {
    throw new Error(
      "Refusing to seed in production. Set SEED_ALLOW_PRODUCTION=true to override.",
    );
  }

  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@example.local")
    .trim()
    .toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME ?? "Platform Admin";

  if (!password) {
    throw new Error(
      "SEED_ADMIN_PASSWORD is required. Provide a strong password via environment variable.",
    );
  }
  if (password.length < 12) {
    throw new Error("SEED_ADMIN_PASSWORD must be at least 12 characters.");
  }

  let admin = await prisma.user.findUnique({ where: { email } });

  if (!admin) {
    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    admin = await prisma.user.create({
      data: {
        email,
        password: hashed,
        name,
        role: "admin",
        // Seeded admin is trusted — mark verified so it can log in immediately.
        emailVerifiedAt: new Date(),
      },
    });
    console.log(`✓ Created initial admin: ${admin.email}`);
  } else {
    console.log(`✓ Admin already exists: ${email} (credentials unchanged)`);
  }

  // Ensure the admin holds the SUPER_ADMIN role (idempotent).
  const superAdminRole = await prisma.role.findUnique({
    where: { name: SystemRoles.SuperAdmin },
  });
  if (superAdminRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: admin.id, roleId: superAdminRole.id } },
      update: {},
      create: {
        userId: admin.id,
        roleId: superAdminRole.id,
        assignedBy: "seed",
      },
    });
    console.log(`✓ Ensured ${email} has role ${SystemRoles.SuperAdmin}`);
  }
}

async function seedProducts(): Promise<void> {
  const products = [
    { sku: "STARTER-001", name: "Starter Plan", priceCents: 1_900 },
    { sku: "PRO-001", name: "Pro Plan", priceCents: 4_900 },
  ];
  for (const product of products) {
    await prisma.product.upsert({
      where: { sku: product.sku },
      update: {
        name: product.name,
        priceCents: product.priceCents,
        active: true,
      },
      create: product,
    });
  }
  console.log(`✓ Products synced: ${products.length}`);
}

async function main(): Promise<void> {
  const permIdByKey = await seedPermissions();
  await seedRoles(permIdByKey);
  await seedAdmin();
  await seedProducts();
  console.log("✓ Seed complete");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
