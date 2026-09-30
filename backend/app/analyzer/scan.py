"""Scan a local project for shared functions and how screens use them."""

from __future__ import annotations

import json
import re
from pathlib import Path

SOURCE_EXT = {".java", ".js", ".jsx", ".ts", ".tsx", ".jsp", ".vue", ".py"}
SKIP_DIRS = {
    "node_modules",
    ".git",
    "target",
    "build",
    "dist",
    ".venv",
    "venv",
    "vendor",
    "plugins",
    "__pycache__",
    ".idea",
    ".gradle",
    "out",
    "coverage",
    ".next",
    ".svn",
}
COMMON_DIRS = {"common", "util", "utils", "shared", "helper", "helpers", "validation", "i18n", "locale", "message", "messages"}
COMMON_NAME_HINTS = ("util", "utils", "helper", "common", "validation", "comfunction", "message")
VENDOR_HINTS = (
    "jquery",
    "bootstrap",
    "swiper",
    "select2",
    "sweetalert",
    "fontawesome",
    "owl.carousel",
    "polyfill",
    "moment",
    "lodash",
    "apexchart",
    "dropzone",
    "toastr",
    "jwplayer",
    "isotope",
    "slick",
    "feather",
    "respond.min",
)
SKIP_FUNC = {
    "tostring",
    "hashcode",
    "equals",
    "main",
    "clone",
    "wait",
    "notify",
    "notifyall",
    "finalize",
    "iterator",
    "if",
    "for",
    "while",
    "switch",
    "catch",
    "function",
    "return",
    "get",
    "set",
    "add",
    "put",
    "log",
    "info",
    "warn",
    "error",
    "data",
    "value",
    "item",
    "list",
    "map",
    "init",
    "close",
    "open",
    "read",
    "write",
    "apply",
    "call",
    "bind",
    "then",
    "indexof",
    "split",
    "replace",
    "replaceall",
    "substring",
    "trim",
    "contains",
    "append",
    "size",
    "clear",
    "format",
    "parse",
    "valueof",
    "length",
    "charat",
    "startswith",
    "endswith",
    "tolowercase",
    "touppercase",
    "build",
    "join",
    "filter",
    "foreach",
    "stream",
    "collect",
    "empty",
    "concat",
    "slice",
    "splice",
    "push",
    "pop",
    "match",
    "search",
    "substr",
    "tofixed",
    "keys",
    "values",
    "entries",
    "assign",
    "alert",
    "confirm",
    "prompt",
    "remove",
}
MAX_FILE_BYTES = 400_000
MAX_FILES = 2500
USED_LIMIT = 80
UNUSED_LIMIT = 120
SNIPPET_LINES = 32

JAVA_DEF = re.compile(
    r"^\s*(?:public|protected|private)\s+(?:static\s+)?(?:final\s+)?(?:synchronized\s+)?"
    r"(?:<[^>]+>\s+)?(?:[\w.<>,\[\]?]+\s+)+(\w+)\s*\("
)
JS_DEF = re.compile(
    r"(?:^|[\s;}])(?:async\s+)?function\s+(\w+)\s*\(|\.prototype\.(\w+)\s*=\s*function\s*\("
)
PY_DEF = re.compile(r"^\s*(?:async\s+)?def\s+(\w+)\s*\(")
I18N_RE = re.compile(
    r"spring:message|fmt:message|<spring:message|getMessage\s*\(|i18n\.t\s*\(|useTranslation|\$t\s*\(|messageSource",
    re.I,
)
KO_RE = re.compile(r"[가-힣]")
VALID_RE = re.compile(
    r"\.validate\s*\(|jquery\.validate|@Valid\b|BindingResult|checkValid|fn_?valid|validation\s*\(",
    re.I,
)
BLOCKED_NAMES = {"windows", "system32", "syswow64", "program files", "program files (x86)"}


def resolve_project(raw: str) -> Path:
    text = (raw or "").strip().strip('"').strip("'")
    if not text:
        raise ValueError("분석할 폴더 경로를 입력하세요.")
    path = Path(text).expanduser()
    try:
        path = path.resolve()
    except OSError as exc:
        raise ValueError("경로를 확인할 수 없습니다.") from exc
    if not path.exists() or not path.is_dir():
        raise ValueError("폴더를 찾을 수 없습니다. 프로젝트 루트 경로를 입력하세요.")
    if path.parent == path:
        raise ValueError("드라이브 최상위는 분석할 수 없습니다. 프로젝트 폴더를 지정하세요.")
    lowered = {part.lower() for part in path.parts}
    if path.name.lower() in BLOCKED_NAMES or lowered & {"windows", "system32"}:
        raise ValueError("시스템 폴더는 분석할 수 없습니다.")
    return path


