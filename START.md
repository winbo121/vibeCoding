# START — 다른 PC에서 풀받아 바로 쓰기

이 문서만 따라하면 **DB 덤프 복구 → 앱 실행**까지 끝납니다.

---

## 0. 사전 설치 (한 번만)

| 구성 | 권장 |
|------|------|
| Git | 최신 |
| Python | 3.12+ |
| Node.js | 20+ |
| PostgreSQL | 14+ (실행 중이어야 함) |

기본 DB 접속값 (다르면 `backend\.env` / restore 스크립트 인자로 맞춤):

- Host `localhost` / Port `5432`
- User `postgres` / Password `vibeCoding123`
- Database `vibecoding`

---

## 1. 클론

```powershell
git clone https://github.com/winbo121/vibeCoding.git
cd vibeCoding
```

---

## 2. 한 번에 세팅 (env + venv + npm + **덤프 복구**)

PostgreSQL이 켜진 상태에서:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\bootstrap-new-pc.ps1
```

이 스크립트가 하는 일:

1. `backend\.env.example` → `backend\.env` 복사 (없으면)
2. Python venv + `requirements.txt` 설치
3. `frontend` `npm install`
4. **`db/vibecoding_dump.sql` 전체 복구** (`restore-db.ps1 -UseFullDump`)

덤프만 다시 넣을 때:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\restore-db.ps1 -UseFullDump
```

최소 스키마+시드만 원할 때:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\restore-db.ps1
```

비밀번호가 `vibeCoding123`이 아니면 예:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\restore-db.ps1 -UseFullDump -PgPassword "내비밀번호"
```

---

## 3. 한 번에 실행

프로젝트 루트에서 **`start.cmd` 더블클릭**, 또는:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-all.ps1
```

- UI: http://localhost:5173/vibecoding/
- API: http://localhost:8000/docs
- 로그인: `admin` / `1234` 또는 `user` / `1234`

PowerShell 창 2개(API · Frontend)가 열립니다. **닫지 마세요.**

이미 DB/포트가 떠 있으면 건너뛰고 부족한 것만 켭니다.  
브라우저를 안 열려면: `-NoBrowser`  
Tomcat UI(8080)까지: `-WithTomcat`

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-all.ps1 -WithTomcat
```

---

## 4. 치트시트 (복붙용)

```powershell
# 최초 1회
git clone https://github.com/winbo121/vibeCoding.git
cd vibeCoding
powershell -ExecutionPolicy Bypass -File .\scripts\bootstrap-new-pc.ps1

# 매번 실행
powershell -ExecutionPolicy Bypass -File .\scripts\start-all.ps1
# 또는 start.cmd 더블클릭
```

---

## 5. SQL / 덤프 파일

| 파일 | 용도 |
|------|------|
| `db/vibecoding_dump.sql` | **권장** — 스키마+데이터 전체 (다른 PC 동기화용) |
| `db/00_create_database.sql` | DB 생성 |
| `db/schema.sql` + `db/seed.sql` | 최소 초기화 |

덤프를 다시 뽑을 때 (원본 PC에서):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\export-db.ps1
```

커밋·푸시하면 다른 PC에서 `bootstrap` / `-UseFullDump`로 동일 데이터를 받습니다.

---

## 6. 자주 막히는 곳

| 증상 | 조치 |
|------|------|
| `psql not found` | PostgreSQL 설치 후 PATH, 또는 `tools\pgsql` 포터블 사용 |
| 비밀번호 오류 | `backend\.env`의 `DATABASE_URL`과 restore `-PgPassword` 일치 |
| 포트 8000/5173 사용 중 | 이미 떠 있으면 `start-all`이 skip — 브라우저로 접속만 |
| PG 이미 실행 중 경고 | 정상 — `start-all`은 `:5432` listen이면 PG 재시작 안 함 |

더 자세한 환경·Tomcat·개별 스크립트는 [SETUP.md](./SETUP.md) 참고.
