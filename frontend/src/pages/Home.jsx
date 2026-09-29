import { Button, Card, Col, Row } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth'

export default function Home() {
  const { isAuthenticated, user, isAdmin } = useAuth()

  return (
    <>
      <Card className="vc-hero mb-4 border-0">
        <Card.Body className="p-4 p-md-5">
          <div className="eyebrow mb-3">
            <i className="bi bi-sparkles" />
            Vibe Coding Workspace
          </div>
          <h1 className="brand-mark">VibeCoding</h1>
          <p className="lead mb-4">
            {isAuthenticated
              ? `${user?.name || user?.username}님, ${isAdmin ? '관리자' : '일반'} 권한으로 접속 중입니다. 상단 메뉴에서 기능을 선택하세요.`
              : '로그인하지 않은 상태의 메인 화면입니다. 관리 기능은 로그인 후 이용할 수 있습니다.'}
          </p>
          {!isAuthenticated && (
            <Button as={Link} to="/login" className="btn-accent btn-lg">
              <i className="bi bi-rocket-takeoff me-2" />
              로그인하고 시작하기
            </Button>
          )}
        </Card.Body>
      </Card>

      <Row className="g-3 g-lg-4">
        <Col md={6}>
          <Card className="vc-feature tone-a h-100">
            <Card.Body className="p-4">
              <div className="icon-blob">
                <i className="bi bi-people-fill" />
              </div>
              <Card.Title className="fw-bold">사용자 / 권한</Card.Title>
              <Card.Text className="text-secondary mb-0">
                관리자는 사용자 CRUD와 메뉴 권한을 관리하고, 일반 사용자는 허용된 메뉴만 이용합니다.
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="vc-feature tone-b h-100">
            <Card.Body className="p-4">
              <div className="icon-blob">
                <i className="bi bi-journal-bookmark-fill" />
              </div>
              <Card.Title className="fw-bold">FAQ / 게시판</Card.Title>
              <Card.Text className="text-secondary mb-0">
                FAQ와 파일 첨부 게시판으로 콘텐츠를 등록·수정·삭제하고 자료를 주고받습니다.
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={12}>
          <Card className="vc-feature tone-a h-100">
            <Card.Body className="p-4">
              <div className="icon-blob">
                <i className="bi bi-briefcase-fill" />
              </div>
              <Card.Title className="fw-bold">입사지원 찾기</Card.Title>
              <Card.Text className="text-secondary mb-0">
                개발자 채용공고를 리스트로 조회합니다. 샘플 데이터로 시작하며, 이후 사람인·잡코리아 공식
                API를 같은 구조로 연결할 수 있습니다.
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  )
}
