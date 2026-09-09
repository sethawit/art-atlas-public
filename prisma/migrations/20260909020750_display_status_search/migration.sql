-- AlterTable
ALTER TABLE "PhysicalObject" ADD COLUMN     "displayStatus" TEXT NOT NULL DEFAULT 'unconfirmed';


-- Basic spelling tolerance for search (ticket 07): trigram similarity as a fallback when
-- an exact/substring match finds nothing. Managed as raw SQL rather than via Prisma's
-- postgresqlExtensions preview feature, to avoid taking on a preview feature this late.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS "Artwork_title_trgm_idx" ON "Artwork" USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Artist_name_trgm_idx" ON "Artist" USING GIN (name gin_trgm_ops);
