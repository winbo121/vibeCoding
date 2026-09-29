import { useState } from 'react'
import { Alert, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'

export default function Login() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('1234')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  if (isAuthenticated) return <Navigate to={location.state?.from || '/'} replace />

  const onSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await login(username, password)
      navigate(location.state?.from || '/', { replace: true })
    } catch (err) {
      setError(err.message || '로그인 실패')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Row className="justify-content-center">
      <Col md={7} lg={5}>
        <Card className="vc-card">
          <Card.Body className="p-4">
            <Card.Title as="h1" className="h3 mb-1">
              로그인
            </Card.Title>
            <Card.Subtitle className="mb-4 text-secondary">
              관리자 admin/1234 · 일반 user/1234
            </Card.Subtitle>
            <Form onSubmit={onSubmit}>
              <Form.Group className="mb-3" controlId="loginUsername">
                <Form.Label>아이디</Form.Label>
                <Form.Control
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoFocus
                />
              </Form.Group>
              <Form.Group className="mb-3" controlId="loginPassword">
                <Form.Label>비밀번호</Form.Label>
                <Form.Control
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </Form.Group>
              {error && <Alert variant="danger">{error}</Alert>}
              <div className="d-grid">
                <Button type="submit" className="btn-brand" disabled={saving}>
                  {saving ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      로그인 중…
                    </>
                  ) : (
                    '로그인'
                  )}
                </Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  )
}
