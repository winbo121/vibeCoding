-- Alias for database creation. Prefer: 00_create_database.sql
SELECT 'CREATE DATABASE vibecoding WITH ENCODING ''UTF8'' TEMPLATE template0'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'vibecoding')\gexec
