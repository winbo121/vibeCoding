"""기술스택 정규화 AI — 한글/별칭 입력을 채용공고 매칭용 영문 표준명으로 변환."""

from __future__ import annotations

import json
import logging
import re

import httpx

from app.config import settings
from app.jobs.matching import parse_skills

logger = logging.getLogger(__name__)

# 한글·오타·별칭 → 표준 영문명 (매칭/저장 기준)
SKILL_CANON: dict[str, str] = {
    # Python
    "파이썬": "Python",
    "파이선": "Python",
    "파썬": "Python",
    "python": "Python",
    "py": "Python",
    # Java
    "자바": "Java",
    "java": "Java",
    # JavaScript
    "자바스크립트": "JavaScript",
    "자스": "JavaScript",
    "javascript": "JavaScript",
    "js": "JavaScript",
    # TypeScript
    "타입스크립트": "TypeScript",
    "타스": "TypeScript",
    "typescript": "TypeScript",
    "ts": "TypeScript",
    # React / Vue / Angular
    "리액트": "React",
    "리액트js": "React",
    "react": "React",
    "reactjs": "React",
    "react.js": "React",
    "뷰": "Vue",
    "뷰js": "Vue",
    "vue": "Vue",
    "vuejs": "Vue",
    "vue.js": "Vue",
    "앵귤러": "Angular",
    "angular": "Angular",
    # Node
    "노드": "Node.js",
    "노드js": "Node.js",
    "노드제이에스": "Node.js",
    "node": "Node.js",
    "nodejs": "Node.js",
    "node.js": "Node.js",
    # Backend frameworks
    "스프링": "Spring",
    "스프링부트": "Spring Boot",
    "spring": "Spring",
    "springboot": "Spring Boot",
    "spring boot": "Spring Boot",
    "파스타피": "FastAPI",
    "패스트api": "FastAPI",
    "fastapi": "FastAPI",
    "장고": "Django",
    "django": "Django",
    "플라스크": "Flask",
    "flask": "Flask",
    "익스프레스": "Express",
    "express": "Express",
    "nest": "NestJS",
    "nestjs": "NestJS",
    # DB
    "포스트그레": "PostgreSQL",
    "포스트그레스": "PostgreSQL",
    "포스트그레스ql": "PostgreSQL",
    "postgresql": "PostgreSQL",
    "postgres": "PostgreSQL",
    "마이sql": "MySQL",
    "마이에스큐엘": "MySQL",
    "mysql": "MySQL",
    "몽고": "MongoDB",
    "몽고디비": "MongoDB",
    "mongodb": "MongoDB",
    "레디스": "Redis",
    "redis": "Redis",
    "오라클": "Oracle",
    "oracle": "Oracle",
    # Cloud / DevOps
    "도커": "Docker",
    "docker": "Docker",
    "쿠버네티스": "Kubernetes",
    "쿠베": "Kubernetes",
    "kubernetes": "Kubernetes",
    "k8s": "Kubernetes",
    "아마존": "AWS",
    "에이더블유에스": "AWS",
    "aws": "AWS",
    "구글클라우드": "GCP",
    "gcp": "GCP",
    "애저": "Azure",
    "azure": "Azure",
    "테라폼": "Terraform",
    "terraform": "Terraform",
    # Mobile
    "플러터": "Flutter",
    "flutter": "Flutter",
    "다트": "Dart",
    "dart": "Dart",
    "스위프트": "Swift",
    "swift": "Swift",
    "코틀린": "Kotlin",
    "kotlin": "Kotlin",
    # Web basics
    "에이치티엠엘": "HTML",
    "html": "HTML",
    "씨에스에스": "CSS",
    "css": "CSS",
    "부트스트랩": "Bootstrap",
    "bootstrap": "Bootstrap",
    # Misc
    "깃": "Git",
    "git": "Git",
    "깃허브": "GitHub",
    "github": "GitHub",
    "리눅스": "Linux",
    "linux": "Linux",
    "씨": "C",
    "씨플플": "C++",
    "씨샵": "C#",
    "c++": "C++",
    "c#": "C#",
    "고언어": "Go",
    "골랑": "Go",
    "go": "Go",
    "golang": "Go",
    "러스트": "Rust",
    "rust": "Rust",
    "파이어베이스": "Firebase",
    "firebase": "Firebase",
    "그래프ql": "GraphQL",
    "graphql": "GraphQL",
    "레스트": "REST API",
    "rest": "REST API",
    "restapi": "REST API",
    "rest api": "REST API",
}


def _lookup_key(token: str) -> str:
    return re.sub(r"\s+", "", token.strip().casefold())


def _canon_from_dict(token: str) -> str | None:
    key = _lookup_key(token)
    if key in SKILL_CANON:
        return SKILL_CANON[key]
    # spaced variants already covered; try without punctuation
    key2 = re.sub(r"[.\-_]", "", key)
    return SKILL_CANON.get(key2)


