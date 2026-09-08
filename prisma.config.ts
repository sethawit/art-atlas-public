import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Prisma 7 moved the datasource connection URL out of schema.prisma (Migrate/Studio
// read it from here). Runtime PrismaClient still needs its own adapter — see
// src/lib/prisma.ts — this file only feeds the CLI (migrate, generate, studio).
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
