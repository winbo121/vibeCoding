# 다른 PC에서 DevHaven(개발자 쉼터) 세팅하기

## 1. 사전 설치

| 구성 | 권장 |
|------|------|
| Git | 최신 |
| Python | 3.12+ (3.14 OK) |
| Node.js | 20+ |
| PostgreSQL | 14+ (18 권장) |

## 2. 클론

```powershell
git clone https://github.com/winbo121/vibeCoding.git
cd vibeCoding
```

## 3. 한 번에 부트스트랩 (권장)

PostgreSQL이 이미 실행 중이고 `postgres / vibeCoding123` 로 접속 가능해야 합니다.  
비밀번호가 다르면 `scripts\restore-db.ps1` / `backend\.env` 값을 맞추세요.

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\bootstrap-new-pc.ps1
```

이 스크립트가 하는 일:

1. `backend\.env.example` → `backend\.env` 복사
2. Python venv + `requirements.txt` 설치
3. `frontend` `npm install`
4. DB `vibecoding_dump.sql` 전체 복구 (`-UseFullDump`)

## 4. DB만 수동 복구

### 방식 A — 전체 덤프 (추천, 현재 PC와 동일 데이터)

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\restore-db.ps1 -UseFullDump
```

### 방식 B — 스키마 + 시드 (최소 초기 데이터)

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\restore-db.ps1
```

### psql 직접

```powershell
$env:PGPASSWORD="vibeCoding123"
psql -U postgres -h localhost -d postgres -f .\db\00_create_database.sql
psql -U postgres -h localhost -d vibecoding -f .\db\schema.sql
psql -U postgres -h localhost -d vibecoding -f .\db\seed.sql
```

## 5. 실행

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-backend.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\start-frontend.ps1
```

- Frontend: http://localhost:5173  
- API Docs: http://localhost:8000/docs  

## 6. 기본 계정

| 계정 | 비밀번호 | 권한 |
|------|----------|------|
| admin | 1234 | 관리자 (사용자/메뉴 관리 포함) |
| user | 1234 | 일반 (FAQ, 게시판) |

## 7. SQL 파일 설명

| 파일 | 설명 |
|------|------|
| `db/00_create_database.sql` | `vibecoding` DB 생성 |
| `db/schema.sql` | 테이블 스키마 |
| `db/seed.sql` | 초기 사용자/메뉴/FAQ |
| `db/vibecoding_dump.sql` | 현재 기준 전체 덤프(스키마+데이터) |

덤프를 다시 뽑을 때:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\export-db.ps1
```

## 8. 환경변수

`backend\.env` 예시:

```env
DATABASE_URL=postgresql+psycopg://postgres:vibeCoding123@localhost:5432/vibecoding?client_encoding=utf8
JWT_SECRET=change-me-in-production
CORS_ORIGINS=http://localhost:5173,http://localhost:8080
UPLOAD_DIR=uploads
```

> 참고: 앱 기동 시 `seed.py`가 관리자/메뉴를 한 번 더 보정합니다. SQL 시드만으로도 바로 로그인 가능합니다.
