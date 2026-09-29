import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.auth import get_current_user
from app.config import settings
from app.database import get_db
from app.models import BoardFile, BoardPost, User
from app.schemas import BoardPostOut

router = APIRouter(prefix="/board", tags=["board"])


def _to_out(post: BoardPost) -> BoardPostOut:
    return BoardPostOut(
        id=post.id,
        title=post.title,
        content=post.content,
        author_id=post.author_id,
        author_name=post.author.name if post.author else "",
        created_at=post.created_at,
        updated_at=post.updated_at,
        files=post.files or [],
    )


@router.get("", response_model=list[BoardPostOut])
def list_posts(_: User = Depends(get_current_user), db: Session = Depends(get_db)):
    posts = db.scalars(
        select(BoardPost)
        .options(selectinload(BoardPost.author), selectinload(BoardPost.files))
        .order_by(BoardPost.id.desc())
    ).all()
    return [_to_out(p) for p in posts]


@router.get("/files/{file_id}/download")
def download_file(file_id: int, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from urllib.parse import quote

    board_file = db.get(BoardFile, file_id)
    if not board_file:
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.")
    path = Path(settings.upload_dir) / board_file.stored_name
    if not path.exists():
        raise HTTPException(status_code=404, detail="파일이 디스크에 없습니다.")

    ascii_name = board_file.original_name.encode("ascii", "ignore").decode() or "download"
    utf8_name = quote(board_file.original_name)
    headers = {
        "Content-Disposition": f"attachment; filename=\"{ascii_name}\"; filename*=UTF-8''{utf8_name}"
    }
    return FileResponse(
        path,
        media_type=board_file.content_type or "application/octet-stream",
        headers=headers,
    )


@router.delete("/files/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_file(file_id: int, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    board_file = db.get(BoardFile, file_id)
    if not board_file:
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.")
    path = Path(settings.upload_dir) / board_file.stored_name
    if path.exists():
        path.unlink()
    db.delete(board_file)
    db.commit()


@router.get("/{post_id}", response_model=BoardPostOut)
def get_post(post_id: int, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    post = db.scalar(
        select(BoardPost)
        .where(BoardPost.id == post_id)
        .options(selectinload(BoardPost.author), selectinload(BoardPost.files))
    )
    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")
    return _to_out(post)


@router.post("", response_model=BoardPostOut, status_code=status.HTTP_201_CREATED)
async def create_post(
    title: str = Form(...),
    content: str = Form(...),
    files: list[UploadFile] | None = File(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    post = BoardPost(title=title, content=content, author_id=user.id)
    db.add(post)
    db.flush()

    upload_root = Path(settings.upload_dir)
    upload_root.mkdir(parents=True, exist_ok=True)

    for upload in files or []:
        if not upload.filename:
            continue
        stored = f"{uuid.uuid4().hex}_{upload.filename}"
        dest = upload_root / stored
        data = await upload.read()
        dest.write_bytes(data)
        db.add(
            BoardFile(
                post_id=post.id,
                original_name=upload.filename,
                stored_name=stored,
                content_type=upload.content_type,
                size=len(data),
            )
        )

    db.commit()
    post = db.scalar(
        select(BoardPost)
        .where(BoardPost.id == post.id)
        .options(selectinload(BoardPost.author), selectinload(BoardPost.files))
    )
    return _to_out(post)


@router.put("/{post_id}", response_model=BoardPostOut)
async def update_post(
    post_id: int,
    title: str = Form(...),
    content: str = Form(...),
    files: list[UploadFile] | None = File(None),
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    post = db.get(BoardPost, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")
    post.title = title
    post.content = content

    upload_root = Path(settings.upload_dir)
    upload_root.mkdir(parents=True, exist_ok=True)
    for upload in files or []:
        if not upload.filename:
            continue
        stored = f"{uuid.uuid4().hex}_{upload.filename}"
        dest = upload_root / stored
        data = await upload.read()
        dest.write_bytes(data)
        db.add(
            BoardFile(
                post_id=post.id,
                original_name=upload.filename,
                stored_name=stored,
                content_type=upload.content_type,
                size=len(data),
            )
        )

    db.commit()
    post = db.scalar(
        select(BoardPost)
        .where(BoardPost.id == post_id)
        .options(selectinload(BoardPost.author), selectinload(BoardPost.files))
    )
    return _to_out(post)


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(post_id: int, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    post = db.scalar(
        select(BoardPost).where(BoardPost.id == post_id).options(selectinload(BoardPost.files))
    )
    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")

    upload_root = Path(settings.upload_dir)
    for f in post.files:
        path = upload_root / f.stored_name
        if path.exists():
            path.unlink()
    db.delete(post)
    db.commit()
