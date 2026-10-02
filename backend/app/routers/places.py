"""Kakao Local place search proxy + map JS key for company picker / nearby food."""

from __future__ import annotations

import math

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.config import settings
from app.database import get_db
from app.models import FoodPick, User

router = APIRouter(prefix="/places", tags=["places"])

KAKAO_KEYWORD_URL = "https://dapi.kakao.com/v2/local/search/keyword.json"
KAKAO_CATEGORY_URL = "https://dapi.kakao.com/v2/local/search/category.json"
KAKAO_ADDRESS_URL = "https://dapi.kakao.com/v2/local/search/address.json"
# 카카오 로컬: FD6 = 음식점
FOOD_CATEGORY = "FD6"


def _kakao_key() -> str:
    api_key = (settings.kakao_rest_api_key or "").strip()
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="카카오 REST API 키가 설정되지 않았습니다. backend/.env 의 KAKAO_REST_API_KEY 를 확인하세요.",
        )
    return api_key


def _docs_to_places(documents: list) -> list[dict]:
    places = []
    for doc in documents:
        name = (doc.get("place_name") or "").strip()
        if not name:
            continue
        road = (doc.get("road_address_name") or "").strip()
        jibun = (doc.get("address_name") or "").strip()
        address = road or jibun
        distance = doc.get("distance")
        places.append(
            {
                "id": doc.get("id"),
                "name": name,
                "address": address,
                "category": (doc.get("category_name") or "").strip() or None,
                "phone": (doc.get("phone") or "").strip() or None,
                "url": (doc.get("place_url") or "").strip() or None,
                "x": float(doc["x"]) if doc.get("x") else None,
                "y": float(doc["y"]) if doc.get("y") else None,
                "distance_m": int(distance) if distance not in (None, "") else None,
            }
        )
    return places


def _address_docs_to_places(documents: list) -> list[dict]:
    places = []
    for idx, doc in enumerate(documents):
        road = doc.get("road_address") or {}
        jibun = doc.get("address") or {}
        address = (
            (road.get("address_name") if isinstance(road, dict) else None)
            or doc.get("address_name")
            or (jibun.get("address_name") if isinstance(jibun, dict) else None)
            or ""
        ).strip()
        if not address:
            continue
        building = (road.get("building_name") if isinstance(road, dict) else None) or ""
        building = building.strip()
        name = building or address
        places.append(
            {
                "id": f"addr-{doc.get('x')}-{doc.get('y')}-{idx}",
                "name": name,
                "address": address,
                "category": "주소",
                "phone": None,
                "url": None,
                "x": float(doc["x"]) if doc.get("x") else None,
                "y": float(doc["y"]) if doc.get("y") else None,
                "distance_m": None,
            }
        )
    return places


def _merge_places(*groups: list[dict], limit: int = 15) -> list[dict]:
    merged: list[dict] = []
    seen: set[str] = set()
    for group in groups:
        for place in group:
            key = str(place.get("id") or f"{place.get('name')}:{place.get('x')}:{place.get('y')}")
            if key in seen:
                continue
            seen.add(key)
            merged.append(place)
            if len(merged) >= limit:
                return merged
    return merged


def _search_addresses(query: str, size: int) -> list[dict]:
    """집주소용: 주소 API + 키워드(아파트/건물) 검색을 합친다."""
    q = query.strip()
    addr_rows = _address_docs_to_places(
        (_kakao_request(KAKAO_ADDRESS_URL, {"query": q, "size": size}).get("documents") or [])
    )
    keyword_rows = _kakao_get(KAKAO_KEYWORD_URL, {"query": q, "size": size})
    return _merge_places(addr_rows, keyword_rows, limit=size)


def _kakao_request(url: str, params: dict) -> dict:
    api_key = _kakao_key()
    try:
        with httpx.Client(timeout=10.0) as client:
            res = client.get(
                url,
                params=params,
                headers={"Authorization": f"KakaoAK {api_key}"},
            )
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"카카오 장소 검색 네트워크 오류: {exc}",
        ) from exc

    if res.status_code == 401:
        raise HTTPException(status_code=502, detail="카카오 API 인증 실패. REST 키를 확인하세요.")
    if res.status_code >= 400:
        raise HTTPException(
            status_code=502,
            detail=f"카카오 장소 검색 실패 (HTTP {res.status_code})",
        )
    return res.json()


