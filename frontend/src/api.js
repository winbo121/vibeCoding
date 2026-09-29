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
