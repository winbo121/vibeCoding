import {
  Badge,
  Button,
  Container,
  Nav,
  Navbar,
  Stack,
} from 'react-bootstrap'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'

const ADMIN_MENU_CODES = new Set(['USERS', 'USER_PROGRAMS'])

const FALLBACK_MENUS = [
  { code: 'USERS', name: '사용자관리', path: '/users', icon: 'bi-people' },
  { code: 'USER_PROGRAMS', name: '메뉴관리', path: '/user-programs', icon: 'bi-grid-1x2' },
  { code: 'FAQS', name: 'FAQ', path: '/faqs', icon: 'bi-question-circle' },
  { code: 'BOARD', name: '게시판', path: '/board', icon: 'bi-journal-richtext' },
]

const MENU_ICONS = {
  USERS: 'bi-people',
  USER_PROGRAMS: 'bi-grid-1x2',
  FAQS: 'bi-question-circle',
  BOARD: 'bi-journal-richtext',
}

export default function Layout() {
  const { user, programs, logout, isAuthenticated, isAdmin } = useAuth()
  const navigate = useNavigate()
  const baseMenus = programs.length ? programs : isAuthenticated ? FALLBACK_MENUS : []
  const menus = isAdmin ? baseMenus : baseMenus.filter((m) => !ADMIN_MENU_CODES.has(m.code))

  const onLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="app-frame">
      <Navbar expand="lg" className="vc-navbar" sticky="top">
        <Container>
          <Navbar.Brand as={NavLink} to="/">
            Vibe<span>Coding</span>
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="vc-nav" />
          <Navbar.Collapse id="vc-nav">
            <Nav className="mx-auto my-2 my-lg-0">
              {isAuthenticated &&
                menus.map((m) => (
                  <Nav.Link key={m.code || m.path} as={NavLink} to={m.path} end={m.path === '/'}>
                    <i className={`bi ${MENU_ICONS[m.code] || 'bi-lightning-charge'} me-1`} />
                    {m.name}
                  </Nav.Link>
                ))}
            </Nav>
            <Stack direction="horizontal" gap={2} className="ms-lg-auto flex-wrap">
              {isAuthenticated ? (
                <>
                  <Navbar.Text className="me-1">
                    <Badge pill className={`me-1 ${isAdmin ? 'vc-role-admin' : 'vc-role-user'}`}>
                      <i className={`bi ${isAdmin ? 'bi-shield-check' : 'bi-person'} me-1`} />
                      {isAdmin ? '관리자' : '일반'}
                    </Badge>
                    <Badge bg="light" text="dark" pill>
                      {user?.name || user?.username}
                    </Badge>
                  </Navbar.Text>
                  <Button variant="outline-light" size="sm" className="rounded-pill" onClick={onLogout}>
                    <i className="bi bi-box-arrow-right me-1" />
                    로그아웃
                  </Button>
                </>
              ) : (
                <Button as={NavLink} to="/login" className="btn-accent" size="sm">
                  <i className="bi bi-box-arrow-in-right me-1" />
                  로그인
                </Button>
              )}
            </Stack>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      <Container className="vc-page flex-grow-1">
        <Outlet />
      </Container>
    </div>
  )
}
