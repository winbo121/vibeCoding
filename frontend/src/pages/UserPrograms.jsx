import { useEffect, useState } from 'react'
import { Alert, Button, Card, Col, Form, ListGroup, Row, Stack } from 'react-bootstrap'
import { api } from '../api'

const emptyProgram = {
  code: '',
  name: '',
  path: '/',
  description: '',
  sort_order: 0,
  is_active: true,
}

export default function UserPrograms() {
  const [programs, setPrograms] = useState([])
  const [assignments, setAssignments] = useState([])
  const [form, setForm] = useState(emptyProgram)
  const [editingId, setEditingId] = useState(null)
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [selectedProgramIds, setSelectedProgramIds] = useState([])
  const [error, setError] = useState('')

  const load = async () => {
    setError('')
    try {
      const [p, a] = await Promise.all([api.listPrograms(), api.listUserPrograms()])
      setPrograms(p)
      setAssignments(a)
      if (!selectedUserId && a[0]) {
        setSelectedUserId(a[0].user_id)
        setSelectedProgramIds(a[0].programs.map((x) => x.id))
      }
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const resetProgram = () => {
    setForm(emptyProgram)
    setEditingId(null)
  }

  const onProgramSubmit = async (e) => {
    e.preventDefault()
    try {
      const body = {
        ...form,
        sort_order: Number(form.sort_order) || 0,
        description: form.description || null,
      }
      if (editingId) await api.updateProgram(editingId, body)
      else await api.createProgram(body)
      resetProgram()
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const startEditProgram = (row) => {
    setEditingId(row.id)
    setForm({
      code: row.code,
      name: row.name,
      path: row.path,
      description: row.description || '',
      sort_order: row.sort_order,
      is_active: row.is_active,
    })
  }

  const removeProgram = async (id) => {
    if (!window.confirm('메뉴를 삭제할까요?')) return
    try {
      await api.deleteProgram(id)
      if (editingId === id) resetProgram()
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const selectUser = (row) => {
    setSelectedUserId(row.user_id)
    setSelectedProgramIds(row.programs.map((p) => p.id))
  }

  const toggleProgram = (id) => {
    setSelectedProgramIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const saveAssignment = async () => {
    if (!selectedUserId) return
    try {
      await api.assignUserPrograms(selectedUserId, selectedProgramIds)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <Row className="g-3">
      <Col lg={6}>
        <Card className="vc-card mb-3">
          <Card.Header>{editingId ? '메뉴 수정' : '메뉴 등록'}</Card.Header>
          <Card.Body>
            <Form onSubmit={onProgramSubmit}>
              <Row className="g-2">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>코드</Form.Label>
                    <Form.Control
                      value={form.code}
                      onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>이름</Form.Label>
                    <Form.Control
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={8}>
                  <Form.Group>
                    <Form.Label>경로</Form.Label>
                    <Form.Control
                      value={form.path}
                      onChange={(e) => setForm((f) => ({ ...f, path: e.target.value }))}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>정렬</Form.Label>
                    <Form.Control
                      type="number"
                      value={form.sort_order}
                      onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
                    />
                  </Form.Group>
                </Col>
                <Col xs={12}>
                  <Form.Group>
                    <Form.Label>설명</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Form.Check
                className="my-3"
                type="switch"
                id="menu-active"
                label="활성"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              />
              <Stack direction="horizontal" gap={2}>
                <Button type="submit" className="btn-brand">
                  {editingId ? '수정' : '등록'}
                </Button>
                {editingId && (
                  <Button type="button" variant="outline-secondary" onClick={resetProgram}>
                    취소
                  </Button>
                )}
              </Stack>
            </Form>
          </Card.Body>
        </Card>

        <Card className="vc-card">
          <Card.Header>메뉴 목록</Card.Header>
          <ListGroup variant="flush">
            {programs.map((p) => (
              <ListGroup.Item key={p.id} className="d-flex justify-content-between align-items-start gap-2">
                <div>
                  <div className="fw-semibold">
                    {p.name} <span className="text-secondary small">({p.code})</span>
                  </div>
                  <div className="text-secondary small">{p.path}</div>
                </div>
                <Stack direction="horizontal" gap={2}>
                  <Button size="sm" variant="outline-primary" onClick={() => startEditProgram(p)}>
                    수정
                  </Button>
                  <Button size="sm" variant="outline-danger" onClick={() => removeProgram(p.id)}>
                    삭제
                  </Button>
                </Stack>
              </ListGroup.Item>
            ))}
          </ListGroup>
        </Card>
      </Col>

      <Col lg={6}>
        <Card className="vc-card h-100">
          <Card.Header>메뉴관리</Card.Header>
          <Card.Body>
            {error && <Alert variant="danger">{error}</Alert>}
            <Row className="g-3">
              <Col md={5}>
                <h6 className="text-secondary">사용자</h6>
                <ListGroup>
                  {assignments.map((a) => (
                    <ListGroup.Item
                      key={a.user_id}
                      action
                      active={selectedUserId === a.user_id}
                      onClick={() => selectUser(a)}
                    >
                      {a.username}
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </Col>
              <Col md={7}>
                <h6 className="text-secondary">할당 메뉴</h6>
                <div className="mb-3">
                  {programs.map((p) => (
                    <Form.Check
                      key={p.id}
                      type="checkbox"
                      id={`assign-${p.id}`}
                      className="mb-2"
                      label={p.name}
                      checked={selectedProgramIds.includes(p.id)}
                      onChange={() => toggleProgram(p.id)}
                    />
                  ))}
                </div>
                <Button className="btn-brand" onClick={saveAssignment} disabled={!selectedUserId}>
                  권한 저장
                </Button>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  )
}
