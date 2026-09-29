--
-- PostgreSQL database dump
--


-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.user_programs DROP CONSTRAINT IF EXISTS user_programs_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.user_programs DROP CONSTRAINT IF EXISTS user_programs_program_id_fkey;
ALTER TABLE IF EXISTS ONLY public.board_posts DROP CONSTRAINT IF EXISTS board_posts_author_id_fkey;
ALTER TABLE IF EXISTS ONLY public.board_files DROP CONSTRAINT IF EXISTS board_files_post_id_fkey;
DROP INDEX IF EXISTS public.ix_users_username;
DROP INDEX IF EXISTS public.ix_programs_code;
DROP INDEX IF EXISTS public.ix_job_postings_source;
DROP INDEX IF EXISTS public.ix_items_id;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.user_programs DROP CONSTRAINT IF EXISTS user_programs_pkey;
ALTER TABLE IF EXISTS ONLY public.user_programs DROP CONSTRAINT IF EXISTS uq_user_program;
ALTER TABLE IF EXISTS ONLY public.job_postings DROP CONSTRAINT IF EXISTS uq_job_source_external;
ALTER TABLE IF EXISTS ONLY public.programs DROP CONSTRAINT IF EXISTS programs_pkey;
ALTER TABLE IF EXISTS ONLY public.job_postings DROP CONSTRAINT IF EXISTS job_postings_pkey;
ALTER TABLE IF EXISTS ONLY public.items DROP CONSTRAINT IF EXISTS items_pkey;
ALTER TABLE IF EXISTS ONLY public.faqs DROP CONSTRAINT IF EXISTS faqs_pkey;
ALTER TABLE IF EXISTS ONLY public.board_posts DROP CONSTRAINT IF EXISTS board_posts_pkey;
ALTER TABLE IF EXISTS ONLY public.board_files DROP CONSTRAINT IF EXISTS board_files_pkey;
ALTER TABLE IF EXISTS public.users ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.user_programs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.programs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.job_postings ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.items ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.faqs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.board_posts ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.board_files ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.users_id_seq;
DROP TABLE IF EXISTS public.users;
DROP SEQUENCE IF EXISTS public.user_programs_id_seq;
DROP TABLE IF EXISTS public.user_programs;
DROP SEQUENCE IF EXISTS public.programs_id_seq;
DROP TABLE IF EXISTS public.programs;
DROP SEQUENCE IF EXISTS public.job_postings_id_seq;
DROP TABLE IF EXISTS public.job_postings;
DROP SEQUENCE IF EXISTS public.items_id_seq;
DROP TABLE IF EXISTS public.items;
DROP SEQUENCE IF EXISTS public.faqs_id_seq;
DROP TABLE IF EXISTS public.faqs;
DROP SEQUENCE IF EXISTS public.board_posts_id_seq;
DROP TABLE IF EXISTS public.board_posts;
DROP SEQUENCE IF EXISTS public.board_files_id_seq;
DROP TABLE IF EXISTS public.board_files;
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: board_files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.board_files (
    id integer NOT NULL,
    post_id integer NOT NULL,
    original_name character varying(255) NOT NULL,
    stored_name character varying(255) NOT NULL,
    content_type character varying(120),
    size integer NOT NULL
);


--
-- Name: board_files_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.board_files_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: board_files_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.board_files_id_seq OWNED BY public.board_files.id;


