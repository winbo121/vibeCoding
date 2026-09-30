const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api'

function authHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request(path, options = {}) {
  const headers = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json; charset=utf-8' }),
    ...authHeaders(),
    ...(options.headers || {}),
  }
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (res.status === 204) return null
  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  if (!res.ok) {
    const detail = data?.detail || data || `요청 실패 (${res.status})`
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail))
  }
  return data
}

export const api = {
  login: (username, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  me: () => request('/auth/me'),
  myPrograms: () => request('/auth/my-programs'),
  updateProfile: (body) => request('/auth/profile', { method: 'PUT', body: JSON.stringify(body) }),
  suggestSkills: (q, limit = 12) => {
    const qs = new URLSearchParams()
    if (q) qs.set('q', q)
    qs.set('limit', String(limit))
    return request(`/skills/suggest?${qs.toString()}`)
  },
  skillDictionary: () => request('/skills/dictionary'),
  skillStats: () => request('/skills/stats'),

  listUsers: () => request('/users'),
  createUser: (body) => request('/users', { method: 'POST', body: JSON.stringify(body) }),
  updateUser: (id, body) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),

  listPrograms: () => request('/programs'),
  createProgram: (body) => request('/programs', { method: 'POST', body: JSON.stringify(body) }),
  updateProgram: (id, body) => request(`/programs/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteProgram: (id) => request(`/programs/${id}`, { method: 'DELETE' }),
  listUserPrograms: () => request('/user-programs'),
  assignUserPrograms: (userId, programIds) =>
    request(`/user-programs/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ program_ids: programIds }),
    }),

  listFaqs: () => request('/faqs'),
  createFaq: (body) => request('/faqs', { method: 'POST', body: JSON.stringify(body) }),
  updateFaq: (id, body) => request(`/faqs/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteFaq: (id) => request(`/faqs/${id}`, { method: 'DELETE' }),

  listPosts: () => request('/board'),
  getPost: (id) => request(`/board/${id}`),
  createPost: (formData) => request('/board', { method: 'POST', body: formData }),
  updatePost: (id, formData) => request(`/board/${id}`, { method: 'PUT', body: formData }),
  deletePost: (id) => request(`/board/${id}`, { method: 'DELETE' }),
  deleteFile: (id) => request(`/board/files/${id}`, { method: 'DELETE' }),
  downloadUrl: (id) => `${API_BASE}/board/files/${id}/download`,

  listJobs: (params = {}) => {
    const qs = new URLSearchParams()
    if (params.q) qs.set('q', params.q)
    if (params.source) qs.set('source', params.source)
    // true/false 모두 명시 전송 (미전송 시 서버가 스택 있으면 맞춤만 기본 적용)
    if (params.match_only === true) qs.set('match_only', 'true')
    if (params.match_only === false) qs.set('match_only', 'false')
    const query = qs.toString()
    return request(`/jobs${query ? `?${query}` : ''}`)
  },
  getJob: (id) => request(`/jobs/${id}`),
  listJobSources: () => request('/jobs/sources'),
  syncJobs: (source = 'sample', params = {}) => {
    const qs = new URLSearchParams({ source })
    if (params.keywords) qs.set('keywords', params.keywords)
    if (params.count) qs.set('count', String(params.count))
    return request(`/jobs/sync?${qs.toString()}`, { method: 'POST' })
  },

  placesConfig: () => request('/places/config'),
  searchPlaces: (q, size = 10, mode = 'keyword') => {
    const qs = new URLSearchParams({ q, size: String(size), mode })
    return request(`/places/search?${qs.toString()}`)
  },
  analyzeProject: async (path, onEvent, signal) => {
    const res = await fetch(`${API_BASE}/analyzer/scan`, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        ...authHeaders(),
      },
      body: JSON.stringify({ path }),
    })
    if (!res.ok) {
      const text = await res.text()
      let detail = text
      try {
        detail = JSON.parse(text)?.detail || text
      } catch {
        /* keep text */
      }
      throw new Error(typeof detail === 'string' ? detail : '분석에 실패했습니다.')
    }
    const reader = res.body?.getReader()
    if (!reader) throw new Error('분석 스트림을 열 수 없습니다.')
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const chunks = buffer.split('\n\n')
      buffer = chunks.pop() || ''
      for (const chunk of chunks) {
        const line = chunk.split('\n').find((row) => row.startsWith('data:'))
        if (!line) continue
        onEvent(JSON.parse(line.slice(5).trim()))
      }
    }
  },
  nearbyFood: (params = {}) => {
    const qs = new URLSearchParams()
    if (params.x != null) qs.set('x', String(params.x))
    if (params.y != null) qs.set('y', String(params.y))
    if (params.radius != null) qs.set('radius', String(params.radius))
    const query = qs.toString()
    return request(`/places/nearby-food${query ? `?${query}` : ''}`)
  },
}

export async function downloadFile(fileId, filename) {
  const res = await fetch(api.downloadUrl(fileId), { headers: authHeaders() })
  if (!res.ok) throw new Error('다운로드 실패')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || 'download'
  a.click()
  URL.revokeObjectURL(url)
}
