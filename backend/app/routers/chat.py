"""DevHaven 안내 챗봇. OpenAI 키가 있으면 그 모델, 없으면 FAQ 매칭으로 답합니다."""

from __future__ import annotations

import logging
import re

import httpx
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.config import settings
from app.database import get_db
from app.models import Faq, User
from app.routers.places import popular_food_text

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])

SITE_GUIDE = """
DevHaven(개발자 쉼터) 안내:
- 로그인: 관리자 admin / 1234, 일반 사용자 user / 1234
- 내 정보에 집 주소를 저장하면 채용 공고에서 집과 회사 사이 거리·시간을 볼 수 있습니다.
- 현직장과 집주소는 각각의 지도에 표시됩니다.
- 회사 주변 맛집 기본 반경은 300m입니다. 일반 사용자는 등록한 회사, 관리자는 현재 위치 기준입니다.
- 기술 스택은 내 정보에서 쉼표로 저장하면 입사지원 찾기에서 맞는 공고가 위로 옵니다.
- 게시판은 파일 첨부가 가능합니다.
- 프로젝트 분석기는 로컬 폴더 경로를 넣어 공통 함수·검증·다국어 사용을 점검합니다.
- 사용자관리와 메뉴관리는 관리자 전용입니다.
""".strip()


class ChatMessage(BaseModel):
    role: str = Field(pattern="^(user|assistant)$")
    content: str = Field(min_length=1, max_length=2000)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=20)


def _faq_block(db: Session) -> str:
    rows = db.scalars(select(Faq).where(Faq.is_published.is_(True)).order_by(Faq.sort_order, Faq.id)).all()
    if not rows:
        return ""
    lines = ["등록된 FAQ:"]
    for row in rows:
        lines.append(f"Q. {row.question}\nA. {row.answer}")
    return "\n\n".join(lines)


TOPIC_REPLIES = [
    (["로그인", "비밀번호", "계정"], "관리자는 admin / 1234, 일반 사용자는 user / 1234 입니다. 로그인하면 권한에 맞는 메뉴만 보입니다."),
    (["집", "주소", "출퇴근", "거리"], "내 정보에 집 주소를 저장하면 채용 공고에서 집과 회사 사이 거리·시간을 볼 수 있습니다. 현직장과 집주소는 각각의 지도에 표시됩니다."),
    (["맛집", "음식", "반경"], "회사 주변 맛집의 기본 반경은 300m입니다. 일반 사용자는 등록한 회사, 관리자는 현재 위치 기준입니다."),
    (["기술", "스택", "스킬"], "내 정보의 기술 스택을 쉼표로 저장하면 입사지원 찾기에서 맞는 공고가 위로 옵니다."),
    (["게시판", "첨부", "파일"], "게시판 글 작성 시 파일을 첨부할 수 있고, 상세 화면에서 다운로드할 수 있습니다."),
    (["분석", "공통함수", "다국어", "검증"], "프로젝트 분석기는 로컬 폴더 경로를 넣어 공통 함수·검증·다국어 사용을 점검합니다."),
    (["관리자", "메뉴관리", "사용자관리"], "사용자관리와 메뉴관리는 관리자 전용입니다."),
]


def _food_intent(question: str) -> str | None:
    if not any(key in question for key in ("맛집", "점심", "식당", "음식")):
        return None
    if any(key in question for key in ("반경", "어디까지", "어떻게", "방법")):
        return "guide"
    return "popular"


def _local_reply(question: str, faqs: list[Faq], food_text: str) -> str:
    q = question.strip().lower()
    food_intent = _food_intent(q)
    if food_intent == "popular":
        return food_text
    if food_intent == "guide":
        return TOPIC_REPLIES[2][1]
    best: Faq | None = None
    best_score = 0
    tokens = re.findall(r"[가-힣a-z0-9]{2,}", q)
    for faq in faqs:
        question_l = faq.question.lower()
        answer_l = faq.answer.lower()
        score = 0
        for token in tokens:
            if token in question_l:
                score += 3
            elif token in answer_l:
                score += 1
        if score > best_score:
            best, best_score = faq, score
    if best and best_score >= 3:
        return best.answer
    hits = [text for keys, text in TOPIC_REPLIES if any(key in q for key in keys)]
    if hits:
        return "\n".join(hits)
    titles = "\n".join(f"- {faq.question}" for faq in faqs[:6])
    extra = f"\n\n이런 질문을 받아 두었습니다.\n{titles}" if titles else ""
    return (
        "DevHaven 사용을 도와드릴게요. 로그인, 집 주소, 맛집, 기술 스택, 게시판, 프로젝트 분석기 중에서 궁금한 점을 물어봐 주세요."
        f"{extra}"
    )


def _openai_reply(messages: list[ChatMessage], context: str) -> str | None:
    api_key = (settings.openai_api_key or "").strip()
    if not api_key:
        return None
    payload_messages = [
        {
            "role": "system",
            "content": (
                "당신은 DevHaven(개발자 쉼터) 안내 챗봇입니다. "
                "아래 안내, 저장된 맛집 순위, FAQ만 근거로 짧고 친절하게 한국어로 답하세요. "
                "모르는 내용은 추측하지 말고 내 정보·해당 메뉴를 확인해 보라고 안내하세요.\n\n"
                f"{context}"
            ),
        }
    ]
    for message in messages[-12:]:
        payload_messages.append({"role": message.role, "content": message.content.strip()})
    try:
        with httpx.Client(timeout=20.0) as client:
            res = client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={
                    "model": settings.openai_model or "gpt-4o-mini",
                    "temperature": 0.4,
                    "messages": payload_messages,
                },
            )
            res.raise_for_status()
            text = (res.json()["choices"][0]["message"]["content"] or "").strip()
            return text or None
    except Exception as exc:  # noqa: BLE001
        logger.warning("chat openai failed: %s", exc)
        return None


@router.post("")
def chat(body: ChatRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    faqs = db.scalars(select(Faq).where(Faq.is_published.is_(True)).order_by(Faq.sort_order, Faq.id)).all()
    who = f"현재 사용자: {user.name or user.username} ({'관리자' if user.role == 'admin' else '일반'})"
    if user.role != "admin":
        bits = []
        if (user.company or "").strip():
            bits.append(f"회사 {user.company.strip()}")
        if (user.home_address or "").strip():
            bits.append("집 주소 등록됨")
        if (user.skills or "").strip():
            bits.append(f"기술 스택 {user.skills.strip()}")
        if bits:
            who += " / " + ", ".join(bits)
    food_text = popular_food_text(db, user)
    context = "\n\n".join(part for part in (who, SITE_GUIDE, food_text, _faq_block(db)) if part)
    question = body.messages[-1].content
    reply = _openai_reply(body.messages, context)
    source = "openai" if reply else "guide"
    if not reply:
        reply = _local_reply(question, list(faqs), food_text)
    return {"reply": reply, "source": source}
