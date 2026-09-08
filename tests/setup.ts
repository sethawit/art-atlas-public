import { config } from "dotenv";

// Runs before any test file's imports, so src/lib/prisma.ts (loaded transitively by test
// files) picks up the test database, never the dev one. .env.test is git-ignored, same as
// .env — see .env.test.example.
config({ path: ".env.test", override: true });
