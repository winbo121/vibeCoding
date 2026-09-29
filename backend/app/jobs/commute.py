"""집주소 ↔ 채용공고 회사 위치 출퇴근 거리/시간."""

from __future__ import annotations

import math
import re
from functools import lru_cache

import httpx

from app.config import settings

KAKAO_KEYWORD_URL = "https://dapi.kakao.com/v2/local/search/keyword.json"
KAKAO_ADDRESS_URL = "https://dapi.kakao.com/v2/local/search/address.json"
KAKAO_TRANSIT_URL = "https://dapi.kakao.com/v2/routing/publictraffic"
KAKAO_CAR_URL = "https://apis-navi.kakaomobility.com/v1/directions"

# 도심 평균 이동 속도(추정용, km/h)
ESTIMATE_SPEED_KMH = 25.0
ROAD_FACTOR = 1.35


def _api_key() -> str:
    return (settings.kakao_rest_api_key or "").strip()


def _kakao_get(url: str, params: dict) -> dict | None:
    api_key = _api_key()
    if not api_key:
        return None
    try:
        with httpx.Client(timeout=8.0) as client:
            res = client.get(url, params=params, headers={"Authorization": f"KakaoAK {api_key}"})
        if res.status_code >= 400:
            return None
        return res.json()
    except httpx.HTTPError:
        return None


def haversine_m(lng1: float, lat1: float, lng2: float, lat2: float) -> int:
    r = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return int(round(2 * r * math.asin(min(1.0, math.sqrt(a)))))


def clean_location(location: str | None) -> str:
    text = (location or "").strip()
    if not text:
        return ""
    text = re.split(r"[·•|/]", text, maxsplit=1)[0]
    text = re.sub(r"(재택|원격|하이브리드|원격근무).*$", "", text, flags=re.IGNORECASE)
    return text.strip(" ,.-")


def _from_keyword_docs(documents: list) -> dict | None:
    for doc in documents or []:
        name = (doc.get("place_name") or "").strip()
        road = (doc.get("road_address_name") or "").strip()
        jibun = (doc.get("address_name") or "").strip()
        if not doc.get("x") or not doc.get("y"):
            continue
        return {
            "name": name or road or jibun,
            "address": road or jibun or name,
            "x": float(doc["x"]),
            "y": float(doc["y"]),
        }
    return None


def _from_address_docs(documents: list) -> dict | None:
    for doc in documents or []:
        if not doc.get("x") or not doc.get("y"):
            continue
        road = doc.get("road_address") or {}
        jibun = doc.get("address") or {}
        address = (
            (road.get("address_name") if isinstance(road, dict) else None)
            or doc.get("address_name")
            or (jibun.get("address_name") if isinstance(jibun, dict) else None)
            or ""
        ).strip()
        building = (road.get("building_name") if isinstance(road, dict) else None) or ""
        building = building.strip()
        if not address and not building:
            continue
        return {
            "name": building or address,
            "address": address or building,
            "x": float(doc["x"]),
            "y": float(doc["y"]),
        }
    return None


@lru_cache(maxsize=256)
def geocode(query: str) -> dict | None:
    q = (query or "").strip()
    if not q or not _api_key():
        return None
    addr = _kakao_get(KAKAO_ADDRESS_URL, {"query": q, "size": 5})
    hit = _from_address_docs((addr or {}).get("documents") or [])
    if hit:
        return hit
    kw = _kakao_get(KAKAO_KEYWORD_URL, {"query": q, "size": 5})
    return _from_keyword_docs((kw or {}).get("documents") or [])


def geocode_workplace(company: str | None, location: str | None) -> dict | None:
    company = (company or "").strip()
    loc = clean_location(location)
    candidates = []
    if company and loc:
        candidates.append(f"{company} {loc}")
        candidates.append(f"{loc} {company}")
    if company:
        candidates.append(company)
    if loc:
        candidates.append(loc)
    for q in candidates:
        hit = geocode(q)
        if hit:
            return hit
    return None


