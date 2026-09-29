import { useEffect, useState } from 'react'
import { Alert, Button, Card, Col, Form, Row, Stack } from 'react-bootstrap'
import { api } from '../api'
import { useAuth } from '../auth'
import SkillAutocomplete from '../components/SkillAutocomplete'

export default function Profile() {
  const { user, isAdmin, refreshUser } = useAuth()
  const [form, setForm] = useState({
    name: '',
    email: '',
    career_years: '',
    skills: '',
    gender: '',
    company: '',
  })
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) return
    setForm({
      name: user.name || '',
      email: user.email || '',
      career_years: user.career_years ?? '',
      skills: user.skills || '',
      gender: user.gender || '',
      company: user.company || '',
    })
  }, [user])

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setSaving(true)
    try {
      const body = {
        name: form.name,
        email: form.email || null,
      }
      if (!isAdmin) {
        body.career_years = form.career_years === '' ? null : Number(form.career_years)
        body.skills = form.skills.trim() || null
        body.gender = form.gender || null
        body.company = form.company.trim() || null
      }
      await api.updateProfile(body)
      const me = await refreshUser?.()
      if (me?.skills && me.skills !== form.skills.trim()) {
        setForm((f) => ({ ...f, skills: me.skills || '' }))
        setInfo(`저장되었습니다. 기술스택이 영문으로 정규화되었습니다: ${me.skills}`)
      } else {
        setInfo('저장되었습니다.')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Row className="justify-content-center">
      <Col lg={6}>
        <Card className="vc-card">
          <Card.Header>
            <i className="bi bi-person-badge me-2" />
            내 정보
          </Card.Header>
          <Card.Body>
            {error && <Alert variant="danger">{error}</Alert>}
            {info && <Alert variant="success">{info}</Alert>}
            {isAdmin && (
              <Alert variant="secondary">
                관리자 계정은 개발 년차·기술스택·성별·현직장 정보를 사용하지 않습니다.
              </Alert>
            )}
            <Form onSubmit={onSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>아이디</Form.Label>
                <Form.Control value={user?.username || ''} disabled />
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

              {!isAdmin && (
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
                    <Form.Control
                      value={form.company}
                      onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                      placeholder="현재 다니고 있는 회사"
                    />
                  </Form.Group>
                </>
              )}

              <Stack direction="horizontal" gap={2}>
                <Button type="submit" className="btn-brand" disabled={saving}>
                  저장
                </Button>
              </Stack>
            </Form>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  )
}
