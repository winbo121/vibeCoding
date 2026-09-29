-- VibeCoding seed data
-- Default accounts (password for both = 1234):
--   admin / 1234  (role=admin)
--   user  / 1234  (role=user)
-- Encoding: UTF8
-- Run after schema.sql

BEGIN;

-- Clear existing demo rows (safe re-run for fresh installs)
TRUNCATE TABLE board_files, board_posts, user_programs, faqs, programs, users RESTART IDENTITY CASCADE;

-- bcrypt hash for password "1234"
-- $2b$12$MOem99uBzHMKBaiBeejlgOr160ngQ7ZLw.JKWTP3twQKkcQ8M/XqO
INSERT INTO users (id, username, password_hash, name, email, role, is_active) VALUES
(1, 'admin', '$2b$12$MOem99uBzHMKBaiBeejlgOr160ngQ7ZLw.JKWTP3twQKkcQ8M/XqO', '관리자', 'admin@vibecoding.local', 'admin', TRUE),
(2, 'user',  '$2b$12$MOem99uBzHMKBaiBeejlgOr160ngQ7ZLw.JKWTP3twQKkcQ8M/XqO', '일반사용자', 'user@vibecoding.local', 'user', TRUE);

INSERT INTO programs (id, code, name, path, description, sort_order, is_active) VALUES
(1, 'USERS', '사용자관리', '/users', '사용자 CRUD', 10, TRUE),
(2, 'USER_PROGRAMS', '메뉴관리', '/user-programs', '사용자별 메뉴 권한', 20, TRUE),
(3, 'FAQS', 'FAQ', '/faqs', 'FAQ CRUD', 30, TRUE),
(4, 'BOARD', '게시판', '/board', '게시판 CRUD/파일', 40, TRUE);

-- admin: all menus / user: FAQ + BOARD only
INSERT INTO user_programs (user_id, program_id) VALUES
(1, 1), (1, 2), (1, 3), (1, 4),
(2, 3), (2, 4);

INSERT INTO faqs (question, answer, sort_order, is_published) VALUES
('VibeCoding이 무엇인가요?', 'Python + React + PostgreSQL + Tomcat 기반 풀스택 실습 프로젝트입니다.', 1, TRUE);

SELECT setval(pg_get_serial_sequence('users', 'id'), (SELECT MAX(id) FROM users));
SELECT setval(pg_get_serial_sequence('programs', 'id'), (SELECT MAX(id) FROM programs));
SELECT setval(pg_get_serial_sequence('user_programs', 'id'), (SELECT COALESCE(MAX(id), 1) FROM user_programs));
SELECT setval(pg_get_serial_sequence('faqs', 'id'), (SELECT COALESCE(MAX(id), 1) FROM faqs));

COMMIT;
