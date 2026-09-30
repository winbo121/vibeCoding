from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.analyzer.scan import iter_scan, resolve_project
from app.auth import get_current_user
from app.models import User

router = APIRouter(prefix="/analyzer", tags=["analyzer"])


class ScanRequest(BaseModel):
    path: str = Field(min_length=1, max_length=500)


@router.post("/scan")
def scan_project(body: ScanRequest, _: User = Depends(get_current_user)):
    try:
        root = resolve_project(body.path)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return StreamingResponse(
        iter_scan(root),
        media_type="text/event-stream; charset=utf-8",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
