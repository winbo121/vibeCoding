# VibeCoding

Python(FastAPI) + React + PostgreSQL + Tomcat 풀스택 CRUD 프로젝트입니다.

## 환경 버전

| 구성 | 버전 | 비고 |
|------|------|------|
| Python | 3.14.7 | Backend (`backend/.venv`) |
| React / Vite | React 19 / Vite 8 | Frontend |
| Node.js | 24.18.0 (기존 설치) | React 빌드/개발 |
| PostgreSQL | 18.6 | `tools/pgsql` portable + `tools/pgsql-data` |
| JDK | Temurin 21.0.12 | Tomcat 실행 |
| Apache Tomcat | 11.0.26 | React 정적 배포(WAS) |

> Tomcat은 Java WAS라서 Python을 직접 실행하지 않습니다.  
> React 빌드 결과물을 Tomcat에 배포하고, CRUD API는 FastAPI(포트 8000)가 담당합니다.

## 폴더 구조

```
vibeCoding/
  backend/      FastAPI + SQLAlchemy + PostgreSQL CRUD API
  frontend/     React(Vite) CRUD UI
  scripts/      실행/배포/DB 복구 스크립트
  db/           SQL 스키마·시드·덤프
  SETUP.md      다른 PC 설치 가이드
```

## 다른 PC에서 빠르게 세팅

자세한 절차는 [SETUP.md](./SETUP.md) 참고.

```powershell
git clone https://github.com/winbo121/vibeCoding.git
cd vibeCoding
powershell -ExecutionPolicy Bypass -File .\scripts\bootstrap-new-pc.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\start-backend.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\start-frontend.ps1
```

DB만 복구할 때 (현재 기준 전체 덤프 권장):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\restore-db.ps1 -UseFullDump
# 또는 최소 스키마+시드
powershell -ExecutionPolicy Bypass -File .\scripts\restore-db.ps1
```

## DB 접속 정보

- Host: `localhost`
- Port: `5432`
- User: `postgres`
- Password: `vibeCoding123`
- Database: `vibecoding`

## 실행 방법

### 1) PostgreSQL 시작

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-postgres.ps1
```

처음 한 번만 초기화가 필요하면:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\init-portable-pg.ps1
```

### 2) Backend (FastAPI)

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-backend.ps1
```

- API: http://localhost:8000
- Swagger: http://localhost:8000/docs

### 3) Frontend 개발 서버

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-frontend.ps1
```

- UI: http://localhost:5173

### 4) Tomcat 배포(선택)

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\deploy-tomcat.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\start-tomcat.ps1
```

- Tomcat UI: http://localhost:8080/vibecoding/

## 로그인

- 관리자: `admin` / `1234` → 사용자관리, 메뉴관리, FAQ, 게시판
- 일반 사용자: `user` / `1234` → FAQ, 게시판만
- 비로그인: 메인 화면만
- 로그인 후 메뉴는 권한에 따라 표시됩니다.

## 주요 API

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/auth/login` | 로그인 |
| GET | `/api/auth/me` | 내 정보 |
| GET/POST/PUT/DELETE | `/api/users` | 사용자 CRUD |
| GET/POST/PUT/DELETE | `/api/programs` | 프로그램 CRUD |
| GET/PUT | `/api/user-programs` | 사용자-메뉴 권한 |
| GET/POST/PUT/DELETE | `/api/faqs` | FAQ CRUD |
| GET/POST/PUT/DELETE | `/api/board` | 게시판 CRUD |
| GET | `/api/board/files/{id}/download` | 첨부 다운로드 |

## 참고

- EDB Windows 설치 프로그램이 환경에서 장시간 멈출 수 있어, 공식 바이너리 ZIP(PostgreSQL 18.6)을 `tools/pgsql`에 구성했습니다.
- Python/JDK는 winget으로 설치했습니다.
- Tomcat은 Apache 공식 ZIP을 `tools/apache-tomcat-11.0.26`에 풀어 사용합니다.