def _kakao_get(url: str, params: dict) -> list[dict]:
    return _docs_to_places((_kakao_request(url, params).get("documents") or []))


def _haversine_m(lng1: float, lat1: float, lng2: float, lat2: float) -> int:
    """두 좌표 사이 거리(m)."""
    r = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return int(round(2 * r * math.asin(min(1.0, math.sqrt(a)))))


def _offset_lng_lat(lng: float, lat: float, distance_m: float, bearing_deg: float) -> tuple[float, float]:
    """원점에서 bearing 방향으로 distance_m 이동한 좌표."""
    r = 6371000.0
    brng = math.radians(bearing_deg)
    lat1 = math.radians(lat)
    lng1 = math.radians(lng)
    lat2 = math.asin(
        math.sin(lat1) * math.cos(distance_m / r)
        + math.cos(lat1) * math.sin(distance_m / r) * math.cos(brng)
    )
    lng2 = lng1 + math.atan2(
        math.sin(brng) * math.sin(distance_m / r) * math.cos(lat1),
        math.cos(distance_m / r) - math.sin(lat1) * math.sin(lat2),
    )
    return math.degrees(lng2), math.degrees(lat2)


def _search_points(origin_x: float, origin_y: float, radius: int) -> list[tuple[float, float, int]]:
    """
    중심 + 주변 샘플 지점.
    반환: (lng, lat, 해당 지점 검색 반경)
    """
    points: list[tuple[float, float, int]] = [(origin_x, origin_y, radius)]
    # 반경의 약 55% 지점에서 추가 검색 → 멀리 있는 맛집도 포함
    ring = max(200, int(radius * 0.55))
    local_r = max(300, int(radius * 0.5))
    for bearing in (0, 45, 90, 135, 180, 225, 270, 315):
        lng, lat = _offset_lng_lat(origin_x, origin_y, ring, bearing)
        points.append((lng, lat, local_r))
    return points


def _collect_at_point(
    client: httpx.Client,
    api_key: str,
    cx: float,
    cy: float,
    search_radius: int,
    pages: int,
) -> list[dict]:
    rows: list[dict] = []
    # 카테고리(음식점) + 키워드(맛집) 병행
    queries = [
        ("category", {"category_group_code": FOOD_CATEGORY}),
        ("keyword", {"query": "맛집"}),
    ]
    for kind, base in queries:
        url = KAKAO_CATEGORY_URL if kind == "category" else KAKAO_KEYWORD_URL
        for page in range(1, pages + 1):
            params = {
                **base,
                "x": cx,
                "y": cy,
                "radius": search_radius,
                "size": 15,
                "page": page,
                "sort": "distance",
            }
            try:
                res = client.get(url, params=params, headers={"Authorization": f"KakaoAK {api_key}"})
            except httpx.HTTPError:
                break
            if res.status_code >= 400:
                break
            payload = res.json()
            docs = payload.get("documents") or []
            if not docs:
                break
            rows.extend(_docs_to_places(docs))
            if (payload.get("meta") or {}).get("is_end"):
                break
    return rows


