"""Kakao Local place search proxy + map JS key for company picker."""

from __future__ import annotations

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth import get_current_user
from app.config import settings
from app.models import User

router = APIRouter(prefix="/places", tags=["places"])

KAKAO_KEYWORD_URL = "https://dapi.kakao.com/v2/local/search/keyword.json"


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
    q: str = Query(..., min_length=1, max_length=100, description="회사/장소 검색어"),
    size: int = Query(default=10, ge=1, le=15),
    _: User = Depends(get_current_user),
):
    api_key = (settings.kakao_rest_api_key or "").strip()
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="카카오 REST API 키가 설정되지 않았습니다. backend/.env 의 KAKAO_REST_API_KEY 를 확인하세요.",
        )

    try:
        with httpx.Client(timeout=10.0) as client:
            res = client.get(
                KAKAO_KEYWORD_URL,
                params={"query": q.strip(), "size": size},
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

    payload = res.json()
    documents = payload.get("documents") or []
    places = []
    for doc in documents:
        name = (doc.get("place_name") or "").strip()
        if not name:
            continue
        road = (doc.get("road_address_name") or "").strip()
        jibun = (doc.get("address_name") or "").strip()
        address = road or jibun
        places.append(
            {
                "id": doc.get("id"),
                "name": name,
                "address": address,
                "category": (doc.get("category_name") or "").strip() or None,
                "phone": (doc.get("phone") or "").strip() or None,
                "url": (doc.get("place_url") or "").strip() or None,
                "x": float(doc["x"]) if doc.get("x") else None,  # lng
                "y": float(doc["y"]) if doc.get("y") else None,  # lat
            }
        )
    return places
