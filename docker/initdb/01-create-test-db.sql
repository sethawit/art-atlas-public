-- Auto-creates the second database (art_atlas_test) on first container startup.
-- Postgres's official image runs every *.sql file in /docker-entrypoint-initdb.d/ once,
-- only when the data directory is empty — docker-compose.yml's POSTGRES_DB only creates
-- the first database (art_atlas_dev), which previously left art_atlas_test as a manual
-- setup step (README's Known limitations, closed here).
CREATE DATABASE art_atlas_test OWNER art_atlas;