def _read_text(path: Path) -> str:
    data = path.read_bytes()
    if len(data) > MAX_FILE_BYTES or b"\x00" in data[:2000]:
        return ""
    for encoding in ("utf-8", "utf-8-sig", "cp949"):
        try:
            return data.decode(encoding)
        except UnicodeDecodeError:
            continue
    return data.decode("utf-8", errors="replace")


def _is_vendor(rel: str) -> bool:
    low = rel.lower()
    return any(hint in low for hint in VENDOR_HINTS) or low.endswith(".min.js")


def _is_common_file(rel: str) -> bool:
    parts = rel.replace("\\", "/").lower().split("/")
    if any(part in COMMON_DIRS for part in parts):
        return True
    name = parts[-1] if parts else ""
    return any(hint in name for hint in COMMON_NAME_HINTS)


def _is_screen(rel: str) -> bool:
    low = rel.replace("\\", "/").lower()
    ext = Path(low).suffix
    if "/layout/" in low or "/common/" in low or "/util/" in low:
        return False
    if ext in {".jsp", ".vue", ".jsx", ".tsx"}:
        return True
    return ext == ".java" and low.endswith("controller.java")


def _category(name: str, rel: str) -> str:
    blob = f"{name} {rel}".lower()
    if any(key in blob for key in ("i18n", "message", "locale", "lang", "getmessage")):
        return "i18n"
    if any(key in blob for key in ("valid", "check", "verify", "isempty", "isnull", "nullcheck")):
        return "validation"
    return "common"


def _extract_names(text: str, suffix: str) -> list[tuple[str, int]]:
    found: list[tuple[str, int]] = []
    if suffix == ".java":
        for idx, line in enumerate(text.splitlines(), start=1):
            match = JAVA_DEF.match(line)
            if match:
                found.append((match.group(1), idx))
    elif suffix == ".py":
        for idx, line in enumerate(text.splitlines(), start=1):
            match = PY_DEF.match(line)
            if match:
                found.append((match.group(1), idx))
    else:
        for match in JS_DEF.finditer(text):
            name = match.group(1) or match.group(2)
            line = text.count("\n", 0, match.start()) + 1
            if name:
                found.append((name, line))
    kept = []
    for name, line in found:
        if name.lower() in SKIP_FUNC or len(name) < 3 or name.startswith("_"):
            continue
        kept.append((name, line))
    return kept


def _snippet(text: str, line: int) -> str:
    lines = text.splitlines()
    start = max(0, line - 1)
    if start >= len(lines):
        return ""
    depth = 0
    seen = False
    out: list[str] = []
    end = min(len(lines), start + SNIPPET_LINES)
    for idx in range(start, end):
        row = lines[idx]
        out.append(row)
        for ch in row:
            if ch == "{":
                depth += 1
                seen = True
            elif ch == "}":
                depth -= 1
        if seen and depth <= 0:
            break
    body = "\n".join(out).rstrip()
    if seen and depth > 0:
        body += "\n…"
    return body


def _list_files(root: Path) -> list[Path]:
    files: list[Path] = []
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        if any(part.lower() in SKIP_DIRS for part in path.parts):
            continue
        if path.suffix.lower() not in SOURCE_EXT and "message" not in path.name.lower():
            continue
        rel = str(path.relative_to(root))
        if _is_vendor(rel):
            continue
        files.append(path)
        if len(files) >= MAX_FILES:
            break
    return files


def _event(payload: dict) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


