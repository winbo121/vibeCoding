import { useEffect, useMemo, useRef, useState } from 'react'
import { Badge, Button, Form, InputGroup, ListGroup } from 'react-bootstrap'
import { api } from '../api'

function splitSkills(raw) {
  if (!raw) return []
  return raw
    .split(/[,/|·;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function joinSkills(list) {
  return list.join(', ')
}

export default function SkillAutocomplete({
  value,
  onChange,
  placeholder = '기술 검색 (한글/영어) — 예: 파이썬, java, react',
  disabled = false,
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const [loading, setLoading] = useState(false)
  const wrapRef = useRef(null)
  const inputRef = useRef(null)
  const timerRef = useRef(null)

  const selected = useMemo(() => splitSkills(value), [value])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    const q = query.trim()
    if (!q) {
      setResults([])
      setLoading(false)
      return undefined
    }
    setLoading(true)
    timerRef.current = setTimeout(() => {
      api
        .suggestSkills(q, 12)
        .then((rows) => {
          const filtered = (rows || []).filter(
            (r) => !selected.some((s) => s.toLowerCase() === String(r.value).toLowerCase()),
          )
          setResults(filtered)
          setActiveIdx(0)
          setOpen(true)
        })
        .catch(() => setResults([]))
        .finally(() => setLoading(false))
    }, 150)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [query, selected])

  useEffect(() => {
    const onDoc = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const addSkill = (skill) => {
    const name = String(skill || '').trim()
    if (!name) return
    if (selected.some((s) => s.toLowerCase() === name.toLowerCase())) {
      setQuery('')
      setOpen(false)
      return
    }
    onChange(joinSkills([...selected, name]))
    setQuery('')
    setResults([])
    setOpen(false)
    inputRef.current?.focus()
  }

  const removeSkill = (skill) => {
    onChange(joinSkills(selected.filter((s) => s.toLowerCase() !== skill.toLowerCase())))
  }

  const onKeyDown = (e) => {
    if (e.key === 'Backspace' && !query && selected.length > 0) {
      removeSkill(selected[selected.length - 1])
      return
    }
    if (!open || results.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault()
        // 검색 결과 없이 Enter면 쿼리 자체를 추가 시도(서버 정규화에 맡김)
        if (query.trim()) addSkill(query.trim())
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => (i + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => (i - 1 + results.length) % results.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      addSkill(results[activeIdx].value)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="skill-search" ref={wrapRef}>
      {selected.length > 0 && (
        <div className="skill-search-tags mb-2">
          {selected.map((skill) => (
            <Badge key={skill} bg="primary" className="skill-search-tag">
              {skill}
              {!disabled && (
                <button
                  type="button"
                  className="skill-search-tag-x"
                  aria-label={`${skill} 제거`}
                  onClick={() => removeSkill(skill)}
                >
                  ×
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      <InputGroup>
        <InputGroup.Text className="bg-white">
          <i className="bi bi-search" />
        </InputGroup.Text>
        <Form.Control
          ref={inputRef}
          type="search"
          value={query}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => {
            if (query.trim() && results.length) setOpen(true)
          }}
          onKeyDown={onKeyDown}
        />
        {query && (
          <Button
            type="button"
            variant="outline-secondary"
            disabled={disabled}
            onClick={() => {
              setQuery('')
              setResults([])
              setOpen(false)
              inputRef.current?.focus()
            }}
          >
            지우기
          </Button>
        )}
      </InputGroup>

      {open && query.trim() && (
        <ListGroup className="skill-search-dropdown shadow-sm">
          {loading && (
            <ListGroup.Item className="text-secondary small py-2">검색 중…</ListGroup.Item>
          )}
          {!loading && results.length === 0 && (
            <ListGroup.Item
              action
              className="py-2"
              onMouseDown={(e) => {
                e.preventDefault()
                addSkill(query.trim())
              }}
            >
              <span className="fw-semibold">&quot;{query.trim()}&quot;</span>
              <span className="small text-secondary ms-2">그대로 추가</span>
            </ListGroup.Item>
          )}
          {!loading &&
            results.map((row, idx) => (
              <ListGroup.Item
                key={row.value}
                action
                active={idx === activeIdx}
                className="py-2"
                onMouseDown={(e) => {
                  e.preventDefault()
                  addSkill(row.value)
                }}
              >
                <div className="d-flex justify-content-between gap-2 align-items-baseline">
                  <span className="fw-semibold">{row.label}</span>
                  {row.hint && (
                    <span className="small opacity-75 text-truncate">유사: {row.hint}</span>
                  )}
                </div>
              </ListGroup.Item>
            ))}
        </ListGroup>
      )}

      <Form.Text className="text-secondary">
        한글·영어 모두 검색 가능합니다. 결과를 클릭하면 기술스택에 추가됩니다.
      </Form.Text>
    </div>
  )
}
