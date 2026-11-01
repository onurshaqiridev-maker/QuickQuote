-- Runs once, the first time the PostgreSQL container starts.
-- The main database (quickquote) is created by POSTGRES_DB in docker-compose.yml.
-- This extra database is used by the automated tests, so tests never touch your dev data.
CREATE DATABASE quickquote_test OWNER quickquote;