def _openai_normalize(unknown: list[str]) -> dict[str, str]:
    """미등록 토큰만 OpenAI로 표준 영문명 변환 (키 없으면 빈 dict)."""
    api_key = (getattr(settings, "openai_api_key", None) or "").strip()
    if not api_key or not unknown:
        return {}

    prompt = (
        "You normalize developer tech-stack skill names to canonical English names "
        "used in job postings. Return ONLY a JSON object mapping each input to its "
        "canonical English name. Keep already-English names with proper casing "
        "(e.g. Python, Java, React). Korean like 파이썬→Python, 자바→Java.\n"
        f"Inputs: {json.dumps(unknown, ensure_ascii=False)}"
    )
    try:
        with httpx.Client(timeout=12.0) as client:
            res = client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": getattr(settings, "openai_model", None) or "gpt-4o-mini",
                    "temperature": 0,
                    "response_format": {"type": "json_object"},
                    "messages": [
                        {"role": "system", "content": "Return JSON only."},
                        {"role": "user", "content": prompt},
                    ],
                },
            )
            res.raise_for_status()
            content = res.json()["choices"][0]["message"]["content"]
            data = json.loads(content)
            if isinstance(data, dict):
                return {str(k): str(v).strip() for k, v in data.items() if str(v).strip()}
    except Exception as exc:  # noqa: BLE001 — AI는 실패해도 사전 매핑으로 진행
        logger.warning("skill AI fallback failed: %s", exc)
    return {}


def normalize_skills(raw: str | None) -> str | None:
    """
    '파이썬, 자바, 리액트' → 'Python, Java, React'
    알 수 없는 항목은 OpenAI(설정 시) 또는 원문 유지.
    """
    if raw is None:
        return None
    text = raw.strip()
    if not text:
        return None

    tokens = parse_skills(text)
    if not tokens:
        return None

    resolved: list[str] = []
    unknown: list[str] = []
    pending_idx: list[int] = []

    for token in tokens:
        canon = _canon_from_dict(token)
        if canon:
            resolved.append(canon)
        else:
            pending_idx.append(len(resolved))
            resolved.append(token)  # placeholder
            unknown.append(token)

    if unknown:
        ai_map = _openai_normalize(unknown)
        for i, token in zip(pending_idx, unknown):
            ai_val = ai_map.get(token) or ai_map.get(token.strip())
            if ai_val:
                resolved[i] = ai_val
            else:
                # 영문이면 Title Case 정도만, 한글 미매칭은 그대로
                if re.fullmatch(r"[A-Za-z][A-Za-z0-9.+#\s\-]*", token):
                    resolved[i] = token[0].upper() + token[1:] if len(token) > 1 else token.upper()

    # de-dupe preserving order (case-insensitive)
    seen: set[str] = set()
    unique: list[str] = []
    for skill in resolved:
        key = skill.casefold()
        if key in seen:
            continue
        seen.add(key)
        unique.append(skill)
    return ", ".join(unique)


def skill_dictionary() -> list[dict[str, str | list[str]]]:
    """표준명별 유사용어(한글/별칭) 목록."""
    groups: dict[str, list[str]] = {}
    for alias, canon in SKILL_CANON.items():
        groups.setdefault(canon, [])
        # 표준명과 동일한 영문 키는 aliases에서 제외
        if alias.casefold() == canon.casefold():
            continue
        if alias not in groups[canon]:
            groups[canon].append(alias)
    rows: list[dict[str, str | list[str]]] = []
    for canon in sorted(groups.keys(), key=str.casefold):
        aliases = sorted(groups[canon], key=lambda s: (not bool(re.search(r"[가-힣]", s)), s))
        rows.append({"canon": canon, "aliases": aliases})
    return rows


def suggest_skills(q: str | None = None, limit: int = 12) -> list[dict[str, str]]:
    """
    자동완성 후보.
    q가 비면 인기 표준명 일부, 있으면 alias/canon 부분일치.
    """
    limit = max(1, min(limit, 30))
    query = (q or "").strip()
    dict_rows = skill_dictionary()

    if not query:
        popular = [
            "Python",
            "Java",
            "JavaScript",
            "TypeScript",
            "React",
            "Spring Boot",
            "Node.js",
            "PostgreSQL",
            "MySQL",
            "Docker",
            "AWS",
            "Flutter",
        ]
        out: list[dict[str, str]] = []
        alias_map = {row["canon"]: row["aliases"] for row in dict_rows}
        for name in popular:
            aliases = alias_map.get(name, [])
            hint = ", ".join(aliases[:3]) if aliases else name
            out.append({"value": name, "label": name, "hint": hint})
        return out[:limit]

    q_key = _lookup_key(query)
    # score: (rank, alias_len, canon) — lower rank first; prefer prefix over contains
    hits: list[tuple[int, int, str, str]] = []
    seen: set[str] = set()

    for row in dict_rows:
        canon = str(row["canon"])
        aliases = [str(a) for a in row["aliases"]]  # type: ignore[index]
        candidates = [canon, *aliases]
        best: tuple[int, int, str] | None = None  # rank, len, matched
        for term in candidates:
            tk = _lookup_key(term)
            if not tk:
                continue
            if tk == q_key:
                cand = (0, len(tk), term)
            elif tk.startswith(q_key):
                cand = (1, len(tk), term)
            elif q_key.startswith(tk) and len(tk) >= 2:
                cand = (2, len(tk), term)
            elif q_key in tk:
                cand = (3, len(tk), term)
            else:
                continue
            if best is None or cand < best:
                best = cand
        if best is None:
            continue
        key = canon.casefold()
        if key in seen:
            continue
        seen.add(key)
        rank, _, matched_as = best
        hint_parts = [matched_as] if matched_as and matched_as != canon else []
        hint_parts.extend(a for a in aliases[:4] if a != matched_as)
        hits.append((rank, best[1], canon, ", ".join(hint_parts[:4]) or canon))

    hits.sort(key=lambda t: (t[0], t[1], t[2].casefold()))
    return [{"value": c, "label": c, "hint": h} for _, _, c, h in hits[:limit]]
