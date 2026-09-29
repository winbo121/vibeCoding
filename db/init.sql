-- VibeCoding database bootstrap
SELECT 'CREATE DATABASE vibecoding'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'vibecoding')\gexec