--
-- Name: board_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.board_posts (
    id integer NOT NULL,
    title character varying(200) NOT NULL,
    content text NOT NULL,
    author_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: board_posts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.board_posts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: board_posts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.board_posts_id_seq OWNED BY public.board_posts.id;


--
-- Name: faqs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.faqs (
    id integer NOT NULL,
    question character varying(300) NOT NULL,
    answer text NOT NULL,
    sort_order integer NOT NULL,
    is_published boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: faqs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.faqs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: faqs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.faqs_id_seq OWNED BY public.faqs.id;


--
-- Name: items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.items (
    id integer NOT NULL,
    title character varying(200) NOT NULL,
    description text,
    status character varying(50) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.items_id_seq OWNED BY public.items.id;


--
-- Name: job_postings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_postings (
    id integer NOT NULL,
    source character varying(30) NOT NULL,
    external_id character varying(100) NOT NULL,
    title character varying(300) NOT NULL,
    company character varying(200) NOT NULL,
    location character varying(200),
    experience character varying(100),
    employment_type character varying(100),
    skills character varying(500),
    summary text,
    description text,
    url character varying(500),
    posted_at timestamp with time zone,
    collected_at timestamp with time zone DEFAULT now() NOT NULL,
    is_active boolean NOT NULL
);


--
-- Name: job_postings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.job_postings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: job_postings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.job_postings_id_seq OWNED BY public.job_postings.id;


--
-- Name: programs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.programs (
    id integer NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    path character varying(200) NOT NULL,
    description text,
    sort_order integer NOT NULL,
    is_active boolean NOT NULL
);


--
-- Name: programs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.programs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: programs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.programs_id_seq OWNED BY public.programs.id;


--
-- Name: user_programs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_programs (
    id integer NOT NULL,
    user_id integer NOT NULL,
    program_id integer NOT NULL
);


--
-- Name: user_programs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_programs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_programs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_programs_id_seq OWNED BY public.user_programs.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    password_hash character varying(255) NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(200),
    is_active boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    role character varying(20) DEFAULT 'user'::character varying NOT NULL,
    career_years integer,
    skills character varying(500),
    gender character varying(10),
    company character varying(200)
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: board_files id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.board_files ALTER COLUMN id SET DEFAULT nextval('public.board_files_id_seq'::regclass);


--
-- Name: board_posts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.board_posts ALTER COLUMN id SET DEFAULT nextval('public.board_posts_id_seq'::regclass);


--
-- Name: faqs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faqs ALTER COLUMN id SET DEFAULT nextval('public.faqs_id_seq'::regclass);


--
-- Name: items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.items ALTER COLUMN id SET DEFAULT nextval('public.items_id_seq'::regclass);


--
-- Name: job_postings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_postings ALTER COLUMN id SET DEFAULT nextval('public.job_postings_id_seq'::regclass);


--
-- Name: programs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.programs ALTER COLUMN id SET DEFAULT nextval('public.programs_id_seq'::regclass);


--
-- Name: user_programs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_programs ALTER COLUMN id SET DEFAULT nextval('public.user_programs_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: board_files; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.board_files (id, post_id, original_name, stored_name, content_type, size) FROM stdin;
1	1	pmd-eclipse.log	450ac130adec4453b28e4187737b46ec_pmd-eclipse.log	application/octet-stream	0
\.


--
-- Data for Name: board_posts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.board_posts (id, title, content, author_id, created_at, updated_at) FROM stdin;
1	테스트 제목	테스트 내용	1	2026-09-29 13:05:27.703859+09	2026-09-29 13:05:27.703859+09
\.


--
-- Data for Name: faqs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.faqs (id, question, answer, sort_order, is_published, created_at, updated_at) FROM stdin;
1	VibeCoding이 무엇인가요?	Python + React + PostgreSQL + Tomcat 기반 풀스택 실습 프로젝트입니다.	1	t	2026-09-29 11:16:00.547879+09	2026-09-29 11:16:00.547879+09
2	테스트 질문	테스트 답변 입니다.	1	t	2026-09-29 13:08:01.830815+09	2026-09-29 13:08:16.011847+09
\.


--
-- Data for Name: items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.items (id, title, description, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: job_postings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.job_postings (id, source, external_id, title, company, location, experience, employment_type, skills, summary, description, url, posted_at, collected_at, is_active) FROM stdin;
4	sample	jobkorea-demo-2002	주니어 웹 개발자 (신입/전환)	스타트업랩	서울 영등포구	신입 ~ 경력 1년	정규직	HTML, CSS, JavaScript, Node.js	웹 기초가 탄탄한 주니어 개발자 채용. 멘토링과 페어 프로그래밍 제공.	서비스 화면/간단한 API를 함께 만들며 성장합니다.\n- HTML/CSS/JS 기본\n- Git 협업\n- 포트폴리오 또는 사이드 프로젝트 우대	https://www.jobkorea.co.kr/	2026-09-28 20:34:05.352694+09	2026-09-29 14:34:05.352775+09	t
5	sample	saramin-demo-1003	DevOps / 인프라 엔지니어	클라우드브릿지	서울 서초구 · 재택 가능	경력 3~8년	정규직	AWS, Kubernetes, CI/CD, Terraform	AWS/K8s 기반 배포 파이프라인 구축·운영. 관측성(Observability) 경험 우대.	클라우드 인프라와 CI/CD를 책임집니다.\n- AWS / Kubernetes\n- GitHub Actions 또는 Jenkins\n- 모니터링·로그 파이프라인	https://www.saramin.co.kr/	2026-09-25 14:34:05.352694+09	2026-09-29 14:34:05.352775+09	t
6	sample	jobkorea-demo-2003	모바일 앱 개발자 (Flutter)	앱스퀘어	부산 해운대구	경력 2~5년	계약직 → 정규직 전환	Flutter, Dart, Firebase, REST API	Flutter 크로스플랫폼 앱 개발. 스토어 배포 경험자 우대.	Flutter로 iOS/Android 앱을 개발·배포합니다.\n- 상태관리 (Riverpod/Bloc 등)\n- REST / Firebase 연동\n- 앱스토어 배포 경험	https://www.jobkorea.co.kr/	2026-09-24 14:34:05.352694+09	2026-09-29 14:34:05.352775+09	t
1	sample	saramin-demo-1001	백엔드 개발자 (Python / FastAPI)	바이브테크	서울 강남구	경력 2~5년	정규직	Python, FastAPI, PostgreSQL, Docker	Python 기반 API 서버 개발. REST API 설계·성능 개선 경험 우대.	Python/FastAPI로 서비스 API를 설계·구현합니다.\n- REST API / JWT 인증\n- PostgreSQL 스키마 설계\n- Docker 기반 배포 경험 우대	https://www.saramin.co.kr/	2026-09-28 14:34:05.352694+09	2026-09-29 14:34:05.352775+09	t
2	sample	saramin-demo-1002	프론트엔드 개발자 (React)	코드웨이브	서울 마포구 · 하이브리드	경력 1~4년	정규직	React, TypeScript, Bootstrap, Vite	React SPA 개발. 컴포넌트 설계·상태관리·반응형 UI 경험자 환영.	React 기반 관리자/사용자 화면을 개발합니다.\n- SPA 라우팅, 폼/테이블 UX\n- REST API 연동\n- Bootstrap 또는 자체 디자인 시스템	https://www.saramin.co.kr/	2026-09-27 14:34:05.352694+09	2026-09-29 14:34:05.352775+09	t
3	sample	jobkorea-demo-2001	풀스택 개발자 (Java / Spring + React)	넥스트잡	경기 성남시 분당구	경력 3~7년	정규직	Java, Spring Boot, React, MySQL	Spring Boot + React 풀스택. 사내 채용·HR 솔루션 고도화.	채용 플랫폼 백오피스/포털을 풀스택으로 개발합니다.\n- Spring Boot REST API\n- React 관리 화면\n- 배치/알림 연동 경험 우대	https://www.jobkorea.co.kr/	2026-09-26 14:34:05.352694+09	2026-09-29 14:34:05.352775+09	t
\.


--
-- Data for Name: programs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.programs (id, code, name, path, description, sort_order, is_active) FROM stdin;
1	USERS	사용자관리	/users	사용자 CRUD	10	t
2	USER_PROGRAMS	메뉴관리	/user-programs	사용자별 메뉴 권한	20	t
3	FAQS	FAQ	/faqs	FAQ CRUD	30	t
4	BOARD	게시판	/board	게시판 CRUD/파일	40	t
5	JOBS	입사지원 찾기	/jobs	개발자 채용공고 조회 (샘플/공식 API)	25	t
\.


--
-- Data for Name: user_programs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_programs (id, user_id, program_id) FROM stdin;
5	2	3
6	2	4
15	2	5
20	1	1
21	1	2
22	1	3
23	1	4
24	1	5
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, username, password_hash, name, email, is_active, created_at, role, career_years, skills, gender, company) FROM stdin;
1	admin	$2b$12$MOem99uBzHMKBaiBeejlgOr160ngQ7ZLw.JKWTP3twQKkcQ8M/XqO	관리자	admin@vibecoding.local	t	2026-09-29 11:16:00.547879+09	admin	\N	\N	\N	\N
3	user01	$2b$12$jkLIELVMn2XR4IHIPrhE4uTVb4rFr5pb2eUheB8EFuVcB0DWU9VWy	user01	user01@naver.com	t	2026-09-29 14:50:11.725177+09	user	5	Python, Java	male	인터페이스 정보 기술
2	user	$2b$12$MOem99uBzHMKBaiBeejlgOr160ngQ7ZLw.JKWTP3twQKkcQ8M/XqO	일반사용자	user@vibecoding.local	t	2026-09-29 11:16:00.547879+09	user	3	Flutter	male	비즈테크아이
\.


--
-- Name: board_files_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.board_files_id_seq', 1, true);


--
-- Name: board_posts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.board_posts_id_seq', 1, true);


--
-- Name: faqs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.faqs_id_seq', 2, true);


--
-- Name: items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.items_id_seq', 1, true);


--
-- Name: job_postings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.job_postings_id_seq', 6, true);


--
-- Name: programs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.programs_id_seq', 5, true);


--
-- Name: user_programs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_programs_id_seq', 24, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 3, true);


--
-- Name: board_files board_files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.board_files
    ADD CONSTRAINT board_files_pkey PRIMARY KEY (id);


--
-- Name: board_posts board_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.board_posts
    ADD CONSTRAINT board_posts_pkey PRIMARY KEY (id);


--
-- Name: faqs faqs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faqs
    ADD CONSTRAINT faqs_pkey PRIMARY KEY (id);


--
-- Name: items items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_pkey PRIMARY KEY (id);


--
-- Name: job_postings job_postings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_postings
    ADD CONSTRAINT job_postings_pkey PRIMARY KEY (id);


--
-- Name: programs programs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.programs
    ADD CONSTRAINT programs_pkey PRIMARY KEY (id);


--
-- Name: job_postings uq_job_source_external; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_postings
    ADD CONSTRAINT uq_job_source_external UNIQUE (source, external_id);


--
-- Name: user_programs uq_user_program; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_programs
    ADD CONSTRAINT uq_user_program UNIQUE (user_id, program_id);


--
-- Name: user_programs user_programs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_programs
    ADD CONSTRAINT user_programs_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: ix_items_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_items_id ON public.items USING btree (id);


--
-- Name: ix_job_postings_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_job_postings_source ON public.job_postings USING btree (source);


--
-- Name: ix_programs_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_programs_code ON public.programs USING btree (code);


--
-- Name: ix_users_username; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_users_username ON public.users USING btree (username);


--
-- Name: board_files board_files_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.board_files
    ADD CONSTRAINT board_files_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.board_posts(id) ON DELETE CASCADE;


--
-- Name: board_posts board_posts_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.board_posts
    ADD CONSTRAINT board_posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id);


--
-- Name: user_programs user_programs_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_programs
    ADD CONSTRAINT user_programs_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE CASCADE;


--
-- Name: user_programs user_programs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_programs
    ADD CONSTRAINT user_programs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--


