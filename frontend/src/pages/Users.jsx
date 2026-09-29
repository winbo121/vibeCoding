import { useEffect, useState } from 'react'
import { Alert, Button, Card, Col, Form, Row, Stack, Table } from 'react-bootstrap'
import { api } from '../api'
import SkillAutocomplete from '../components/SkillAutocomplete'
import CompanyPlacePicker from '../components/CompanyPlacePicker'

const empty = {
  username: '',
  password: '',
  name: '',
  email: '',
  role: 'user',
  is_active: true,
  career_years: '',
  skills: '',
  gender: '',
  company: '',
}

function genderLabel(value) {
  if (value === 'male') return '남'
  if (value === 'female') return '여'
  return '-'
}

export default function Users() {
  const [rows, setRows] = useState([])
  const [form, setForm] = useState(empty)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')

  const load = async () => {
    setError('')
    try {
      setRows(await api.listUsers())
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const reset = () => {
    setForm(empty)
    setEditingId(null)
  }

  const onRoleChange = (role) => {
    if (role === 'admin') {
      setForm((f) => ({
        ...f,
        role,
        career_years: '',
        skills: '',
        gender: '',
        company: '',
      }))
      return
    }
    setForm((f) => ({ ...f, role }))
  }

  const profilePayload = () => {
    if (form.role === 'admin') {
      return {
        career_years: null,
        skills: null,
        gender: null,
        company: null,
      }
    }
    return {
      career_years: form.career_years === '' ? null : Number(form.career_years),
      skills: form.skills.trim() || null,
      gender: form.gender || null,
      company: form.company.trim() || null,
    }
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const profile = profilePayload()
      if (editingId) {
        const body = {
          name: form.name,
          email: form.email || null,
          role: form.role,
          is_active: form.is_active,
          ...profile,
        }
        if (form.password) body.password = form.password
        await api.updateUser(editingId, body)
      } else {
        await api.createUser({
          username: form.username,
          password: form.password,
          name: form.name,
          email: form.email || null,
          role: form.role,
          is_active: form.is_active,
          ...profile,
        })
      }
      reset()
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const startEdit = (row) => {
    setEditingId(row.id)
    setForm({
      username: row.username,
      password: '',
      name: row.name || '',
      email: row.email || '',
      role: row.role || 'user',
      is_active: row.is_active,
      career_years: row.career_years ?? '',
      skills: row.skills || '',
      gender: row.gender || '',
      company: row.company || '',
    })
  }

  const remove = async (id) => {
    if (!window.confirm('삭제할까요?')) return
    try {
      await api.deleteUser(id)
      if (editingId === id) reset()
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const isUserRole = form.role === 'user'

  return (
    <Row className="g-3">
      <Col lg={4}>
        <Card className="vc-card">
          <Card.Header>
            <i className="bi bi-person-plus me-2" />
            {editingId ? '사용자 수정' : '사용자 등록'}
          </Card.Header>
          <Card.Body>
            <Form onSubmit={onSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>아이디</Form.Label>
                <Form.Control
                  value={form.username}
                  disabled={!!editingId}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                  required={!editingId}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>비밀번호 {editingId ? '(변경 시만)' : ''}</Form.Label>
                <Form.Control
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  required={!editingId}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>이름</Form.Label>
                <Form.Control
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>이메일</Form.Label>
                <Form.Control
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>권한</Form.Label>
                <Form.Select value={form.role} onChange={(e) => onRoleChange(e.target.value)}>
                  <option value="user">일반 사용자</option>
                  <option value="admin">관리자</option>
                </Form.Select>
                {form.role === 'admin' && (
                  <Form.Text className="text-secondary">
                    관리자는 년차·기술스택·성별·현직장 정보가 저장되지 않습니다.
                  </Form.Text>
                )}
              </Form.Group>

              {isUserRole && (
                <>
                  <Form.Group className="mb-3">
                    <Form.Label>개발 년차</Form.Label>
                    <Form.Control
                      type="number"
                      min={0}
                      max={50}
                      value={form.career_years}
                      onChange={(e) => setForm((f) => ({ ...f, career_years: e.target.value }))}
                      placeholder="예: 3"
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>기술 스택</Form.Label>
                    <SkillAutocomplete
                      value={form.skills}
                      onChange={(skills) => setForm((f) => ({ ...f, skills }))}
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>성별</Form.Label>
                    <Form.Select
                      value={form.gender}
                      onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                    >
                      <option value="">선택</option>
                      <option value="male">남</option>
                      <option value="female">여</option>
                    </Form.Select>
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>현직장</Form.Label>
                    <CompanyPlacePicker
                      value={form.company}
                      onChange={(company) => setForm((f) => ({ ...f, company }))}
                    />
                  </Form.Group>
                </>
              )}

              <Form.Check
                className="mb-3"
                type="switch"
                id="user-active"
                label="활성"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              />
              <Stack direction="horizontal" gap={2}>
                <Button type="submit" className="btn-brand">
                  {editingId ? '수정' : '등록'}
                </Button>
                {editingId && (
                  <Button type="button" variant="outline-secondary" onClick={reset}>
                    취소
                  </Button>
                )}
              </Stack>
            </Form>
          </Card.Body>
        </Card>
      </Col>
      <Col lg={8}>
        <Card className="vc-card">
          <Card.Header>
            <i className="bi bi-people me-2" />
            사용자 목록
          </Card.Header>
          <Card.Body>
            {error && <Alert variant="danger">{error}</Alert>}
            <div className="table-responsive">
              <Table hover className="align-middle mb-0">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>아이디</th>
                    <th>이름</th>
                    <th>권한</th>
                    <th>년차</th>
                    <th>성별</th>
                    <th>현직장</th>
                    <th>활성</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.id}</td>
                      <td>{row.username}</td>
                      <td>{row.name}</td>
                      <td>{row.role === 'admin' ? '관리자' : '일반'}</td>
                      <td>{row.role === 'admin' ? '-' : (row.career_years ?? '-')}</td>
                      <td>{row.role === 'admin' ? '-' : genderLabel(row.gender)}</td>
                      <td>{row.role === 'admin' ? '-' : (row.company || '-')}</td>
                      <td>{row.is_active ? 'Y' : 'N'}</td>
                      <td className="text-end">
                        <Stack direction="horizontal" gap={2} className="justify-content-end">
                          <Button size="sm" variant="outline-primary" onClick={() => startEdit(row)}>
                            수정
                          </Button>
                          <Button size="sm" variant="outline-danger" onClick={() => remove(row.id)}>
                            삭제
                          </Button>
                        </Stack>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  )
}
