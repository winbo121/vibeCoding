import { useEffect, useState } from 'react'
import { Alert, Badge, Button, Card, Col, Form, ListGroup, Row, Stack } from 'react-bootstrap'
import { api } from '../api'

const empty = { question: '', answer: '', sort_order: 0, is_published: true }

export default function Faqs() {
  const [rows, setRows] = useState([])
  const [form, setForm] = useState(empty)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')

  const load = async () => {
    try {
      setRows(await api.listFaqs())
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

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const body = { ...form, sort_order: Number(form.sort_order) || 0 }
      if (editingId) await api.updateFaq(editingId, body)
      else await api.createFaq(body)
      reset()
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const startEdit = (row) => {
    setEditingId(row.id)
    setForm({
      question: row.question,
      answer: row.answer,
      sort_order: row.sort_order,
      is_published: row.is_published,
    })
  }

  const remove = async (id) => {
    if (!window.confirm('삭제할까요?')) return
    try {
      await api.deleteFaq(id)
      if (editingId === id) reset()
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <Row className="g-3">
      <Col lg={4}>
        <Card className="vc-card">
          <Card.Header>
            <i className="bi bi-question-circle me-2" />
            {editingId ? 'FAQ 수정' : 'FAQ 등록'}
          </Card.Header>
          <Card.Body>
            <Form onSubmit={onSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>질문</Form.Label>
                <Form.Control
                  value={form.question}
                  onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>답변</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={5}
                  value={form.answer}
                  onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))}
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>정렬</Form.Label>
                <Form.Control
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
                />
              </Form.Group>
              <Form.Check
                className="mb-3"
                type="switch"
                id="faq-published"
                label="공개"
                checked={form.is_published}
                onChange={(e) => setForm((f) => ({ ...f, is_published: e.target.checked }))}
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
            <i className="bi bi-card-checklist me-2" />
            FAQ 목록
          </Card.Header>
          <Card.Body className="p-0">
            {error && (
              <Alert variant="danger" className="m-3">
                {error}
              </Alert>
            )}
            <ListGroup variant="flush">
              {rows.map((row) => (
                <ListGroup.Item key={row.id}>
                  <div className="d-flex justify-content-between gap-3">
                    <div>
                      <div className="fw-semibold mb-1">
                        {row.question}{' '}
                        <Badge bg={row.is_published ? 'success' : 'secondary'}>
                          {row.is_published ? '공개' : '비공개'}
                        </Badge>
                      </div>
                      <div className="text-secondary">{row.answer}</div>
                    </div>
                    <Stack direction="horizontal" gap={2} className="align-items-start">
                      <Button size="sm" variant="outline-primary" onClick={() => startEdit(row)}>
                        수정
                      </Button>
                      <Button size="sm" variant="outline-danger" onClick={() => remove(row.id)}>
                        삭제
                      </Button>
                    </Stack>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  )
}
