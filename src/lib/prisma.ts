import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// Single shared client, built with the Postgres driver adapter Prisma 7 requires at
// runtime (prisma.config.ts only feeds the CLI — migrate/generate/studio — not this).
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma = new PrismaClient({ adapter });
