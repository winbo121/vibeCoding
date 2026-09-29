import { useEffect, useState } from 'react'
import { Alert, Badge, Button, Card, Col, Form, ListGroup, Row, Stack } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { api, downloadFile } from '../api'

export default function Board() {
  const [rows, setRows] = useState([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [files, setFiles] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')

  const load = async () => {
    try {
      setRows(await api.listPosts())
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const reset = () => {
    setTitle('')
    setContent('')
    setFiles(null)
    setEditingId(null)
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const fd = new FormData()
    fd.append('title', title)
    fd.append('content', content)
    if (files) {
      Array.from(files).forEach((f) => fd.append('files', f))
    }
    try {
      if (editingId) await api.updatePost(editingId, fd)
      else await api.createPost(fd)
      reset()
      e.target.reset?.()
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const startEdit = (row) => {
    setEditingId(row.id)
    setTitle(row.title)
    setContent(row.content)
    setFiles(null)
  }

  const remove = async (id) => {
    if (!window.confirm('게시글을 삭제할까요?')) return
    try {
      await api.deletePost(id)
      if (editingId === id) reset()
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const removeFile = async (fileId) => {
    if (!window.confirm('첨부파일을 삭제할까요?')) return
    try {
      await api.deleteFile(fileId)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <Row className="g-3">
      <Col lg={4}>
        <Card className="vc-card">
          <Card.Header>{editingId ? '게시글 수정' : '게시글 등록'}</Card.Header>
          <Card.Body>
            <Form onSubmit={onSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>제목</Form.Label>
                <Form.Control value={title} onChange={(e) => setTitle(e.target.value)} required />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>내용</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={6}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>첨부파일</Form.Label>
                <Form.Control type="file" multiple onChange={(e) => setFiles(e.target.files)} />
              </Form.Group>
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
          <Card.Header>게시판 목록</Card.Header>
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
                      <Link to={`/board/${row.id}`} className="fw-semibold text-decoration-none">
                        {row.title}
                      </Link>
                      <div className="text-secondary small mt-1">
                        {row.author_name || row.author_id} · {new Date(row.created_at).toLocaleString()}
                      </div>
                      {row.files?.length > 0 && (
                        <div className="mt-2 d-flex flex-wrap gap-2">
                          {row.files.map((f) => (
                            <Badge key={f.id} bg="light" text="dark" className="file-chip border">
                              <Button
                                variant="link"
                                size="sm"
                                className="p-0 text-decoration-none"
                                onClick={() => downloadFile(f.id, f.original_name)}
                              >
                                {f.original_name}
                              </Button>
                              <Button
                                variant="link"
                                size="sm"
                                className="p-0 text-danger ms-1"
                                onClick={() => removeFile(f.id)}
                              >
                                ×
                              </Button>
                            </Badge>
                          ))}
                        </div>
                      )}
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