def _fetch_nearby_food(origin_x: float, origin_y: float, radius: int) -> list[dict]:
    """
    중심·주변 여러 지점에서 검색한 뒤, 회사(원점) 기준 실거리로 필터/정렬.
    카카오가 가까운 곳만 편중해서 주는 문제를 완화한다.
    """
    api_key = _kakao_key()
    pages = 2 if radius <= 1000 else 3
    collected: dict[str, dict] = {}

    with httpx.Client(timeout=12.0) as client:
        for cx, cy, search_r in _search_points(origin_x, origin_y, radius):
            for place in _collect_at_point(client, api_key, cx, cy, search_r, pages):
                if place.get("x") is None or place.get("y") is None:
                    continue
                # 원점(회사)까지의 실제 거리로 재산정
                real_dist = _haversine_m(origin_x, origin_y, float(place["x"]), float(place["y"]))
                if real_dist > radius:
                    continue
                place = {**place, "distance_m": real_dist}
                key = str(place.get("id") or f"{place['name']}:{place['x']}:{place['y']}")
                prev = collected.get(key)
                if prev is None or (place["distance_m"] or 10**9) < (prev.get("distance_m") or 10**9):
                    collected[key] = place

    foods = list(collected.values())
    foods.sort(key=lambda p: p.get("distance_m") if p.get("distance_m") is not None else 10**9)
    return foods


def _resolve_company_coords(company: str) -> tuple[float, float, dict]:
    rows = _kakao_get(
        KAKAO_KEYWORD_URL,
        {"query": company.strip(), "size": 5},
    )
    if not rows:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f'회사 "{company}" 위치를 찾지 못했습니다. 프로필의 현직장을 확인하세요.',
        )
    match = next((r for r in rows if r["name"] == company.strip()), rows[0])
    if match.get("x") is None or match.get("y") is None:
        raise HTTPException(status_code=404, detail="회사 좌표를 확인할 수 없습니다.")
    return float(match["x"]), float(match["y"]), match


@router.get("/config")
def places_config(_: User = Depends(get_current_user)):
    rest = bool((settings.kakao_rest_api_key or "").strip())
    js_key = (settings.kakao_js_key or "").strip()
    return {
        "provider": "kakao",
        "search_ready": rest,
        "map_ready": bool(js_key),
        "kakao_js_key": js_key or None,
        "hint": (
            None
            if rest
            else "backend/.env 에 KAKAO_REST_API_KEY 를 설정하고, 지도는 KAKAO_JS_KEY + 카카오 개발자 콘솔 도메인 등록이 필요합니다."
        ),
    }


@router.get("/search")
def search_places(
    q: str = Query(..., min_length=1, max_length=100, description="회사/장소/주소 검색어"),
    size: int = Query(default=10, ge=1, le=15),
    mode: str = Query(default="keyword", pattern="^(keyword|address)$"),
    _: User = Depends(get_current_user),
):
    if mode == "address":
        return _search_addresses(q.strip(), size)
    return _kakao_get(KAKAO_KEYWORD_URL, {"query": q.strip(), "size": size})


@router.get("/nearby-food")
def nearby_food(
    x: float | None = Query(default=None, description="경도 (관리자 현위치)"),
    y: float | None = Query(default=None, description="위도 (관리자 현위치)"),
    radius: int = Query(default=300, ge=100, le=20000, description="검색 반경(m)"),
    user: User = Depends(get_current_user),
):
    """회사(일반) 또는 현위치(관리자) 주변 음식점 검색."""
    is_admin = (user.role or "") == "admin"
    origin_name = None
    origin_address = None

    if is_admin:
        if x is None or y is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="관리자는 브라우저 현위치(경도·위도)가 필요합니다.",
            )
        origin_x, origin_y = float(x), float(y)
        origin_name = "현재 위치"
    else:
        company = (user.company or "").strip()
        if not company:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="현직장이 없습니다. 프로필에서 회사를 먼저 등록하세요.",
            )
        origin_x, origin_y, company_place = _resolve_company_coords(company)
        origin_name = company_place.get("name") or company
        origin_address = company_place.get("address")

    foods = _fetch_nearby_food(origin_x, origin_y, radius)

    return {
        "origin": {
            "name": origin_name,
            "address": origin_address,
            "x": origin_x,
            "y": origin_y,
            "mode": "geolocation" if is_admin else "company",
        },
        "radius": radius,
        "places": foods,
        "count": len(foods),
    }


