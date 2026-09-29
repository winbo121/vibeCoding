"""Match job postings against a user's tech stack."""

from __future__ import annotations

import re

from app.models import JobPosting

# Common aliases so "JS" matches "JavaScript", etc.
ALIASES: dict[str, set[str]] = {
    "js": {"javascript", "js"},
    "javascript": {"javascript", "js"},
    "ts": {"typescript", "ts"},
    "typescript": {"typescript", "ts"},
    "py": {"python", "py"},
    "python": {"python", "py"},
    "react.js": {"react", "reactjs", "react.js"},
    "reactjs": {"react", "reactjs", "react.js"},
    "react": {"react", "reactjs", "react.js"},
    "node": {"node", "nodejs", "node.js"},
    "nodejs": {"node", "nodejs", "node.js"},
    "node.js": {"node", "nodejs", "node.js"},
    "postgres": {"postgres", "postgresql", "psql"},
    "postgresql": {"postgres", "postgresql", "psql"},
    "k8s": {"k8s", "kubernetes"},
    "kubernetes": {"k8s", "kubernetes"},
    "java": {"java"},
}


def parse_skills(raw: str | None) -> list[str]:
    if not raw:
        return []
    parts = re.split(r"[,/|·;]+|\s{2,}", raw)
    skills: list[str] = []
    for part in parts:
        token = part.strip()
        if not token:
            continue
        # also split single spaces for "Python FastAPI React"
        if " " in token and len(token) < 40 and "," not in raw:
            skills.extend(t.strip() for t in token.split() if t.strip())
        else:
            skills.append(token)
    # de-dupe case-insensitively preserving first spelling
    seen: set[str] = set()
    unique: list[str] = []
    for skill in skills:
        key = skill.casefold()
        if key in seen:
            continue
        seen.add(key)
        unique.append(skill)
    return unique


def _variants(skill: str) -> set[str]:
    key = skill.casefold().strip()
    variants = {key, key.replace(".", ""), key.replace("-", ""), key.replace(" ", "")}
    variants |= ALIASES.get(key, set())
    return {v for v in variants if v}


def _token_match(variant: str, text: str) -> bool:
    """Word-boundary match so 'java' does not hit 'javascript'."""
    if not variant:
        return False
    # allow dots in tokens like node.js / react.js
    escaped = re.escape(variant).replace(r"\.", r"\.?")
    pattern = rf"(?<![a-z0-9]){escaped}(?![a-z0-9])"
    return re.search(pattern, text, flags=re.IGNORECASE) is not None


def skill_matches(user_skill: str, haystack: str) -> bool:
    text = haystack.casefold()
    compact = re.sub(r"[\s.\-_/]+", "", text)
    for variant in _variants(user_skill):
        if not variant:
            continue
        if _token_match(variant, text):
            return True
        compact_variant = variant.replace(".", "").replace("-", "").replace(" ", "")
        # compact check only for multi-char tokens that aren't strict prefixes of longer words
        # skip single-letter; for 'java' avoid matching inside 'javascript' via compact
        if len(compact_variant) >= 4 and compact_variant in compact:
            # reject if longer word continues (e.g. java + script)
            idx = 0
            while True:
                pos = compact.find(compact_variant, idx)
                if pos < 0:
                    break
                after = compact[pos + len(compact_variant) : pos + len(compact_variant) + 1]
                before = compact[pos - 1 : pos] if pos > 0 else ""
                if (not before or not before.isalnum()) and (not after or not after.isalnum()):
                    return True
                idx = pos + 1
    return False


def score_job(job: JobPosting, user_skills: list[str]) -> tuple[int, list[str]]:
    if not user_skills:
        return 0, []

    haystack = " ".join(
        filter(
            None,
            [
                job.title or "",
                job.skills or "",
                job.summary or "",
                job.description or "",
                job.company or "",
            ],
        )
    )
    matched: list[str] = []
    score = 0
    for skill in user_skills:
        if not skill_matches(skill, haystack):
            continue
        matched.append(skill)
        # Prefer hits in explicit skills / title
        if skill_matches(skill, job.skills or ""):
            score += 3
        elif skill_matches(skill, job.title or ""):
            score += 2
        else:
            score += 1
    return score, matched
