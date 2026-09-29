import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Badge, Button, Form, InputGroup, ListGroup } from 'react-bootstrap'
import { api } from '../api'

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

export default function CompanyPlacePicker({ value, onChange, disabled = false }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [selected, setSelected] = useState(null)
  const [config, setConfig] = useState(null)
  const [error, setError] = useState('')
  const [searching, setSearching] = useState(false)
  const [mapError, setMapError] = useState('')
  const mapRef = useRef(null)
  const mapObj = useRef(null)
  const markersRef = useRef([])
  const infoRef = useRef(null)
  const onChangeRef = useRef(onChange)
  const hydrateRef = useRef('')

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

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

  const clearMarkers = () => {
    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = []
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
      const map = new kakao.maps.Map(mapRef.current, { center, level: 5 })
      mapObj.current = map
      setMapError('')
      return map
    } catch (err) {
      setMapError(err.message || '지도를 불러오지 못했습니다.')
      return null
    }
  }, [config])

  const showPlaceOnMap = useCallback(
    async (place) => {
      if (!place || place.x == null || place.y == null) return
      const map = await ensureMap()
      if (!map || !window.kakao?.maps) return

      const kakao = window.kakao
      clearMarkers()
      const pos = new kakao.maps.LatLng(place.y, place.x)
      const marker = new kakao.maps.Marker({ map, position: pos, title: place.name })
      markersRef.current = [marker]
      map.setCenter(pos)
      map.setLevel(3)

      const iw = new kakao.maps.InfoWindow({
        content: `<div style="padding:6px 10px;font-size:12px;"><strong>${place.name}</strong><br/>${
          place.address || ''
        }</div>`,
      })
      iw.open(map, marker)
      infoRef.current = iw
    },
    [ensureMap],
  )

  useEffect(() => {
    if (config?.map_ready) ensureMap()
  }, [config, ensureMap])

  // 선택된 장소(좌표 포함)는 항상 지도에 하나만 표시
  useEffect(() => {
    if (!selected) return
    showPlaceOnMap(selected)
  }, [selected, showPlaceOnMap])

  // 저장된 회사명만 있을 때 좌표를 찾아 복원
  useEffect(() => {
    const name = (value || '').trim()
    if (!name) {
      if (selected) setSelected(null)
      hydrateRef.current = ''
      clearMarkers()
      return
    }
    if (!config?.search_ready) return
    if (selected?.name === name) return
    if (hydrateRef.current === name) return
    hydrateRef.current = name
    let cancelled = false
    ;(async () => {
      try {
        const rows = await api.searchPlaces(name, 8)
        if (cancelled) return
        const match = rows.find((r) => r.name === name) || rows[0]
        if (!match) return
        setSelected(match)
      } catch {
        /* 복원 실패 시 검색으로 다시 선택 */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [config, value, selected])

  const pickPlace = useCallback(
    async (place) => {
      hydrateRef.current = place.name
      onChangeRef.current(place.name)
      setQuery('')
      setResults([])
      setError('')
      setSelected(place)
    },
    [],
  )

  const onSearch = async (e) => {
    e?.preventDefault?.()
    const q = query.trim()
    if (!q || disabled) return
    if (!config?.search_ready) {
      setError(config?.hint || '카카오 REST API 키가 필요합니다.')
      return
    }
    setSearching(true)
    setError('')
    try {
      const rows = await api.searchPlaces(q, 12)
      setResults(rows)
      if (rows.length === 0) {
        setError('검색 결과가 없습니다. 다른 키워드로 시도해 보세요.')
      }
      // 검색만 하고 자동 선택하지 않음. 이미 고른 회사는 지도에 유지
      if (selected) await showPlaceOnMap(selected)
    } catch (err) {
      setError(err.message)
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  const clearCompany = () => {
    onChange('')
    setSelected(null)
    setResults([])
    hydrateRef.current = ''
    clearMarkers()
  }

  if (config && !config.search_ready) {
    return (
      <div>
        <Form.Control
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder="회사명 직접 입력"
        />
        <Alert variant="warning" className="py-2 mt-2 mb-0 small">
          지도 검색을 쓰려면 <code>backend/.env</code>에 <code>KAKAO_REST_API_KEY</code>,{' '}
          <code>KAKAO_JS_KEY</code>를 넣고 백엔드를 재시작하세요. 카카오 개발자 콘솔에서 Web 도메인(
          localhost:5173, localhost:8080) 등록도 필요합니다.
        </Alert>
      </div>
    )
  }

  if (!config) {
    return <Form.Control value={value} disabled placeholder="장소 검색 준비 중…" />
  }

  return (
    <div className="company-place-picker">
      {(value || selected) && (
        <div className="company-place-selected mb-2">
          <Badge bg="primary" className="me-2">
            선택됨
          </Badge>
          <strong>{value || selected?.name}</strong>
          {(selected?.address || '').length > 0 && (
            <span className="text-secondary small ms-2">{selected.address}</span>
          )}
          {!disabled && (
            <Button type="button" size="sm" variant="link" className="ms-1" onClick={clearCompany}>
              지우기
            </Button>
          )}
        </div>
      )}

      <InputGroup className="mb-2">
        <InputGroup.Text className="bg-white">
          <i className="bi bi-geo-alt" />
        </InputGroup.Text>
        <Form.Control
          type="search"
          value={query}
          disabled={disabled || searching}
          placeholder="회사명 검색 (예: 카카오, 네이버, 삼성전자)"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onSearch()
            }
          }}
        />
        <Button
          type="button"
          className="btn-brand"
          disabled={disabled || searching || !query.trim()}
          onClick={onSearch}
        >
          {searching ? '검색 중…' : '검색'}
        </Button>
      </InputGroup>

      {error && (
        <Alert variant="danger" className="py-2 small">
          {error}
        </Alert>
      )}
      {mapError && (
        <Alert variant="warning" className="py-2 small">
          {mapError} (목록 클릭으로도 선택할 수 있습니다)
        </Alert>
      )}

      <div className="company-place-layout">
        <ListGroup className="company-place-list">
          {results.map((place) => (
            <ListGroup.Item
              key={place.id || `${place.name}-${place.x}-${place.y}`}
              action
              active={selected?.id === place.id || selected?.name === place.name}
              className="py-2"
              onClick={() => !disabled && pickPlace(place)}
            >
              <div className="fw-semibold">{place.name}</div>
              <div className="small text-secondary">{place.address}</div>
              {place.category && <div className="small text-muted">{place.category}</div>}
            </ListGroup.Item>
          ))}
          {!searching && results.length === 0 && (
            <ListGroup.Item className="text-secondary small py-3 text-center">
              {selected || value
                ? '다른 회사로 바꾸려면 검색 후 목록에서 하나를 고르세요.'
                : '회사명을 검색한 뒤 목록에서 하나만 선택하세요.'}
            </ListGroup.Item>
          )}
        </ListGroup>

        <div className="company-place-map-wrap">
          <div ref={mapRef} className="company-place-map" />
          {!config.map_ready && (
            <div className="company-place-map-fallback small text-secondary">
              지도 표시용 <code>KAKAO_JS_KEY</code>가 없습니다. 목록에서 선택만 가능합니다.
            </div>
          )}
        </div>
      </div>

      <Form.Text className="text-secondary">
        직장은 하나만 선택할 수 있습니다. 선택한 회사는 지도에 항상 표시됩니다.
      </Form.Text>
    </div>
  )
}
