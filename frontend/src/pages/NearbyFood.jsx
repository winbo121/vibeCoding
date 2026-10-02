import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Badge, Button, Card, Col, Form, ListGroup, Row, Stack } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'

let kakaoScriptPromise = null

function loadKakaoSdk(appKey) {
  if (!appKey) return Promise.reject(new Error('카카오 JS 키가 없습니다.'))
  if (window.kakao?.maps) return Promise.resolve(window.kakao)
  if (kakaoScriptPromise) return kakaoScriptPromise

  kakaoScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-kakao-maps="1"]')
    if (existing) {
      const done = () => window.kakao.maps.load(() => resolve(window.kakao))
      if (window.kakao?.maps) done()
      else existing.addEventListener('load', done)
      return
    }
    const script = document.createElement('script')
    script.dataset.kakaoMaps = '1'
    script.async = true
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&autoload=false`
    script.onload = () => {
      if (!window.kakao?.maps) {
        reject(new Error('카카오 지도 SDK 로드 실패'))
        return
      }
      window.kakao.maps.load(() => resolve(window.kakao))
    }
    script.onerror = () => reject(new Error('카카오 지도 스크립트를 불러오지 못했습니다.'))
    document.head.appendChild(script)
  })
  return kakaoScriptPromise
}

function formatDistance(m) {
  if (m == null) return ''
  if (m < 1000) return `${m}m`
  return `${(m / 1000).toFixed(1)}km`
}

/** 반경별 지도 확대 레벨 (작을수록 가까움) */
function levelForRadius(m) {
  if (m <= 300) return 2
  if (m <= 500) return 3
  if (m <= 1000) return 4
  if (m <= 2000) return 4
  return 5
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('이 브라우저는 위치 정보를 지원하지 않습니다.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(new Error(err.message || '현위치를 가져오지 못했습니다.')),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    )
  })
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export default function NearbyFood() {
  const { user, isAdmin } = useAuth()
  const hasCompany = Boolean((user?.company || '').trim())
  const canUse = isAdmin || hasCompany

  const [config, setConfig] = useState(null)
  const [radius, setRadius] = useState(300)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mapError, setMapError] = useState('')
  const [payload, setPayload] = useState(null)
  const [selected, setSelected] = useState(null)
  const [picks, setPicks] = useState(null)
  const [pickBusy, setPickBusy] = useState('')

  const mapRef = useRef(null)
  const mapObj = useRef(null)
  const markersRef = useRef([])
  const infoRef = useRef(null)
  const originMarkerRef = useRef(null)
  const circleRef = useRef(null)
  const requestIdRef = useRef(0)
  const geoCacheRef = useRef(null)
  const initialLoadedRef = useRef(false)

  const loadPicks = useCallback(async () => {
    try {
      setPicks(await api.foodPicks())
    } catch {
      setPicks(null)
    }
  }, [])

  useEffect(() => {
    if (canUse) loadPicks()
  }, [canUse, loadPicks])

  const savedIds = new Set((picks?.saved_place_ids || []).map(String))
  const pickCountOf = (placeId) =>
    picks?.items?.find((item) => String(item.id) === String(placeId))?.picks

  const onToggleSave = async (place, event) => {
    event.stopPropagation()
    if (!place?.id || pickBusy) return
    setPickBusy(String(place.id))
    setError('')
    try {
      const data = savedIds.has(String(place.id))
        ? await api.deleteFoodPick(place.id)
        : await api.saveFoodPick(place)
      setPicks(data)
    } catch (err) {
      setError(err.message || '맛집 저장에 실패했습니다.')
    } finally {
      setPickBusy('')
    }
  }

  const focusPlace = (place) => {
    if (!place || !payload?.origin) return
    const current = payload.places || []
    const match = current.find((item) => String(item.id) === String(place.id))
    const shown = match || { ...place, distance_m: null }
    const places = match ? current : [...current, shown]
    setSelected(shown)
    showOnMap(payload.origin, places, shown, payload.radius)
  }

  useEffect(() => {
    api
      .placesConfig()
      .then(setConfig)
      .catch(() =>
        setConfig({
          search_ready: false,
          map_ready: false,
          hint: '장소 검색 설정을 불러오지 못했습니다.',
        }),
      )
  }, [])

  const clearMapLayers = () => {
    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = []
    if (originMarkerRef.current) {
      originMarkerRef.current.setMap(null)
      originMarkerRef.current = null
    }
    if (circleRef.current) {
      circleRef.current.setMap(null)
      circleRef.current = null
    }
    if (infoRef.current) {
      infoRef.current.close()
      infoRef.current = null
    }
  }

  const ensureMap = useCallback(async () => {
    if (!config?.map_ready || !config.kakao_js_key || !mapRef.current) return null
    if (mapObj.current) return mapObj.current
    try {
      const kakao = await loadKakaoSdk(config.kakao_js_key)
      const center = new kakao.maps.LatLng(37.5665, 126.978)
      const map = new kakao.maps.Map(mapRef.current, { center, level: 4 })
      mapObj.current = map
      setMapError('')
      return map
    } catch (err) {
      setMapError(err.message || '지도를 불러오지 못했습니다.')
      return null
    }
  }, [config])

  const showOnMap = useCallback(
    async (origin, places, focusPlace, searchRadius) => {
      const map = await ensureMap()
      if (!map || !window.kakao?.maps || !origin) return
      const kakao = window.kakao
      clearMapLayers()

      const originPos = new kakao.maps.LatLng(origin.y, origin.x)
      const originLabel = origin.mode === 'company' ? '내 회사' : '현위치'

      // 회사/현위치: 빨간 큰 마커 + 높은 zIndex
      const originImage = new kakao.maps.MarkerImage(
        'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_red.png',
        new kakao.maps.Size(44, 49),
        { offset: new kakao.maps.Point(22, 49) },
      )
      const originMarker = new kakao.maps.Marker({
        map,
        position: originPos,
        title: origin.name || originLabel,
        image: originImage,
        zIndex: 10,
      })
      originMarkerRef.current = originMarker

      const circle = new kakao.maps.Circle({
        center: originPos,
        radius: searchRadius || 300,
        strokeWeight: 2,
        strokeColor: '#0f766e',
        strokeOpacity: 0.9,
        strokeStyle: 'solid',
        fillColor: '#14b8a6',
        fillOpacity: 0.12,
        zIndex: 1,
      })
      circle.setMap(map)
      circleRef.current = circle

      const originIw = new kakao.maps.InfoWindow({
        content: `<div style="padding:8px 12px;min-width:140px;font-size:12px;line-height:1.4;">
          <div style="color:#b91c1c;font-weight:700;margin-bottom:2px;">📍 ${escapeHtml(originLabel)}</div>
          <strong>${escapeHtml(origin.name || '')}</strong>
          ${origin.address ? `<div style="color:#64748b;margin-top:2px;">${escapeHtml(origin.address)}</div>` : ''}
          <div style="color:#0f766e;margin-top:4px;">검색 반경 ${formatDistance(searchRadius)}</div>
        </div>`,
        zIndex: 20,
      })
      originIw.open(map, originMarker)
      infoRef.current = originIw

      kakao.maps.event.addListener(originMarker, 'click', () => {
        if (infoRef.current) infoRef.current.close()
        originIw.open(map, originMarker)
        infoRef.current = originIw
        setSelected(null)
      })

      const bounds = new kakao.maps.LatLngBounds()
      bounds.extend(originPos)

      ;(places || []).forEach((p) => {
        if (p.x == null || p.y == null) return
        const pos = new kakao.maps.LatLng(p.y, p.x)
        const marker = new kakao.maps.Marker({
          map,
          position: pos,
          title: p.name,
          zIndex: 3,
        })
        kakao.maps.event.addListener(marker, 'click', () => {
          setSelected(p)
          const iw = new kakao.maps.InfoWindow({
            content: `<div style="padding:6px 10px;font-size:12px;"><strong>${escapeHtml(
              p.name,
            )}</strong><br/>${escapeHtml(p.address || '')}${
              p.distance_m != null ? `<br/>${formatDistance(p.distance_m)}` : ''
            }</div>`,
          })
          if (infoRef.current) infoRef.current.close()
          iw.open(map, marker)
          infoRef.current = iw
        })
        markersRef.current.push(marker)
      })

      // 회사 중심으로 가깝게 (원 전체 setBounds 하면 너무 멀어짐)
      map.setCenter(originPos)
      map.setLevel(levelForRadius(searchRadius || 300))

      if (focusPlace?.x != null && focusPlace?.y != null) {
        const marker = markersRef.current.find((m) => m.getTitle() === focusPlace.name)
        if (marker) {
          const iw = new kakao.maps.InfoWindow({
            content: `<div style="padding:6px 10px;font-size:12px;"><strong>${escapeHtml(
              focusPlace.name,
            )}</strong><br/>${escapeHtml(focusPlace.address || '')}</div>`,
          })
          if (infoRef.current) infoRef.current.close()
          iw.open(map, marker)
          infoRef.current = iw
          map.panTo(new kakao.maps.LatLng(focusPlace.y, focusPlace.x))
        }
      }
    },
    [ensureMap],
  )

  const loadFood = useCallback(
    async (radiusOverride) => {
      if (!canUse) return
      if (!config?.search_ready) {
        setError(config?.hint || '카카오 REST API 키가 필요합니다.')
        return
      }
      const usedRadius = Number(radiusOverride ?? radius) || 300
      const reqId = ++requestIdRef.current
      setLoading(true)
      setError('')
      try {
        let params = { radius: usedRadius }
        if (isAdmin) {
          let pos = geoCacheRef.current
          if (!pos) {
            pos = await getCurrentPosition()
            geoCacheRef.current = pos
          }
          params = { ...params, x: pos.lng, y: pos.lat }
        }
        const data = await api.nearbyFood(params)
        if (reqId !== requestIdRef.current) return
        setPayload(data)
        setSelected(null)
        await showOnMap(data.origin, data.places, null, data.radius || usedRadius)
      } catch (err) {
        if (reqId !== requestIdRef.current) return
        setError(err.message || '검색에 실패했습니다.')
        setPayload(null)
        setSelected(null)
      } finally {
        if (reqId === requestIdRef.current) setLoading(false)
      }
    },
    [canUse, config, isAdmin, radius, showOnMap],
  )

  // 최초 1회만 자동 검색 (반경 변경은 onChange / 버튼에서 처리)
  useEffect(() => {
    if (!config?.search_ready || !canUse || initialLoadedRef.current) return
    initialLoadedRef.current = true
    loadFood(radius)
  }, [config?.search_ready, canUse, loadFood, radius])

  const onRadiusChange = (e) => {
    const next = Number(e.target.value)
    setRadius(next)
    loadFood(next)
  }

  const onRefresh = () => {
    // 관리자: 현위치 다시 받기
    if (isAdmin) geoCacheRef.current = null
    loadFood(radius)
  }

  if (!canUse) {
    return (
      <Card className="vc-panel border-0 shadow-sm">
        <Card.Body>
          <h1 className="h4 mb-2">회사 주변 맛집</h1>
          <Alert variant="warning" className="mb-3">
            현직장이 등록되어 있지 않아 이 기능을 사용할 수 없습니다.
          </Alert>
          <Button as={Link} to="/profile" className="btn-brand">
            프로필에서 현직장 등록하기
          </Button>
        </Card.Body>
      </Card>
    )
  }

  return (
    <div className="nearby-food-page">
      <Stack direction="horizontal" className="justify-content-between flex-wrap gap-2 mb-3">
        <div>
          <h1 className="h4 mb-1">회사 주변 맛집</h1>
          <div className="text-secondary small">
            {isAdmin
              ? '관리자 계정은 브라우저 현위치 기준으로 검색합니다.'
              : `현직장 「${user.company}」 주변 음식점을 찾습니다.`}
          </div>
        </div>
        <Stack direction="horizontal" gap={2} className="flex-wrap">
          <Form.Select
            value={radius}
            onChange={onRadiusChange}
            style={{ width: 'auto' }}
            disabled={loading}
          >
            <option value={300}>반경 300m</option>
            <option value={500}>반경 500m</option>
            <option value={1000}>반경 1km</option>
            <option value={2000}>반경 2km</option>
            <option value={3000}>반경 3km</option>
          </Form.Select>
          <Button className="btn-brand" disabled={loading} onClick={onRefresh}>
            {loading ? '검색 중…' : isAdmin ? '현위치로 다시 찾기' : '다시 찾기'}
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert variant="danger" className="py-2">
          {error}
        </Alert>
      )}
      {mapError && (
        <Alert variant="warning" className="py-2">
          {mapError}
        </Alert>
      )}
      {config && !config.search_ready && (
        <Alert variant="warning" className="py-2">
          {config.hint}
        </Alert>
      )}

      <div className="nearby-food-rank mb-3">
        <div className="fw-semibold mb-2">
          {picks?.scope === 'company' && picks.company
            ? `「${picks.company}」에서 많이 고른 맛집`
            : '많이 고른 맛집'}
        </div>
        {(picks?.items || []).length === 0 ? (
          <div className="small text-secondary">목록에서 저장하면 많이 고른 순으로 여기에 모입니다.</div>
        ) : (
          <div className="nearby-food-rank-list">
            {picks.items.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className="nearby-food-rank-item"
                onClick={() => focusPlace(item)}
              >
                <span className="nearby-food-rank-no">{index + 1}</span>
                <span className="nearby-food-rank-copy">
                  <strong>{item.name}</strong>
                  {item.address ? <span>{item.address}</span> : null}
                </span>
                <Badge bg="light" text="dark">
                  {item.picks}명
                </Badge>
              </button>
            ))}
          </div>
        )}
      </div>

      {payload?.origin && (
        <div className="nearby-food-origin mb-3">
          <Badge bg="danger" className="me-2">
            {payload.origin.mode === 'company' ? '내 회사' : '현위치'}
          </Badge>
          <strong>{payload.origin.name}</strong>
          {payload.origin.address && (
            <span className="text-secondary small ms-2">{payload.origin.address}</span>
          )}
          <Badge bg="teal" className="ms-2 nearby-food-radius-badge">
            반경 {formatDistance(payload.radius)}
          </Badge>
          <span className="text-secondary small ms-2">
            · 맛집 {payload.places?.length || 0}곳
            {payload.places?.length
              ? ` (최근접 ${formatDistance(payload.places[0].distance_m)} ~ 최원접 ${formatDistance(
                  payload.places[payload.places.length - 1].distance_m,
                )})`
              : ''}
          </span>
        </div>
      )}

      <Row className="g-3">
        <Col lg={5}>
          <ListGroup className="nearby-food-list shadow-sm">
            {(payload?.places || []).map((place) => (
              <ListGroup.Item
                key={place.id || `${place.name}-${place.x}`}
                action
                active={selected?.id === place.id}
                className="py-2"
                onClick={() => {
                  setSelected(place)
                  showOnMap(payload.origin, payload.places, place, payload.radius)
                }}
              >
                <div className="d-flex justify-content-between align-items-start gap-2">
                  <div className="fw-semibold">{place.name}</div>
                  <Stack direction="horizontal" gap={1} className="flex-shrink-0">
                    {pickCountOf(place.id) ? (
                      <Badge bg="light" text="dark">
                        {pickCountOf(place.id)}명
                      </Badge>
                    ) : null}
                    {place.distance_m != null && (
                      <Badge bg="light" text="dark">
                        {formatDistance(place.distance_m)}
                      </Badge>
                    )}
                    <Button
                      size="sm"
                      variant={savedIds.has(String(place.id)) ? 'success' : 'outline-success'}
                      className="nearby-food-save"
                      disabled={!place.id || pickBusy === String(place.id)}
                      onClick={(event) => onToggleSave(place, event)}
                    >
                      {savedIds.has(String(place.id)) ? '저장됨' : '저장'}
                    </Button>
                  </Stack>
                </div>
                <div className="small text-secondary">{place.address}</div>
                {place.category && <div className="small text-muted">{place.category}</div>}
                {place.url && (
                  <a
                    href={place.url}
                    target="_blank"
                    rel="noreferrer"
                    className="small"
                    onClick={(e) => e.stopPropagation()}
                  >
                    카카오맵에서 보기
                  </a>
                )}
              </ListGroup.Item>
            ))}
            {!loading && payload && (payload.places || []).length === 0 && (
              <ListGroup.Item className="text-secondary text-center py-4">
                반경 내 음식점이 없습니다. 반경을 넓혀 보세요.
              </ListGroup.Item>
            )}
            {!payload && !loading && (
              <ListGroup.Item className="text-secondary text-center py-4">
                검색 버튼을 눌러 맛집을 찾아 보세요.
              </ListGroup.Item>
            )}
          </ListGroup>
        </Col>
        <Col lg={7}>
          <div className="nearby-food-map-wrap shadow-sm">
            <div ref={mapRef} className="nearby-food-map" />
            {!config?.map_ready && (
              <div className="nearby-food-map-fallback small text-secondary">
                지도 표시용 JS 키가 없습니다. 목록만 이용할 수 있습니다.
              </div>
            )}
          </div>
          <div className="small text-secondary mt-2">
            지도의 <span className="text-danger fw-semibold">빨간 마커</span>가 회사(또는 현위치)이고, 초록 원이 검색
            반경입니다. 반경을 바꾸면 자동으로 다시 검색합니다.
          </div>
        </Col>
      </Row>
    </div>
  )
}
