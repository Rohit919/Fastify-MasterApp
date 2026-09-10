import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // CLI operations need a direct session; local development commonly uses
    // the same URL for both application traffic and migrations.
    url: process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
