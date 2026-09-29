-- DevHaven (개발자 쉼터) seed data
-- Default accounts (password for both = 1234):
--   admin / 1234  (role=admin)
--   user  / 1234  (role=user)
-- Encoding: UTF8
-- Run after schema.sql

BEGIN;

-- Clear existing demo rows (safe re-run for fresh installs)
TRUNCATE TABLE board_files, board_posts, job_postings, user_programs, faqs, programs, users RESTART IDENTITY CASCADE;

-- bcrypt hash for password "1234"
-- $2b$12$MOem99uBzHMKBaiBeejlgOr160ngQ7ZLw.JKWTP3twQKkcQ8M/XqO
INSERT INTO users (id, username, password_hash, name, email, role, is_active) VALUES
(1, 'admin', '$2b$12$MOem99uBzHMKBaiBeejlgOr160ngQ7ZLw.JKWTP3twQKkcQ8M/XqO', '관리자', 'admin@devhaven.local', 'admin', TRUE),
(2, 'user',  '$2b$12$MOem99uBzHMKBaiBeejlgOr160ngQ7ZLw.JKWTP3twQKkcQ8M/XqO', '일반사용자', 'user@devhaven.local', 'user', TRUE);

INSERT INTO programs (id, code, name, path, description, sort_order, is_active) VALUES
(1, 'USERS', '사용자관리', '/users', '사용자 CRUD', 10, TRUE),
(2, 'USER_PROGRAMS', '메뉴관리', '/user-programs', '사용자별 메뉴 권한', 20, TRUE),
(3, 'JOBS', '입사지원 찾기', '/jobs', '개발자 채용공고 조회 (샘플/공식 API)', 25, TRUE),
(4, 'NEARBY_FOOD', '회사 주변 맛집', '/nearby-food', '현직장(관리자는 현위치) 주변 맛집 찾기', 28, TRUE),
(5, 'FAQS', 'FAQ', '/faqs', 'FAQ CRUD', 30, TRUE),
(6, 'BOARD', '게시판', '/board', '게시판 CRUD/파일', 40, TRUE);

-- admin: all menus / user: JOBS + NEARBY_FOOD + FAQ + BOARD
INSERT INTO user_programs (user_id, program_id) VALUES
(1, 1), (1, 2), (1, 3), (1, 4), (1, 5), (1, 6),
(2, 3), (2, 4), (2, 5), (2, 6);

INSERT INTO faqs (question, answer, sort_order, is_published) VALUES
('DevHaven(개발자 쉼터)이 무엇인가요?', '개발자를 위한 쉼터입니다. 채용·주변 맛집·FAQ·게시판을 한곳에서 이용할 수 있습니다.', 1, TRUE);

INSERT INTO job_postings (
  source, external_id, title, company, location, experience, employment_type,
  skills, summary, description, url, posted_at, is_active
) VALUES
(
  'sample', 'saramin-demo-1001',
  '백엔드 개발자 (Python / FastAPI)', 'DevHaven Labs', '서울 강남구', '경력 2~5년', '정규직',
  'Python, FastAPI, PostgreSQL, Docker',
  'Python 기반 API 서버 개발. REST API 설계·성능 개선 경험 우대.',
  'Python/FastAPI로 서비스 API를 설계·구현합니다.',
  'https://www.saramin.co.kr/', NOW() - INTERVAL '1 day', TRUE
),
(
  'sample', 'jobkorea-demo-2001',
  '풀스택 개발자 (Java / Spring + React)', '넥스트잡', '경기 성남시 분당구', '경력 3~7년', '정규직',
  'Java, Spring Boot, React, MySQL',
  'Spring Boot + React 풀스택. 사내 채용·HR 솔루션 고도화.',
  '채용 플랫폼 백오피스/포털을 풀스택으로 개발합니다.',
  'https://www.jobkorea.co.kr/', NOW() - INTERVAL '3 days', TRUE
);

SELECT setval(pg_get_serial_sequence('users', 'id'), (SELECT MAX(id) FROM users));
SELECT setval(pg_get_serial_sequence('programs', 'id'), (SELECT MAX(id) FROM programs));
SELECT setval(pg_get_serial_sequence('user_programs', 'id'), (SELECT COALESCE(MAX(id), 1) FROM user_programs));
SELECT setval(pg_get_serial_sequence('faqs', 'id'), (SELECT COALESCE(MAX(id), 1) FROM faqs));
SELECT setval(pg_get_serial_sequence('job_postings', 'id'), (SELECT COALESCE(MAX(id), 1) FROM job_postings));

COMMIT;
