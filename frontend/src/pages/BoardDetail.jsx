import { useEffect, useState } from 'react'
import { Alert, Button, Card, ListGroup } from 'react-bootstrap'
import { Link, useParams } from 'react-router-dom'
import { api, downloadFile } from '../api'

export default function BoardDetail() {
  const { id } = useParams()
  const [post, setPost] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .getPost(id)
      .then(setPost)
      .catch((err) => setError(err.message))
  }, [id])

  if (error) return <Alert variant="danger">{error}</Alert>
  if (!post) return <Alert variant="light" className="border">불러오는 중…</Alert>

  return (
    <Card className="vc-card">
      <Card.Body className="p-4">
        <Button as={Link} to="/board" variant="link" className="px-0 mb-2">
          ← 목록
        </Button>
        <h1 className="h3 mb-2">{post.title}</h1>
        <div className="text-secondary mb-4">
          {post.author_name} · {new Date(post.created_at).toLocaleString()}
        </div>
        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{post.content}</div>
        {post.files?.length > 0 && (
          <>
            <hr />
            <h2 className="h6">첨부파일</h2>
            <ListGroup>
              {post.files.map((f) => (
                <ListGroup.Item key={f.id} className="d-flex justify-content-between align-items-center">
                  <span>
                    {f.original_name} <span className="text-secondary small">({f.size} bytes)</span>
                  </span>
                  <Button
                    size="sm"
                    variant="outline-primary"
                    onClick={() => downloadFile(f.id, f.original_name)}
                  >
                    다운로드
                  </Button>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </>
        )}
      </Card.Body>
    </Card>
  )
}
