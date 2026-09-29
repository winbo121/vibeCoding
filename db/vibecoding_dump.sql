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
DROP INDEX IF EXISTS public.ix_items_id;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.user_programs DROP CONSTRAINT IF EXISTS user_programs_pkey;
ALTER TABLE IF EXISTS ONLY public.user_programs DROP CONSTRAINT IF EXISTS uq_user_program;
ALTER TABLE IF EXISTS ONLY public.programs DROP CONSTRAINT IF EXISTS programs_pkey;
ALTER TABLE IF EXISTS ONLY public.items DROP CONSTRAINT IF EXISTS items_pkey;
ALTER TABLE IF EXISTS ONLY public.faqs DROP CONSTRAINT IF EXISTS faqs_pkey;
ALTER TABLE IF EXISTS ONLY public.board_posts DROP CONSTRAINT IF EXISTS board_posts_pkey;
ALTER TABLE IF EXISTS ONLY public.board_files DROP CONSTRAINT IF EXISTS board_files_pkey;
ALTER TABLE IF EXISTS public.users ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.user_programs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.programs ALTER COLUMN id DROP DEFAULT;
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
    role character varying(20) DEFAULT 'user'::character varying NOT NULL
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
1	1	sample.txt	203eee866b564e9bbe83fefdefd11541_sample.txt	text/plain	21
\.


--
-- Data for Name: board_posts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.board_posts (id, title, content, author_id, created_at, updated_at) FROM stdin;
1	파일테스트	첨부 확인	1	2026-09-29 10:49:45.690514+09	2026-09-29 10:49:45.690514+09
\.


--
-- Data for Name: faqs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.faqs (id, question, answer, sort_order, is_published, created_at, updated_at) FROM stdin;
2	VibeCoding이 무엇인가요?	Python + React + PostgreSQL + Tomcat 기반 풀스택 실습 프로젝트입니다.	1	t	2026-09-29 10:52:55.172258+09	2026-09-29 10:52:55.172258+09
\.


--
-- Data for Name: items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.items (id, title, description, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: programs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.programs (id, code, name, path, description, sort_order, is_active) FROM stdin;
1	USERS	사용자관리	/users	사용자 CRUD	10	t
3	FAQS	FAQ	/faqs	FAQ CRUD	30	t
4	BOARD	게시판	/board	게시판 CRUD/파일	40	t
2	USER_PROGRAMS	메뉴관리	/user-programs	사용자별 메뉴 권한	20	t
\.


--
-- Data for Name: user_programs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_programs (id, user_id, program_id) FROM stdin;
1	1	1
2	1	2
3	1	3
4	1	4
5	2	3
6	2	4
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, username, password_hash, name, email, is_active, created_at, role) FROM stdin;
1	admin	$2b$12$MOem99uBzHMKBaiBeejlgOr160ngQ7ZLw.JKWTP3twQKkcQ8M/XqO	관리자	admin@vibecoding.local	t	2026-09-29 10:49:30.721775+09	admin
2	user	$2b$12$444d9VOUNIpInirOmsg.vOmz47s./a2KAxrHH.0TEjFLWbf9ooBIS	일반사용자	user@vibecoding.local	t	2026-09-29 11:06:12.356208+09	user
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
-- Name: programs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.programs_id_seq', 4, true);


--
-- Name: user_programs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_programs_id_seq', 6, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 2, true);


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
-- Name: programs programs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.programs
    ADD CONSTRAINT programs_pkey PRIMARY KEY (id);


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


