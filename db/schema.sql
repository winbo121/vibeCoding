-- DevHaven (개발자 쉼터) schema (PostgreSQL 14+)
-- Encoding: UTF8
-- Apply inside database: vibecoding

BEGIN;

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL DEFAULT '',
    email VARCHAR(200),
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    career_years INTEGER,
    skills VARCHAR(500),
    gender VARCHAR(10),
    company VARCHAR(200),
    home_address VARCHAR(300),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_users_username ON users (username);

CREATE TABLE IF NOT EXISTS programs (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    path VARCHAR(200) NOT NULL DEFAULT '/',
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS ix_programs_code ON programs (code);

CREATE TABLE IF NOT EXISTS user_programs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    program_id INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    CONSTRAINT uq_user_program UNIQUE (user_id, program_id)
);

CREATE TABLE IF NOT EXISTS faqs (
    id SERIAL PRIMARY KEY,
    question VARCHAR(300) NOT NULL,
    answer TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS board_posts (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    author_id INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS board_files (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES board_posts(id) ON DELETE CASCADE,
    original_name VARCHAR(255) NOT NULL,
    stored_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(120),
    size INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS job_postings (
    id SERIAL PRIMARY KEY,
    source VARCHAR(30) NOT NULL,
    external_id VARCHAR(100) NOT NULL,
    title VARCHAR(300) NOT NULL,
    company VARCHAR(200) NOT NULL,
    location VARCHAR(200),
    experience VARCHAR(100),
    employment_type VARCHAR(100),
    skills VARCHAR(500),
    summary TEXT,
    description TEXT,
    url VARCHAR(500),
    posted_at TIMESTAMPTZ,
    collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_job_source_external UNIQUE (source, external_id)
);
CREATE INDEX IF NOT EXISTS ix_job_postings_source ON job_postings (source);

CREATE TABLE IF NOT EXISTS food_picks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    place_id VARCHAR(40) NOT NULL,
    name VARCHAR(200) NOT NULL,
    address VARCHAR(300),
    category VARCHAR(200),
    url VARCHAR(500),
    phone VARCHAR(40),
    x DOUBLE PRECISION,
    y DOUBLE PRECISION,
    company VARCHAR(200),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_food_pick_user_place UNIQUE (user_id, place_id)
);
CREATE INDEX IF NOT EXISTS ix_food_picks_user_id ON food_picks (user_id);
CREATE INDEX IF NOT EXISTS ix_food_picks_place_id ON food_picks (place_id);
CREATE INDEX IF NOT EXISTS ix_food_picks_company ON food_picks (company);

COMMIT;
