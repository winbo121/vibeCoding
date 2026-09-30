# DevHaven (개발자 쉼터)

Python(FastAPI) + React + PostgreSQL 풀스택입니다.  
브랜드명 **DevHaven** · 한글명 **개발자 쉼터**

| 구성 | 이 PC 기준 |
|------|------------|
| Python | 3.14 (3.12+면 됨) |
| React / Vite | 19 / 8 |
| Node.js | 20+ |
| PostgreSQL | 18 (14+면 됨) |
| Tomcat | 11 (선택, UI만) |

API는 FastAPI `:8000`, 화면은 Vite `:5173`. Tomcat은 React 빌드를 `:8080`에 올릴 때만 씁니다.

---

## 다른 PC에서 쓰기

Git, Python, Node, **실행 중인 PostgreSQL**이 필요합니다.

기본 접속: `localhost:5432` / `postgres` / `vibeCoding123` / DB `vibecoding`  
비밀번호가 다르면 `backend\.env`의 `DATABASE_URL`과 아래 `-PgPassword`를 맞춥니다.

```powershell
git clone https://github.com/winbo121/vibeCoding.git
cd vibeCoding

# 최초 1회 — env, venv, npm, db/vibecoding_dump.sql 복구
powershell -ExecutionPolicy Bypass -File .\scripts\bootstrap-new-pc.ps1

# 매번 — API + 프론트 (또는 start.cmd 더블클릭)
powershell -ExecutionPolicy Bypass -File .\scripts\start-all.ps1
```

- UI: http://localhost:5173/vibecoding/
- API: http://localhost:8000/docs
- 로그인: `admin` / `1234` (관리자), `user` / `1234` (일반)

`bootstrap-new-pc.ps1`이 하는 일: `backend\.env` 복사 → Python venv + requirements → `npm install` → **전체 덤프 복구**.

이미 떠 있는 PostgreSQL·8000·5173은 `start-all`이 건너뜁니다. 열린 PowerShell 창(API / Frontend)은 닫지 마세요.

---

## DB

| 파일 | 용도 |
|------|------|
| `db/vibecoding_dump.sql` | 스키마+데이터 전체 (다른 PC 동기화용) |
| `db/00_create_database.sql` | DB 생성 |
| `db/schema.sql` / `db/seed.sql` | 최소 초기화 |

```powershell
# 덤프만 다시
powershell -ExecutionPolicy Bypass -File .\scripts\restore-db.ps1 -UseFullDump

# 비밀번호가 다를 때
powershell -ExecutionPolicy Bypass -File .\scripts\restore-db.ps1 -UseFullDump -PgPassword "내비밀번호"

# 스키마+시드만
powershell -ExecutionPolicy Bypass -File .\scripts\restore-db.ps1

# 이 PC에서 덤프 다시 뽑기
powershell -ExecutionPolicy Bypass -File .\scripts\export-db.ps1
```

`backend\.env` 예시:

```env
DATABASE_URL=postgresql+psycopg://postgres:vibeCoding123@localhost:5432/vibecoding?client_encoding=utf8
JWT_SECRET=change-me-in-production
CORS_ORIGINS=http://localhost:5173,http://localhost:8080
UPLOAD_DIR=uploads
```

---

## 실행 옵션

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-all.ps1 -NoBrowser
powershell -ExecutionPolicy Bypass -File .\scripts\start-backend.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\start-frontend.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\start-postgres.ps1          # 포터블 PG
```

포터블 PostgreSQL을 처음 쓸 때만 `scripts\init-portable-pg.ps1`.

---

## 중간에 막힐 때

| 증상 | 조치 |
|------|------|
| `psql not found` | PostgreSQL 설치 후 PATH, 또는 `tools\pgsql` |
| 비밀번호 오류 | `backend\.env`와 restore `-PgPassword`를 같게 |
| 8000 / 5173 이미 사용 중 | 서버가 떠 있는 상태. 브라우저로 접속 |
| PostgreSQL 이미 실행 | 그대로 진행. `start-all`은 `:5432`가 열려 있으면 다시 안 켬 |

## 폴더

```
backend/    FastAPI
frontend/   React (Vite)
scripts/    bootstrap, start-all, restore/export
db/         스키마·시드·덤프
start.cmd   더블클릭 실행
```
