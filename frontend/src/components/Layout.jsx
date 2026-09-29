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
  { code: 'USERS', name: '사용자관리', path: '/users' },
  { code: 'USER_PROGRAMS', name: '메뉴관리', path: '/user-programs' },
  { code: 'FAQS', name: 'FAQ', path: '/faqs' },
  { code: 'BOARD', name: '게시판', path: '/board' },
]

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
    <div className="min-vh-100 d-flex flex-column">
      <Navbar expand="lg" className="vc-navbar" sticky="top">
        <Container>
          <Navbar.Brand as={NavLink} to="/">
            VibeCoding
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="vc-nav" className="border-light" />
          <Navbar.Collapse id="vc-nav">
            <Nav className="mx-auto my-2 my-lg-0">
              {isAuthenticated &&
                menus.map((m) => (
                  <Nav.Link key={m.code || m.path} as={NavLink} to={m.path} end={m.path === '/'}>
                    {m.name}
                  </Nav.Link>
                ))}
            </Nav>
            <Stack direction="horizontal" gap={2} className="ms-lg-auto">
              {isAuthenticated ? (
                <>
                  <Navbar.Text className="me-1">
                    <Badge bg={isAdmin ? 'warning' : 'light'} text="dark" pill className="me-1">
                      {isAdmin ? '관리자' : '일반'}
                    </Badge>
                    <Badge bg="light" text="dark" pill>
                      {user?.name || user?.username}
                    </Badge>
                  </Navbar.Text>
                  <Button variant="outline-light" size="sm" onClick={onLogout}>
                    로그아웃
                  </Button>
                </>
              ) : (
                <Button as={NavLink} to="/login" variant="light" size="sm">
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
