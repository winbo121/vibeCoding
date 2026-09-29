from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginIn(BaseModel):
    username: str
    password: str


class UserCreate(BaseModel):
    username: str = Field(min_length=2, max_length=50)
    password: str = Field(min_length=4, max_length=100)
    name: str = ""
    email: str | None = None
    role: str = Field(default="user", pattern="^(admin|user)$")
    is_active: bool = True


class UserUpdate(BaseModel):
    password: str | None = Field(default=None, min_length=4, max_length=100)
    name: str | None = None
    email: str | None = None
    role: str | None = Field(default=None, pattern="^(admin|user)$")
    is_active: bool | None = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    name: str
    email: str | None
    role: str
    is_active: bool
    created_at: datetime


class ProgramCreate(BaseModel):
    code: str = Field(min_length=1, max_length=50)
    name: str = Field(min_length=1, max_length=100)
    path: str = "/"
    description: str | None = None
    sort_order: int = 0
    is_active: bool = True


class ProgramUpdate(BaseModel):
    code: str | None = Field(default=None, min_length=1, max_length=50)
    name: str | None = Field(default=None, min_length=1, max_length=100)
    path: str | None = None
    description: str | None = None
    sort_order: int | None = None
    is_active: bool | None = None


class ProgramOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    name: str
    path: str
    description: str | None
    sort_order: int
    is_active: bool


class UserProgramAssign(BaseModel):
    program_ids: list[int]


class UserProgramOut(BaseModel):
    user_id: int
    username: str
    programs: list[ProgramOut]


class FaqCreate(BaseModel):
    question: str = Field(min_length=1, max_length=300)
    answer: str = Field(min_length=1)
    sort_order: int = 0
    is_published: bool = True


class FaqUpdate(BaseModel):
    question: str | None = Field(default=None, min_length=1, max_length=300)
    answer: str | None = None
    sort_order: int | None = None
    is_published: bool | None = None


class FaqOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    question: str
    answer: str
    sort_order: int
    is_published: bool
    created_at: datetime
    updated_at: datetime


class BoardFileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    original_name: str
    content_type: str | None
    size: int


class BoardPostCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1)


class BoardPostUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    content: str | None = None


class BoardPostOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    content: str
    author_id: int
    author_name: str = ""
    created_at: datetime
    updated_at: datetime
    files: list[BoardFileOut] = []
