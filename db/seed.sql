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
(7, 'ANALYZER', '프로젝트 분석기', '/analyzer', '로컬 프로젝트의 공통 함수·검증·다국어 사용 점검', 22, TRUE),
(3, 'JOBS', '입사지원 찾기', '/jobs', '개발자 채용공고 조회 (샘플/공식 API)', 25, TRUE),
(4, 'NEARBY_FOOD', '회사 주변 맛집', '/nearby-food', '현직장(관리자는 현위치) 주변 맛집 찾기', 28, TRUE),
(5, 'FAQS', 'FAQ', '/faqs', 'FAQ CRUD', 40, TRUE),
(6, 'BOARD', '게시판', '/board', '게시판 CRUD/파일', 30, TRUE);

-- admin: all menus / user: JOBS + NEARBY_FOOD + FAQ + BOARD
INSERT INTO user_programs (user_id, program_id) VALUES
(1, 1), (1, 2), (1, 3), (1, 4), (1, 5), (1, 6), (1, 7),
(2, 3), (2, 4), (2, 5), (2, 6), (2, 7);

INSERT INTO faqs (question, answer, sort_order, is_published) VALUES
('DevHaven(개발자 쉼터)이 무엇인가요?', '개발자를 위한 쉼터입니다. 채용·주변 맛집·FAQ·게시판을 한곳에서 이용할 수 있습니다.', 1, TRUE),
('로그인은 어떻게 하나요?', '관리자는 admin / 1234, 일반 사용자는 user / 1234 입니다. 로그인하면 권한에 맞는 메뉴만 보입니다.', 2, TRUE),
('집 주소는 어디에 쓰이나요?', '마이페이지에서 집 주소를 저장하면 채용 공고의 회사 위치와 집 사이 거리·소요 시간을 볼 수 있습니다.', 3, TRUE),
('회사 주변 맛집은 어디까지 검색되나요?', '기본 반경은 300m입니다. 일반 사용자는 등록한 회사 위치, 관리자는 현재 위치 기준으로 음식점을 찾습니다.', 4, TRUE),
('기술 스택은 어디서 바꾸나요?', '내 정보의 기술 스택을 쉼표로 구분해 저장하면 입사지원 찾기에서 맞는 공고를 우선 보여 줍니다. 예: Python, FastAPI, PostgreSQL', 5, TRUE),
('게시판에 파일을 올릴 수 있나요?', '글 작성 시 파일을 첨부할 수 있고, 상세 화면에서 다운로드할 수 있습니다. 본인과 관리자가 글과 첨부를 수정·삭제할 수 있습니다.', 6, TRUE),
('관리자만 쓰는 메뉴가 있나요?', '사용자관리와 메뉴관리는 관리자 전용입니다. 입사지원 찾기, 회사 주변 맛집, FAQ, 게시판은 일반 사용자도 이용합니다.', 7, TRUE);

INSERT INTO board_posts (title, content, author_id) VALUES
('[공지] 개발자 쉼터 이용 안내', E'개발자 쉼터 DevHaven에 오신 것을 환영합니다.\n\n- 입사지원 찾기: 기술 스택이 맞는 채용 공고\n- 회사 주변 맛집: 직장 기준 300m 음식점\n- FAQ / 게시판: 이용 질문과 자유 글\n\n집 주소를 등록하면 공고마다 집↔회사 거리와 소요 시간이 표시됩니다.', 1),
('집 주소 넣고 출퇴근 시간 확인해 봤어요', E'마이페이지에 집 주소를 저장한 뒤 입사지원 찾기를 열어 보니, 회사 위치까지 거리와 시간이 같이 나옵니다.\n강남·분당 공고를 비교할 때 편해서 다른 분들도 주소부터 넣어 보시면 좋겠습니다.', 2),
('점심은 회사 반경 300m부터', E'회사 주변 맛집은 기본 300m입니다. 너무 넓으면 점심시간에 가기 어려운 곳이 섞여서, 걸어갈 수 있는 거리만 남겼습니다.\n회사 주소가 비어 있으면 먼저 프로필에 직장을 등록해 주세요.', 1),
('FastAPI로 올린 게시글 첨부 메모', E'게시글 작성 화면에서 파일을 같이 올리면 상세에서 바로 받을 수 있습니다.\n로컬에서는 backend/uploads 에 저장되고, 글 삭제 시 첨부도 함께 지워집니다.', 2),
('질문) 기술 스택은 쉼표로 적어도 매칭되나요?', E'Python, FastAPI, PostgreSQL 처럼 쉼표로 적었더니 입사지원 찾기에서 겹치는 공고가 위로 왔습니다.\n띄어쓰기나 영문 표기만 공고와 비슷하게 맞추면 되는 것 같아요.', 2);

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
SELECT setval(pg_get_serial_sequence('board_posts', 'id'), (SELECT COALESCE(MAX(id), 1) FROM board_posts));
SELECT setval(pg_get_serial_sequence('job_postings', 'id'), (SELECT COALESCE(MAX(id), 1) FROM job_postings));

COMMIT;