class FoodPickIn(BaseModel):
    id: str = Field(min_length=1, max_length=40)
    name: str = Field(min_length=1, max_length=200)
    address: str | None = Field(default=None, max_length=300)
    category: str | None = Field(default=None, max_length=200)
    url: str | None = Field(default=None, max_length=500)
    phone: str | None = Field(default=None, max_length=40)
    x: float | None = None
    y: float | None = None


def popular_food_picks(db: Session, user: User, limit: int = 8) -> dict:
    """같은 회사(회사 없으면 전체)에서 저장 수가 많은 맛집."""
    company = (user.company or "").strip()
    scoped = bool(company) and (user.role or "") != "admin"
    count_col = func.count(FoodPick.id)
    stmt = select(
        FoodPick.place_id,
        func.max(FoodPick.name),
        func.max(FoodPick.address),
        func.max(FoodPick.category),
        func.max(FoodPick.url),
        func.max(FoodPick.phone),
        func.max(FoodPick.x),
        func.max(FoodPick.y),
        count_col,
    ).group_by(FoodPick.place_id)
    if scoped:
        stmt = stmt.where(FoodPick.company == company)
    rows = db.execute(stmt.order_by(count_col.desc(), func.max(FoodPick.name)).limit(limit)).all()
    saved_ids = set(
        db.scalars(select(FoodPick.place_id).where(FoodPick.user_id == user.id)).all()
    )
    items = [
        {
            "id": place_id,
            "name": name,
            "address": address,
            "category": category,
            "url": url,
            "phone": phone,
            "x": x,
            "y": y,
            "picks": int(picks or 0),
            "saved": place_id in saved_ids,
        }
        for place_id, name, address, category, url, phone, x, y, picks in rows
    ]
    return {
        "scope": "company" if scoped else "all",
        "company": company or None,
        "items": items,
        "saved_place_ids": sorted(saved_ids),
    }


def popular_food_text(db: Session, user: User) -> str:
    data = popular_food_picks(db, user, limit=5)
    items = data["items"]
    if data["scope"] == "company" and data["company"]:
        lead = f"「{data['company']}」 동료가 저장한 맛집입니다."
    else:
        lead = "지금까지 저장된 맛집 중 많이 고른 곳입니다."
    if not items:
        return (
            f"{lead}\n아직 저장된 맛집이 없습니다. "
            "회사 주변 맛집 목록에서 저장을 누르면 많이 고른 순으로 모입니다."
        )
    lines = [lead]
    for index, item in enumerate(items, start=1):
        where = f" · {item['address']}" if item.get("address") else ""
        lines.append(f"{index}. {item['name']} ({item['picks']}명){where}")
    lines.append("회사 주변 맛집에서 저장 버튼을 누르면 이 순위에 반영됩니다.")
    return "\n".join(lines)


@router.get("/food-picks")
def list_food_picks(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return popular_food_picks(db, user)


@router.post("/food-picks")
def save_food_pick(body: FoodPickIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    place_id = body.id.strip()
    existing = db.scalar(
        select(FoodPick).where(FoodPick.user_id == user.id, FoodPick.place_id == place_id)
    )
    company = (user.company or "").strip() or None
    if existing:
        existing.name = body.name.strip()
        existing.address = (body.address or "").strip() or None
        existing.category = (body.category or "").strip() or None
        existing.url = (body.url or "").strip() or None
        existing.phone = (body.phone or "").strip() or None
        existing.x = body.x
        existing.y = body.y
        if company:
            existing.company = company
    else:
        db.add(
            FoodPick(
                user_id=user.id,
                place_id=place_id,
                name=body.name.strip(),
                address=(body.address or "").strip() or None,
                category=(body.category or "").strip() or None,
                url=(body.url or "").strip() or None,
                phone=(body.phone or "").strip() or None,
                x=body.x,
                y=body.y,
                company=company,
            )
        )
    db.commit()
    return popular_food_picks(db, user)


@router.delete("/food-picks/{place_id}")
def delete_food_pick(place_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = db.scalar(select(FoodPick).where(FoodPick.user_id == user.id, FoodPick.place_id == place_id))
    if row:
        db.delete(row)
        db.commit()
    return popular_food_picks(db, user)