def iter_scan(root: Path):
    files = _list_files(root)
    total = len(files)
    texts: dict[str, str] = {}
    common_rels: set[str] = set()
    screen_rels: list[str] = []
    message_files: list[str] = []

    yield _event({"type": "progress", "scanned": 0, "total": total, "current": "", "phase": "파일 목록을 확인했습니다."})

    for index, path in enumerate(files, start=1):
        rel = str(path.relative_to(root)).replace("\\", "/")
        suffix = path.suffix.lower()
        if suffix == ".properties" or "message" in path.name.lower() and suffix == ".properties":
            message_files.append(rel)
        text = _read_text(path) if suffix in SOURCE_EXT else ""
        if text:
            texts[rel] = text
            if _is_common_file(rel):
                common_rels.add(rel)
            if _is_screen(rel):
                screen_rels.append(rel)
        if index == total or index % 15 == 0:
            yield _event(
                {
                    "type": "progress",
                    "scanned": index,
                    "total": total,
                    "current": rel,
                    "phase": "소스를 읽는 중",
                }
            )
            yield _event(
                {
                    "type": "metrics",
                    "metrics": {
                        "scanned_files": index,
                        "total_files": total,
                        "common_files": len(common_rels),
                        "screen_files": len(screen_rels),
                        "message_files": len(message_files),
                        "common_functions": 0,
                        "reused_functions": 0,
                        "unused_functions": 0,
                        "validation_rate": None,
                        "i18n_rate": None,
                    },
                }
            )

    yield _event({"type": "progress", "scanned": total, "total": total, "current": "", "phase": "공통 함수 사용을 집계하는 중"})

    definitions: dict[str, dict] = {}
    for rel, text in texts.items():
        if rel not in common_rels:
            continue
        suffix = Path(rel).suffix.lower()
        for name, line in _extract_names(text, suffix):
            current = definitions.get(name)
            item = {
                "name": name,
                "file": rel,
                "line": line,
                "category": _category(name, rel),
                "code": _snippet(text, line),
                "def_files": {rel},
            }
            if current is None:
                definitions[name] = item
            else:
                current["def_files"].add(rel)
                # Prefer the shorter common file as the sample shown in the UI.
                if len(rel) < len(current["file"]):
                    current["file"] = rel
                    current["line"] = line
                    current["code"] = item["code"]
                    current["category"] = item["category"]

    names = list(definitions)
    usage_files: dict[str, set[str]] = {name: set() for name in names}
    usage_calls: dict[str, int] = {name: 0 for name in names}
    if names:
        ordered = sorted(names, key=len, reverse=True)
        pattern = re.compile(r"\b(" + "|".join(re.escape(name) for name in ordered) + r")\s*\(")
        for rel, text in texts.items():
            for match in pattern.finditer(text):
                name = match.group(1)
                if rel in definitions[name]["def_files"]:
                    continue
                usage_files[name].add(rel)
                usage_calls[name] += 1

    functions = []
    for name, info in definitions.items():
        used = sorted(usage_files[name])
        functions.append(
            {
                "name": name,
                "category": info["category"],
                "file": info["file"],
                "line": info["line"],
                "files": len(used),
                "calls": usage_calls[name],
                "used_in": used[:12],
                "code": info["code"],
            }
        )
    functions.sort(key=lambda row: (-row["files"], -row["calls"], row["name"].lower()))

    called_by_file: dict[str, set[str]] = {rel: set() for rel in screen_rels}
    for row in functions:
        for rel in usage_files[row["name"]]:
            if rel in called_by_file:
                called_by_file[rel].add(row["category"])

    validation_screens = 0
    i18n_screens = 0
    missing_validation: list[str] = []
    missing_i18n: list[str] = []
    for rel in screen_rels:
        text = texts.get(rel, "")
        categories = called_by_file.get(rel, set())
        has_validation = "validation" in categories or bool(VALID_RE.search(text))
        has_i18n = "i18n" in categories or bool(I18N_RE.search(text))
        if has_validation:
            validation_screens += 1
        elif len(missing_validation) < 8:
            missing_validation.append(rel)
        if has_i18n:
            i18n_screens += 1
        elif KO_RE.search(text) and len(missing_i18n) < 8:
            missing_i18n.append(rel)

    screen_count = len(screen_rels)
    reused = sum(1 for row in functions if row["files"] >= 2)
    unused_rows = [row for row in functions if row["files"] == 0]
    used_rows = [row for row in functions if row["files"] > 0]
    unused_rows.sort(key=lambda row: (row["category"] != "validation", row["category"] != "i18n", row["name"].lower()))
    shown = used_rows[:USED_LIMIT] + unused_rows[:UNUSED_LIMIT]
    unused = len(unused_rows)
    list_truncated = len(used_rows) > USED_LIMIT or len(unused_rows) > UNUSED_LIMIT
    metrics = {
        "scanned_files": len(texts),
        "total_files": total,
        "common_files": len(common_rels),
        "screen_files": screen_count,
        "message_files": len(message_files),
        "common_functions": len(functions),
        "reused_functions": reused,
        "unused_functions": unused,
        "validation_screens": validation_screens,
        "i18n_screens": i18n_screens,
        "validation_rate": round(validation_screens / screen_count * 100, 1) if screen_count else None,
        "i18n_rate": round(i18n_screens / screen_count * 100, 1) if screen_count else None,
        "truncated": total >= MAX_FILES or list_truncated,
        "shown_unused": min(len(unused_rows), UNUSED_LIMIT),
    }
    yield _event({"type": "metrics", "metrics": metrics})
    yield _event(
        {
            "type": "done",
            "root": str(root),
            "metrics": metrics,
            "functions": shown,
            "gaps": {"missing_validation": missing_validation, "missing_i18n": missing_i18n},
        }
    )
