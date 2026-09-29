import { Button, Card, Col, Row } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth'

export default function Home() {
  const { isAuthenticated, user } = useAuth()

  return (
    <>
      <Card className="vc-hero mb-4">
        <Card.Body className="p-4 p-md-5">
          <div className="text-uppercase small fw-semibold opacity-75 mb-2">Vibe Coding Workspace</div>
          <h1 className="display-5 fw-bold mb-3">VibeCoding</h1>
          <p className="lead mb-4">
            {isAuthenticated
              ? `${user?.name || user?.username}님, 상단 메뉴에서 기능을 선택하세요.`
              : '로그인하지 않은 상태의 메인 화면입니다. 관리 기능은 로그인 후 이용할 수 있습니다.'}
          </p>
          {!isAuthenticated && (
            <Button as={Link} to="/login" variant="light" size="lg">
              로그인하기
            </Button>
          )}
        </Card.Body>
      </Card>

      <Row className="g-3">
        <Col md={6}>
          <Card className="vc-card h-100">
            <Card.Body>
              <Card.Title>사용자 / 권한</Card.Title>
              <Card.Text className="text-secondary mb-0">
                사용자 CRUD와 메뉴 권한 매핑을 관리합니다.
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="vc-card h-100">
            <Card.Body>
              <Card.Title>FAQ / 게시판</Card.Title>
              <Card.Text className="text-secondary mb-0">
                FAQ와 파일 첨부 게시판으로 콘텐츠를 운영합니다.
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  )
}
