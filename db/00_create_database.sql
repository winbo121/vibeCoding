-- Create database (run as postgres superuser against maintenance DB 'postgres')
-- Example:
--   psql -U postgres -h localhost -d postgres -f db/00_create_database.sql

SELECT 'CREATE DATABASE vibecoding WITH ENCODING ''UTF8'' TEMPLATE template0'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'vibecoding')\gexec
