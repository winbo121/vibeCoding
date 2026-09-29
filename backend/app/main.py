from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

from app.config import settings
from app.database import Base, SessionLocal, engine
from app.routers import auth, boards, faqs, jobs, programs, skills, users
from app.seed import seed_data


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_data(db)
    finally:
        db.close()
    yield


app = FastAPI(title="VibeCoding API", version="1.0.0", lifespan=lifespan)

origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(programs.router, prefix="/api")
app.include_router(faqs.router, prefix="/api")
app.include_router(boards.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")
app.include_router(skills.router, prefix="/api")


@app.middleware("http")
async def force_utf8_charset(request: Request, call_next):
    response: Response = await call_next(request)
    content_type = response.headers.get("content-type", "")
    if content_type.startswith("application/json") and "charset=" not in content_type.lower():
        response.headers["content-type"] = "application/json; charset=utf-8"
    elif content_type.startswith("text/") and "charset=" not in content_type.lower():
        response.headers["content-type"] = f"{content_type}; charset=utf-8"
    return response


@app.get("/api/health")
def health():
    return JSONResponse(
        content={"status": "ok", "service": "vibecoding-api"},
        media_type="application/json; charset=utf-8",
    )