def _transit_route(ox: float, oy: float, dx: float, dy: float) -> dict | None:
    payload = _kakao_get(
        KAKAO_TRANSIT_URL,
        {
            "start_x": str(ox),
            "start_y": str(oy),
            "end_x": str(dx),
            "end_y": str(dy),
        },
    )
    if not payload:
        return None
    status = (payload.get("status") or "").upper()
    routes = payload.get("routes") or []
    if status and status != "OK" and not routes:
        return None
    best = None
    for route in routes:
        props = route.get("properties") or route
        dist = props.get("totalDistance")
        dur = props.get("totalTime")
        if dist is None or dur is None:
            continue
        item = {
            "distance_m": int(dist),
            "duration_sec": int(dur),
            "mode": "transit",
            "transfers": props.get("transfers"),
            "route_type": props.get("type"),
        }
        if best is None or item["duration_sec"] < best["duration_sec"]:
            best = item
    return best


def _car_route(ox: float, oy: float, dx: float, dy: float) -> dict | None:
    api_key = _api_key()
    if not api_key:
        return None
    try:
        with httpx.Client(timeout=8.0) as client:
            res = client.get(
                KAKAO_CAR_URL,
                params={
                    "origin": f"{ox},{oy}",
                    "destination": f"{dx},{dy}",
                    "priority": "TIME",
                    "summary": "true",
                },
                headers={"Authorization": f"KakaoAK {api_key}"},
            )
        if res.status_code >= 400:
            return None
        payload = res.json()
    except (httpx.HTTPError, ValueError):
        return None

    routes = payload.get("routes") or []
    if not routes:
        return None
    summary = (routes[0].get("summary") or {}) if isinstance(routes[0], dict) else {}
    dist = summary.get("distance")
    dur = summary.get("duration")
    if dist is None or dur is None:
        return None
    return {
        "distance_m": int(dist),
        "duration_sec": int(dur),
        "mode": "car",
        "transfers": None,
        "route_type": None,
    }


def _estimate_route(ox: float, oy: float, dx: float, dy: float) -> dict:
    straight = haversine_m(ox, oy, dx, dy)
    road = int(round(straight * ROAD_FACTOR))
    duration = int(round((road / 1000.0) / ESTIMATE_SPEED_KMH * 3600))
    return {
        "distance_m": road,
        "duration_sec": max(60, duration),
        "mode": "estimate",
        "transfers": None,
        "route_type": None,
    }


@lru_cache(maxsize=512)
def route_between(ox: float, oy: float, dx: float, dy: float) -> dict:
    """좌표 쌍에 대해 대중교통 → 자동차 → 추정 순으로 출퇴근 정보."""
    ox, oy, dx, dy = round(ox, 5), round(oy, 5), round(dx, 5), round(dy, 5)
    for getter in (_transit_route, _car_route):
        hit = getter(ox, oy, dx, dy)
        if hit:
            return hit
    return _estimate_route(ox, oy, dx, dy)


def commute_info(home_address: str | None, company: str | None, location: str | None) -> dict | None:
    home = (home_address or "").strip()
    if not home:
        return None
    origin = geocode(home)
    if not origin:
        return {
            "distance_m": None,
            "duration_sec": None,
            "mode": None,
            "workplace_name": None,
            "available": False,
            "message": "집주소를 지도에서 찾을 수 없습니다.",
        }
    workplace = geocode_workplace(company, location)
    if not workplace:
        return {
            "distance_m": None,
            "duration_sec": None,
            "mode": None,
            "workplace_name": None,
            "available": False,
            "message": "회사 위치를 찾을 수 없습니다.",
        }
    route = route_between(origin["x"], origin["y"], workplace["x"], workplace["y"])
    return {
        **route,
        "workplace_name": workplace.get("name") or workplace.get("address"),
        "available": True,
        "message": None,
    }
